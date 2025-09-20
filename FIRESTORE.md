# Firestore & Storage Data Model for Icon Font Projects

This document describes the complete data model and storage structure for a service where users can create projects, upload SVG icons, and generate icon fonts.
Authentication is handled by **Firebase Authentication**, access control by **Firestore Security Rules**, and bulk icon storage by **Firebase Storage**.

---

## Firestore Structure

### Users
Collection for user profiles (optional, since Authentication already provides UID, email, etc.).

```
users/{uid}
    uid: string                 // Firebase Auth UID
    email: string               // user email
    name: string                // user display name
    avatar: string              // avatar URL
    createdAt: timestamp
    updatedAt: timestamp
```

### Projects
Each project belongs to an owner and can be shared with other members with roles.

```
projects/{projectId}
    name: string                // project name
    description: string         // optional description
    owner: string               // UID of the project owner
    members: {                  // map\<uid, {role, added}>
        {uid}: {
            role: "owner" | "admin" | "editor" | "viewer"
            added: timestamp    // when added
        }
    }
    visibility: "private" | "link"
    createdAt: timestamp
    updatedAt: timestamp
```

### Project Metadata
Document containing the current archive metadata for the project’s SVG set.

```
projects/{projectId}/data/icons\_meta
    rev: int                    // incremented on each save
    hash: string                // sha256 of icon set
    storage: string             // Storage path to archive: "bundles/{projectId}/{hash}/icons.zip"
    size: int                   // archive size in bytes
    count: int                  // number of icons
    etag: string                // optional: Storage object etag
    updatedBy: string           // UID of last updater
    updatedAt: timestamp
```

---

## Firebase Storage Structure

Archives are stored immutable, one per revision (revHash).
Each archive contains **all SVG icons of the project** (zipped).

```
bundles/{projectId}/{hash}/icons.zip    // main archive with all SVG icons
```

**Naming convention:**
- `hash` is deterministic (e.g. sha256 over sorted `{name, sha256}` pairs).
- Immutable: once uploaded, never overwritten.
- Cache headers: `Cache-Control: public, max-age=31536000, immutable`.

---

## Access Control

### Roles
- **owner**: full control, can manage members and delete project.
- **admin**: full control except deleting the project.
- **editor**: can add/remove/edit icons, save new revisions.
- **viewer**: read-only access to project metadata and archives.

### Firestore Security Rules (conceptual)
- `projects/{projectId}`:
  - Read if `request.auth.uid ∈ members`.
  - Write if `request.auth.uid` has role `owner|admin`.
- `projects/{projectId}/data/icons_meta`:
  - Read if `request.auth.uid ∈ members`.
  - Write if `request.auth.uid` has role `owner|admin|editor`.
- `users/{uid}`:
  - Read if `request.auth.uid == uid`.
  - Write if `request.auth.uid == uid`.

### Storage Security Rules (conceptual)
- `bundles/{projectId}/**`:
  - Read if `request.auth.uid ∈ projects/{projectId}.members`.
  - Write if `request.auth.uid` has role `owner|admin|editor`.
  - Archives are immutable → writes only allowed for new `revHash` paths.

---

## Typical Flows

### Save Project (client → backend)
1. User modifies icons in SPA memory.
2. Client calculates `hash` deterministically from `{name, sha256}`.
3. Client zips all icons into `icons.zip`.
4. Client uploads to Storage path: `bundles/{projectId}/{hash}/icons.zip` (resumable upload).
5. After successful upload, client updates Firestore `icons_meta` in one atomic write.

### Load Project (client)
1. Client reads `projects/{projectId}/data/icons_meta` (1 Firestore read).
2. Compares `hash` with local cache.
3. If different, downloads `icons.zip` (1 Storage GET).
4. Unzips locally, uses SVGs in editor or generates font.

### Invite Member
1. Owner or admin updates `projects/{projectId}.members` with new `{uid: {role, addedAt}}`.
2. Security rules immediately apply.

---

## Advantages of This Model
- **1 Firestore read** per project to get metadata.
- **1 Storage GET** to download all icons.
- Immutable archives allow aggressive CDN/browser caching.
- Roles and permissions are centralized in Firestore.
- Storage is only updated when user explicitly saves → predictable cost.
- Works with free tier and scales to thousands of icons (as long as archive < 1 GB).

---
