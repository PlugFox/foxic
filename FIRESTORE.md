# Firestore & Storage Data Model for Icon Font Projects

This document describes the complete data model and storage structure for a service where users can create projects, upload SVG icons, and generate icon fonts.
Authentication is handled by **Firebase Authentication**, access control by **Firestore Security Rules**, and bulk icon storage by **Firebase Storage**.

**Design Philosophy**: Minimize Firestore reads/writes through denormalization, immutable storage patterns, and aggressive client-side caching.

---

## Firestore Structure

### Users
Collection for user profiles and preferences.

```
users/{uid}
    email: string               // user email
    name: string                // user display name
    avatar: string              // avatar URL
    preferences: {              // User preferences
        theme: string           // UI theme preference
        exportFormat: "svg" | "font" // Default export preference
    }
    createdAt: timestamp
    updatedAt: timestamp
    lastActiveAt: timestamp     // For inactive user cleanup
```

### User Projects
**Cost Optimization**: Denormalized user project access stored within user document to avoid expensive `array-contains` queries.

```
users/{uid}/data/projects
    projects: {                 // Map of accessible projects
        {projectId}: {
            role: "owner" | "admin" | "editor" | "viewer"
            name: string        // Denormalized project name for quick display
            lastAccessed: timestamp
            notifications: int  // Count of unread changes
            pinned: boolean     // User can pin favorite projects
        }
    }
    updatedAt: timestamp
```

### Projects
Each project belongs to an owner and can be shared with other members with roles.

```
projects/{projectId}
    name: string                // project name
    description: string         // optional description
    owner: string               // UID of the project owner
    members: {                  // Denormalized member info to avoid user lookups
        {uid}: {
            role: "owner" | "admin" | "editor" | "viewer"
            email: string       // Denormalized for member management UI
            name: string        // Denormalized for display
            avatar?: string     // Denormalized for avatars
            added: timestamp    // when added to project
            lastActive?: timestamp  // last activity in this project
            invitedBy: string   // UID of who invited this member
        }
    }
    visibility: "private" | "link" | "public"  // public for showcase
    tags: string[]              // project categorization
    createdAt: timestamp
    updatedAt: timestamp
```

### Project Metadata
Document containing the current archive metadata for the project’s SVG set.

```
projects/{projectId}/data/icons_meta
    rev: int                    // incremented on each save
    hash: string                // sha256 of sorted icon set
    storage: string             // Storage path: "bundles/{projectId}/{hash}/icons.zip"
    size: int                   // archive size in bytes
    count: int                  // number of icons
    updatedBy: string           // UID of last updater
    updatedAt: timestamp
```

---

## Firebase Storage Structure

**Immutable Storage Pattern**: Archives are never modified, only created. This enables aggressive CDN caching and prevents storage conflicts.

```
bundles/{projectId}/{hash}/icons.zip    // Main archive with all SVG icons
```

**Storage Optimization Features:**
- `hash` is deterministic SHA256 over sorted `{iconName, iconSHA256}` pairs
- Immutable: once uploaded, never overwritten (enables infinite caching)
- Automatic deduplication: identical icon sets share the same hash
- CDN-friendly headers: `Cache-Control: public, max-age=31536000, immutable`
- Compressed archives reduce bandwidth and storage costs
- **Client-side font generation**: Fonts are generated in browser from SVG data

---

## Access Control

### Roles
- **owner**: full control, can manage members and delete project.
- **admin**: full control except deleting the project.
- **editor**: can add/remove/edit icons, save new revisions.
- **viewer**: read-only access to project metadata and archives.

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions for role-based access
    function isProjectMember(projectId) {
      return request.auth != null &&
             request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members;
    }

    function getProjectRole(projectId) {
      return get(/databases/$(database)/documents/projects/$(projectId)).data.members[request.auth.uid].role;
    }

    function canEdit(projectId) {
      let role = getProjectRole(projectId);
      return role in ['owner', 'admin', 'editor'];
    }

    function canAdmin(projectId) {
      let role = getProjectRole(projectId);
      return role in ['owner', 'admin'];
    }

    // Users: own profile and data only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User projects subcollection: own project list only
      match /data/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Projects: member access with role-based permissions
    match /projects/{projectId} {
      allow read: if isProjectMember(projectId) ||
                     resource.data.visibility == 'public';
      allow write: if canAdmin(projectId);

      // Project metadata: editors can modify icon data
      match /data/icons_meta {
        allow read: if isProjectMember(projectId) ||
                       get(/databases/$(database)/documents/projects/$(projectId)).data.visibility == 'public';
        allow write: if canEdit(projectId);
      }
    }
  }
}
```

### Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isProjectMember(projectId) {
      return request.auth != null &&
             request.auth.uid in firestore.get(/databases/(default)/documents/projects/$(projectId)).data.members;
    }

    function canEditProject(projectId) {
      let doc = firestore.get(/databases/(default)/documents/projects/$(projectId));
      let role = doc.data.members[request.auth.uid].role;
      return role in ['owner', 'admin', 'editor'];
    }

    function isPublicProject(projectId) {
      let doc = firestore.get(/databases/(default)/documents/projects/$(projectId));
      return doc.data.visibility == 'public';
    }

    // Icon bundles: immutable SVG archives only
    match /bundles/{projectId}/{hash}/icons.zip {
      allow read: if isProjectMember(projectId) || isPublicProject(projectId);
      allow write: if canEditProject(projectId) &&
                     resource == null; // Only creation allowed (immutable)
    }
  }
}
```

---

## Optimized User Flows

### Save Project (Client → Backend)
**Cost**: 1 Firestore write + 1 Storage upload per unique icon set
1. User modifies icons in client memory
2. Client calculates deterministic `hash` from sorted `{iconName, iconSHA256}` pairs
3. Check if hash already exists in Storage (avoid duplicate uploads)
4. If new hash:
   - Zip all SVG icons into `icons.zip`
   - Upload to `bundles/{projectId}/{hash}/icons.zip` (resumable upload)
5. Update Firestore `icons_meta` document atomically
6. Update `users/{uid}/data/projects` with denormalized project info (1 additional write)

### Load Project (Client)
**Cost**: 1 Firestore read + conditional Storage download
1. Read `projects/{projectId}/data/icons_meta` (1 Firestore read - all project data)
2. Check client cache using `hash`
3. If cache miss or expired:
   - Download `bundles/{projectId}/{hash}/icons.zip`
4. Unzip and cache SVGs locally
5. **Client-side font generation**: Generate fonts in browser when user exports

### Load User Dashboard
**Cost**: 1 Firestore read (no expensive queries)
1. Read `users/{uid}/data/projects` document (1 Firestore read)
2. Display all accessible projects with denormalized names
3. No need for `array-contains` queries or multiple project lookups

### Invite Member (Cost-Optimized)
**Cost**: 2 Firestore writes
1. Owner/admin updates `projects/{projectId}.members` with denormalized member info
2. System updates `users/{invitedUserUid}/data/projects` to add project access
3. Security rules automatically apply to new member

### Export Fonts (Client-Side)
**Cost**: 0 server resources - pure client-side operation
1. User selects font export from loaded SVG icons
2. Client generates font files in browser using libraries like `fontkit` or `opentype.js`
3. User downloads generated font files (woff2, woff, ttf) directly
4. Optional: Generate CSS with icon classes and Unicode mappings
5. **Benefits**: Instant generation, no server costs, customizable font settings

---

## Cost Optimization Benefits

### Firestore Read/Write Minimization
- **Dashboard load**: 1 read for entire project list (via `users/{uid}/data/projects`)
- **Project load**: 1 read for complete project metadata (via `icons_meta`)
- **Member management**: No separate user lookups (denormalized in project members)
- **No expensive queries**: Avoided `array-contains` and complex filtering
- **Atomic operations**: Single document updates prevent partial state issues

### Storage Efficiency
- **Content deduplication**: Identical icon sets share same hash/storage
- **Immutable pattern**: Enables infinite CDN caching (`max-age=31536000`)
- **Conditional downloads**: Client cache prevents redundant transfers
- **Compressed archives**: Reduced bandwidth and storage costs
- **SVG-only storage**: No server-generated fonts, previews, or other derived assets

### Scalability Features
- **Free tier friendly**: Optimized for Firestore's free tier limits
- **Large icon sets**: Supports thousands of icons per project (up to 1GB archive limit)
- **Concurrent access**: Immutable storage prevents write conflicts
- **Global CDN**: Storage assets cached worldwide for fast access
- **Offline-first**: Client can work with cached data when offline

### Developer Experience
- **Single source of truth**: All project data in one Firestore document
- **Type safety**: Clear TypeScript interfaces for all data structures
- **Predictable costs**: Storage writes only on explicit user saves
- **Role-based security**: Fine-grained permissions with minimal complexity
- **Client-side generation**: Zero server costs for font generation

## Client-Side Font Generation

### Advantages of Browser-Based Font Generation
- **Zero server costs**: No Cloud Functions or font storage required
- **Instant generation**: No waiting for background processing
- **Customizable**: Users can adjust font settings in real-time
- **No storage limits**: Generate unlimited font variations
- **Privacy-friendly**: Font generation happens locally

### Client-Side Caching Strategy
```typescript
interface CacheStrategy {
  // Cache keys and TTL
  PROJECT_LIST: `foxic_projects_${uid}` // 24 hours
  PROJECT_DATA: `foxic_project_${projectId}_${hash}` // 7 days
  SVG_CACHE: `foxic_svgs_${projectId}_${hash}` // 30 days

  // Simple cache invalidation
  backgroundRefresh: boolean // Refresh cache in background
  offlineSupport: boolean    // Work offline with cached data
}
```

### Font Generation Libraries
```typescript
// Recommended client-side font generation libraries
interface FontGeneration {
  libraries: [
    'fontkit',           // Font parsing and generation
    'opentype.js',       // OpenType font creation
    'svg2ttf',           // SVG to TTF conversion
    'ttf2woff2'          // TTF to WOFF2 conversion
  ]

  workflow: [
    'Parse SVG icons',
    'Generate TTF font',
    'Convert to WOFF/WOFF2',
    'Generate CSS with mappings',
    'Download as ZIP'
  ]
}
```

This simplified design **eliminates server-side font generation costs** while providing users with **instant, customizable font generation** directly in their browser.
