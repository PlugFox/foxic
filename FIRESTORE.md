# Firestore Data Model for Icon Font Projects

This document describes the data model for a service where users can create projects, upload SVG icons, and generate icon fonts.

Authentication is handled by **Firebase Authentication**, access control by **Firestore Security Rules**, and icon storage by **compressed blobs in Firestore documents**.

**Design Philosophy**: Minimize Firestore reads/writes through denormalization, compressed blob storage in dedicated documents, and aggressive client-side caching. SVG icons are stored as fflate-compressed archives with a 1MB size limit per document.

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
    // Removed updatedAt and lastActiveAt to avoid frequent writes
```

### User Projects
**Cost Optimization**: Denormalized user project access stored within user document to avoid expensive `array-contains` queries.

```
users/{uid}/data/projects
    projects: {                 // Map of accessible projects
        {projectId}: {
            role: "owner" | "admin" | "editor" | "viewer"
            name: string        // Denormalized project name for quick display
            notifications: int  // Count of unread changes
            pinned: boolean     // User can pin favorite projects
            // Removed lastAccessed to avoid frequent writes
            // Use client-side tracking or batch updates instead
        }
    }
```

### Projects
Each project belongs to an owner and can be shared with other members with roles.

```
projects/{projectId}
    name: string                // project name
    description: string         // optional description
    owner: string               // UID of the project owner
    members: {                  // Minimal member info to avoid frequent updates
        {uid}: {
            role: "owner" | "admin" | "editor" | "viewer"
            added: timestamp    // when added to project
            invitedBy: string   // UID of who invited this member
            // Removed email, name, avatar, lastActive to avoid frequent writes
            // UI can fetch user details from users/{uid} when needed
        }
    }
    visibility: "private" | "link" | "public"  // public for showcase
    tags: string[]              // project categorization
    createdAt: timestamp
```

### Project Icons Archive
Document containing the compressed SVG icons archive with embedded manifest. All metadata is contained within the manifest.json inside the archive.

```
projects/{projectId}/data/icons
    archive: bytes              // fflate-compressed archive containing:
                                //   - manifest.json (all metadata: rev, hash, count, icons info)
                                //   - SVG files
    updatedBy: string           // UID of last updater
    updatedAt: timestamp
```

---

## Archive Storage Structure

**Compressed Blob Pattern**: SVG icons are stored as fflate-compressed blobs in dedicated Firestore documents with 1MB size limits per document.

**Archive Structure (within compressed blob):**
```
icons.zip (fflate compressed)
├── manifest.json              // All metadata: rev, hash, count, icon mappings, etc.
├── icons/
│   ├── icon1.svg
│   ├── icon2.svg
│   └── ...
```

**Manifest.json Structure:**
```json
{
  "rev": 1,
  "hash": "sha256_hash_of_sorted_icons",
  "count": 10,
  "totalSize": 45000,
  "compression": 0.75,
  "icons": {
    "icon1": {
      "size": 1200,
      "hash": "individual_svg_hash",
      "tags": ["ui", "arrow"]
    },
    "icon2": { ... }
  },
  "createdAt": "2025-09-21T10:00:00Z"
}
```

**Storage Optimization Features:**
- **1MB document limit**: Each archive document respects Firestore's document size limit
- **fflate compression**: High compression ratio for SVG files
- **Embedded manifest**: All metadata included in archive for single-read access
- **Client-side font generation**: Fonts are generated in browser from decompressed SVG data

---

## Access Control

### Roles
- **owner**: full control, can manage members and delete project.
- **admin**: full control except deleting the project.
- **editor**: can add/remove/edit icons, save new revisions.
- **viewer**: read-only access to project metadata and archives.

### Firestore Security Rules (Read-Optimized, Write-Controlled)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: own profile and data only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /data/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Projects: Read-optimized, write-controlled
    match /projects/{projectId} {
      // Read: Any authenticated user can read any project (zero additional reads)
      allow read: if request.auth != null;

      // Write: Only owner, admin, editor can modify project
      allow write: if request.auth != null &&
                      request.auth.uid in resource.data.members &&
                      resource.data.members[request.auth.uid].role in ['owner', 'admin', 'editor'];

      // Project icons: Read-optimized, write-controlled
      match /data/icons {
        allow read: if request.auth != null;

        // Write: Only owner, admin, editor can modify icons
        allow write: if request.auth != null &&
                        request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members &&
                        get(/databases/$(database)/documents/projects/$(projectId)).data.members[request.auth.uid].role in ['owner', 'admin', 'editor'];
      }
    }
  }
}
```

### **🚨 Security vs Cost Trade-offs**

**Optimized Read/Write Balance:**
1. **Zero Read Validation**: No document reads for read operations
2. **Write Validation Only**: Role checks only when modifying data
3. **Selective Security**: Read access open, write access controlled

**Security Model:**
- **✅ Open Read Access**: Any authenticated user can read any project
- **🔒 Controlled Write Access**: Only owner/admin/editor can modify projects
- **Single Read for Writes**: One document read to validate write permissions
- **Trust Read Operations**: No data isolation for read access

**Cost Benefits:**
- **Read Operations**: 0 additional reads for access validation
- **Write Operations**: 1 read per write for role validation
- **Overall Savings**: ~90% reduction in security reads (only on writes)
- **Performance**: Maximum read speed, validated writes

**Security Trade-offs:**
- **Open Data Access**: Any authenticated user can discover project content
- **No Privacy for Reads**: Projects are readable by all authenticated users
- **Write Protection Maintained**: Data integrity protected by role validation

**Application Impact:**
- **UI Considerations**: All projects potentially discoverable
- **Privacy Warning**: Inform users that projects are readable by all users
- **Write Safety**: Modifications properly protected by Firestore rules

### Archive Size Validation
**Frontend Validation**: The client enforces the 1MB size limit before attempting to save to Firestore.

```typescript
// Frontend size validation before Firestore write
interface ArchiveValidation {
  MAX_ARCHIVE_SIZE: 1_000_000; // 1MB in bytes (Firestore document limit)

  validateArchive(compressedData: Uint8Array): boolean {
    if (compressedData.length > this.MAX_ARCHIVE_SIZE) {
      throw new Error(`Archive size ${compressedData.length} exceeds Firestore document limit of ${this.MAX_ARCHIVE_SIZE} bytes`);
    }
    return true;
  }
}
```

**Note**: All icon data and metadata are stored directly in Firestore documents as compressed blobs. No external storage dependencies.

### Additional Cost Optimizations

**Batched Operations**: Group multiple operations to reduce write costs:
```typescript
// Instead of individual writes for user activity tracking
// Use client-side batching with periodic sync
interface BatchedUpdates {
  lastAccessed: Record<string, timestamp>; // Batch multiple project accesses
  syncInterval: 5 * 60 * 1000; // Sync every 5 minutes
  maxBatchSize: 10; // Max operations per batch
}
```

**On-Demand Data Loading**: Fetch user details only when needed:
```typescript
// Instead of denormalizing user data in project members
// Fetch user details on-demand for member management UI
interface LazyUserDetails {
  cachedUsers: Map<string, UserProfile>; // Client-side cache
  fetchOnlyWhenNeeded: boolean; // Don't preload all member details
}
```

---

## Optimized User Flows

### Save Project (Client → Firestore)
**Cost**: 1 Firestore write per icon set update (optimized)
1. User modifies icons in client memory
2. Client validates total archive size will not exceed 1MB limit
3. Client creates manifest.json with all metadata (rev, hash, count, icon info)
4. Client compresses archive (SVGs + manifest) using fflate
5. Update Firestore `projects/{projectId}/data/icons` document atomically with compressed blob
6. **Optimization**: Skip updating `users/{uid}/data/projects` unless project name changed
   - Icon updates don't affect user's project list
   - Reduces writes from 2 to 1 per save

### Load Project (Client)
**Cost**: 1 Firestore read (archive document contains all data)
1. Read `projects/{projectId}/data/icons` (1 Firestore read - compressed archive with all data)
2. Decompress blob using fflate to extract archive contents
3. Parse manifest.json from archive to get metadata (rev, hash, count, icon info)
4. Check client cache using `hash` from manifest
5. If cache miss or expired:
   - Extract and parse SVG files from archive
   - Cache decompressed data locally (icons + manifest)
6. **Client-side font generation**: Generate fonts in browser when user exports

### Load User Dashboard
**Cost**: 1 Firestore read (no expensive queries)
1. Read `users/{uid}/data/projects` document (1 Firestore read)
2. Display all accessible projects with denormalized names
3. No need for `array-contains` queries or multiple project lookups

### Invite Member (Ultra Cost-Optimized)
**Cost**: 2 Firestore writes (minimal data)
1. Owner/admin updates `projects/{projectId}.members` with minimal member info (role, added, invitedBy only)
2. System updates `users/{invitedUserUid}/data/projects` to add project access
3. User details (email, name, avatar) fetched from `users/{uid}` on-demand in UI
4. Security rules automatically apply to new member

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
- **Project load**: 1 read for complete project data including all metadata and icons
- **Member management**: Minimal project member data + on-demand user lookups only when needed
- **No expensive queries**: Avoided `array-contains` and complex filtering
- **Dedicated archive document**: All icon data and metadata in single archive document
- **Eliminated frequent updates**: Removed lastAccessed, lastActive, updatedAt from hot paths

### Blob Storage Efficiency
- **1MB document limit**: Each archive document respects Firestore's document size limit
- **fflate compression**: High compression ratios for SVG files (typically 70-90% reduction)
- **Embedded metadata**: All project metadata in manifest.json within archive
- **Single read access**: Complete project icon data in one Firestore read
- **Client-side decompression**: Fast browser-native decompression with fflate
- **Size validation**: Frontend prevents oversized archives before write attempts

### Scalability Features
- **Free tier friendly**: Optimized for Firestore's free tier limits (no external storage costs)
- **Medium icon sets**: Supports projects with compressed archives up to 1MB per document
- **Predictable performance**: Single document reads with consistent latency
- **No external dependencies**: Pure Firestore solution
- **Offline-first**: Client can work with cached data when offline
- **Compression benefits**: fflate typically allows 5-10x more icons within 1MB limit

### Developer Experience
- **Dedicated archive document**: Icon data and metadata in single archive document per project
- **Type safety**: Clear TypeScript interfaces for all data structures
- **Predictable costs**: Only Firestore document writes, no external storage costs
- **Role-based security**: Fine-grained permissions with minimal complexity
- **Client-side generation**: Zero server costs for font generation
- **Simple architecture**: Pure Firestore solution without external dependencies

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
  PROJECT_ARCHIVE: `foxic_archive_${projectId}_${hash}` // 7 days (full compressed blob)
  PROJECT_ICONS: `foxic_icons_${projectId}_${hash}` // 7 days (decompressed SVGs)
  PROJECT_MANIFEST: `foxic_manifest_${projectId}_${hash}` // 7 days (parsed metadata)

  // Compression workflow
  compressionLib: 'fflate' // High-performance compression library
  maxArchiveSize: 1_000_000 // 1MB Firestore document limit enforced by frontend

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

This simplified design **eliminates both server-side font generation costs and external storage dependencies** while providing users with **instant, customizable font generation** directly in their browser. The single-document architecture with embedded manifest ensures optimal performance with 1MB compressed blob limits.
