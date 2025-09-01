# Digital Asset Management (DAM) — MongoDB Schema Guide

> A dependable, multi-tenant backbone for storing, cataloging, transforming, and sharing digital assets at scale—cleanly, safely, and fast.

---

## What you get (at a glance)

- **Tenancy & Guardrails:** Org-scoped everything, soft deletes, feature flags, quotas.
- **RBAC:** Roles with granular permissions; consistent server-side enforcement.
- **Assets Done Right:** Versions, renditions, metadata, analytics, share links.
- **Processing Pipeline:** Queue-backed jobs (Bull/BullMQ style), idempotent workers.
- **Cloud Storage Abstraction:** MinIO/S3/GCS behind a uniform interface.

---

## Table of Contents

1. [Domain Model](#domain-model)
2. [Collections](#collections)
3. [Indexes & Constraints](#indexes--constraints)
4. [Access Control](#access-control)
5. [Storage Strategy](#storage-strategy)
6. [Lifecycle: Upload → Process → Publish](#lifecycle-upload--process--publish)
7. [Validation & Integrity](#validation--integrity)
8. [Scale Patterns](#scale-patterns)
9. [Security & Compliance](#security--compliance)
10. [Observability](#observability)
11. [API Outline](#api-outline)
12. [Examples](#examples)
13. [Testing](#testing)
14. [Migration & Evolution](#migration--evolution)
15. [Operational Notes](#operational-notes)
16. [Index DDL (Mongoose Example)](#index-ddl-mongoose-example)

---

## Domain Model

### Enums

- **OrgStatus:** `active | suspended | archived`
- **UserStatus:** `invited | active | deactivated`
- **AccessLevel:** `private | organization | public`
- **AssetType:** `IMAGE | VIDEO | DOCUMENT | AUDIO | ARCHIVE | OTHER`
- **AssetStatus:** `uploading | pending | processing | completed | failed`
- **StorageProvider:** `minio | s3 | gcs`
- **JobStatus:** `queued | active | completed | failed | retrying`

---

## Collections

### Organization

- `name` _(String, req)_
- `status` _(OrgStatus, default: active)_
- `ownerId` _(User ref, req)_
- `settings.storageQuotaBytes` _(default: 500GB)_
- `settings.featureFlags.enablePublicSharing` _(default: true)_
- `settings.featureFlags.enableApiAccess` _(default: false)_
- `createdAt, updatedAt`

---

### Role

- `organizationId` _(Organization ref, req)_
- `name` _(String, req)_
- `description` _(String)_
- `permissions[]` _(e.g., `project:create`, `asset:edit:own`)_
- `isSystemRole` _(Boolean, default: false)_
- `isDefault` _(Boolean, default: false)_
- `createdAt, updatedAt`

---

### User

- `organizationId` _(Organization ref, req)_
- `roleId` _(Role ref, req)_
- `name` _(String, req)_
- `email` _(String, req, unique per org)_
- `passwordHash` _(String, req)_
- `status` _(UserStatus, default: invited)_
- `lastLoginAt` _(Date)_
- `createdAt, updatedAt`

---

### Project

- `organizationId` _(Organization ref, req)_
- `name` _(String, req)_
- `path` _(String, hierarchical, req, e.g. `/brand/2025/campaign-a`)_
- `ancestors[]` _({\_id, name})_
- `createdBy` _(User ref, req)_
- `deletedAt` _(Nullable Date)_
- `createdAt, updatedAt`

---

### AssetVersion _(embedded within Asset)_

- `version` _(Number, req)_
- `storageKey` _(String, req)_
- `fileSizeBytes` _(Number, req)_
- `createdBy` _(User ref)_
- `createdAt` _(Date)_

---

### Renditions _(embedded within Asset)_

- `thumbnail_small { storageKey, width, height }`
- `thumbnail_large { storageKey, width, height }`
- `preview_720p { storageKey, fileSizeBytes }`

---

### Asset

- Refs: `organizationId*`, `projectId*`, `uploadedBy*`
- Identity: `originalFilename*`, `mimeType*`, `assetType*`, `fileSizeBytes*`, `checksum*`
- Status: `status` _(AssetStatus, default: uploading)_, `processingError?`
- Storage: `storageProvider*`, `storageKey*`
- Versions: `latestVersion` _(default: 1)_, `versions[]` _(AssetVersion)_
- Descriptors: `tags[]`, `metadata { width, height, duration, codec, bitrate, pageCount }`, `customMetadata<Map<String,String>>`, `renditions`
- Access: `access` _(AccessLevel, default: private)_
- Analytics: `{ viewCount, downloadCount }`
- Lifecycle: `deletedAt?`, `createdAt, updatedAt`

---

### ProcessingJob

- `bullJobId` _(String, req)_
- `assetId` _(Asset ref, req)_
- `organizationId` _(Organization ref, req)_
- `jobName` _(String, req)_
- `status` _(JobStatus, req)_
- `workerId?`, `attempts` _(Number, default: 0)_
- `logs[]` _(JobLog)_, `error?` _(JobError)_
- `queuedAt`, `startedAt`, `completedAt` _(Dates)_, `durationMs` _(Number)_
- `createdAt, updatedAt`

**JobLog**

- `timestamp` _(Date)_, `message` _(String)_

**JobError**

- `name`, `message`, `stack` _(String)_

---

### ShareLink

- `organizationId` _(Organization ref, req)_
- `assetId` _(Asset ref, req)_
- `createdBy` _(User ref, req)_
- `token` _(String, unique)_
- `permissions[]` _(read, download)_
- `expiresAt` _(Date, req)_
- `maxDownloads?`, `downloadCount` _(default: 0)_
- `passwordHash?`, `revokedAt?`
- `createdAt, updatedAt`

---

## Indexes & Constraints

> Soft-deletes use `deletedAt`; partial indexes ignore deleted docs where uniqueness matters.

**Organization**

```js
[{ status: 1 }, { createdAt: -1 }];
```

**Role**

```js
[{ organizationId: 1, name: 1 }, { unique: true }][{ organizationId: 1, isDefault: 1 }];
```

**User**

```js
[{ organizationId: 1, email: 1 }, { unique: true }][{ organizationId: 1, roleId: 1 }][
    { organizationId: 1, status: 1 }
][{ lastLoginAt: -1 }];
```

**Project**

```js
[
    { organizationId: 1, path: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
][{ organizationId: 1, 'ancestors._id': 1 }][{ organizationId: 1, deletedAt: 1, updatedAt: -1 }];
```

**Asset**

```js
[{ organizationId: 1, projectId: 1, status: 1, updatedAt: -1 }][
    { organizationId: 1, assetType: 1, updatedAt: -1 }
][{ organizationId: 1, access: 1, updatedAt: -1 }][
    ({ organizationId: 1, checksum: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } })
][{ organizationId: 1, tags: 1 }][{ organizationId: 1, createdAt: -1 }];
// Optional Atlas Search for filename/tags/customMetadata
```

**ProcessingJob**

```js
[{ bullJobId: 1 }, { unique: true }][{ organizationId: 1, status: 1, queuedAt: -1 }][
    { assetId: 1, createdAt: -1 }
];
```

**ShareLink**

```js
[{ token: 1 }, { unique: true }][{ organizationId: 1, assetId: 1, expiresAt: 1 }][
    ({ expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { revokedAt: { $exists: false } } })
];
```

---

## Access Control

- Every query is **org-scoped**. Enforce on the server; never trust client-provided `organizationId`.
- RBAC derives from `User.roleId → Role.permissions[]`. Examples:
    - `project:create`, `project:delete`
    - `asset:upload`, `asset:edit:own`, `asset:edit:any`, `asset:delete`
    - `share:create`, `admin:settings`

- `access` on Asset (`private | organization | public`) governs visibility; public assets still use presigned URLs—never raw `storageKey`.

---

## Storage Strategy

- Providers: `minio | s3 | gcs` via a `StorageService` (`put`, `head`, `delete`, `presignGet`, `presignPut`).
- Keying (predictable, debuggable):

    ```
    {orgId}/{projectId}/{assetId}/original/v{n}/{filename}
    {orgId}/{projectId}/{assetId}/renditions/{profile}/{filename}
    ```

- Security: SSE (S3/GCS/KMS), no public buckets. Presign everything; don’t persist public URLs.
- Quotas: Track per org; maintain a materialized **OrgUsage** aggregate (bytes, counts).

---

## Lifecycle: Upload → Process → Publish

```mermaid
flowchart LR
A[Create Asset: status=uploading] --> B[Client PUT to presigned URL]
B --> C[Finalize: checksum+size => status=pending]
C --> D[Enqueue ProcessingJob: ingest]
D --> E[Workers: probe metadata, generate renditions]
E --> F{Success?}
F -- yes --> G[Asset: status=completed, renditions filled]
F -- no --> H[status=failed, processingError, retry/backoff]
G --> I[Serve via presigned GET (policy-checked)]
```

---

## Validation & Integrity

- Enforce enums at the schema layer; reject unknowns early.
- Unique constraints:
    - `(organizationId, email)` on `User`
    - `(organizationId, name)` on `Role`
    - `(organizationId, path)` on `Project` _(partial: exclude soft-deleted)_
    - `(organizationId, checksum)` on `Asset` _(partial)_

- Transactions for atomic moves/version bumps:
  e.g., increment `latestVersion` **and** push `versions[]` in one session.
- Soft delete: set `deletedAt`; garbage-collect storage out-of-band.

---

## Scale Patterns

- MongoDB 16MB doc limit → keep `versions[]` bounded (e.g., last **25**). For heavy versioning, move to an external `asset_versions` collection.
- Separate **AssetAnalytics** for high-traffic counters to avoid hot fields; or batch with a write-behind buffer.
- Sharding: hashed shard key on `organizationId` for even spread; keep selective compound secondary indexes.

---

## Security & Compliance

- Credentials: `passwordHash` with Argon2id or bcrypt (cost ≥ 12). Never store plaintext.
- Tokens: Org-bound JWT/session; rotate keys; short TTLs for presigned URLs.
- Privacy: Minimize PII; encrypt sensitive custom metadata if required.
- Audit: Job logs in `ProcessingJob.logs`; add dedicated `AuditEvent` if needed (who/what/when/IP).
- Rate limiting: Share endpoints, presign routes, download bursts.
- Content hygiene: MIME sniffing + magic bytes; block unsafe types as policy dictates.

---

## Observability

- Metrics: queue depth, job throughput, success/fail, time-to-first-preview, rendition latency, org storage.
- Logs: structured JSON; correlate by `assetId`, `bullJobId`.
- Alerts: quota >80%, processing failure spikes, share-link abuse, 4xx/5xx surges.

---

## API Outline

- `POST /projects` — create
- `GET /projects?path=/brand/2025/...` — resolve by path
- `POST /assets/uploads` — reserve `storageKey`, presign PUT
- `PUT  (storage)` — client uploads binary via presigned URL
- `POST /assets/finalize` — validate checksum/size, enqueue processing
- `GET /assets/:id` — fetch metadata (org-scoped)
- `PATCH /assets/:id` — tags, access, customMetadata
- `DELETE /assets/:id` — soft delete
- `POST /assets/:id/share-links` — create tokenized link
- `GET /share/:token` — gated read/download (password/limits/expiry respected)

Use **Idempotency-Key** on upload/finalize to dedupe client retries.

---

## Examples

**Asset (completed)**

```json
{
    "_id": "66c...a1",
    "organizationId": "64b...ef",
    "projectId": "64b...p1",
    "uploadedBy": "64b...u9",
    "originalFilename": "hero.jpg",
    "mimeType": "image/jpeg",
    "assetType": "IMAGE",
    "fileSizeBytes": 2817345,
    "checksum": "sha256:8a9c...",
    "status": "completed",
    "storageProvider": "s3",
    "storageKey": "org/64b.../proj/64b.../asset/66c.../original/v1/hero.jpg",
    "latestVersion": 1,
    "versions": [
        {
            "version": 1,
            "storageKey": "…/original/v1/hero.jpg",
            "fileSizeBytes": 2817345,
            "createdBy": "64b...u9",
            "createdAt": "2025-08-25T10:12:00Z"
        }
    ],
    "tags": ["homepage", "brand"],
    "metadata": { "width": 3840, "height": 2160, "codec": "jpeg" },
    "customMetadata": { "license": "royalty-free" },
    "renditions": {
        "thumbnail_small": { "storageKey": "…/renditions/thumb_s.jpg", "width": 160, "height": 90 },
        "thumbnail_large": {
            "storageKey": "…/renditions/thumb_l.jpg",
            "width": 640,
            "height": 360
        },
        "preview_720p": { "storageKey": "…/renditions/preview_720p.mp4", "fileSizeBytes": 932847 }
    },
    "access": "organization",
    "analytics": { "viewCount": 42, "downloadCount": 7 },
    "createdAt": "2025-08-25T10:11:10Z",
    "updatedAt": "2025-08-25T10:14:00Z"
}
```

**ProcessingJob (success)**

```json
{
    "_id": "77a...b2",
    "bullJobId": "queue:ingest:12345",
    "assetId": "66c...a1",
    "organizationId": "64b...ef",
    "jobName": "generate_renditions",
    "status": "completed",
    "attempts": 1,
    "logs": [
        { "timestamp": "2025-08-25T10:12:10Z", "message": "Probed media info" },
        { "timestamp": "2025-08-25T10:12:45Z", "message": "Created thumbnails" }
    ],
    "queuedAt": "2025-08-25T10:11:12Z",
    "startedAt": "2025-08-25T10:12:00Z",
    "completedAt": "2025-08-25T10:14:00Z",
    "durationMs": 120000,
    "createdAt": "2025-08-25T10:11:12Z",
    "updatedAt": "2025-08-25T10:14:00Z"
}
```

**ShareLink**

```json
{
    "_id": "5fa...aa",
    "organizationId": "64b...ef",
    "assetId": "66c...a1",
    "createdBy": "64b...u9",
    "token": "Z9Yxw3...",
    "permissions": ["read", "download"],
    "expiresAt": "2025-09-01T00:00:00Z",
    "maxDownloads": 50,
    "downloadCount": 3,
    "passwordHash": "argon2id$...",
    "createdAt": "2025-08-25T10:15:00Z",
    "updatedAt": "2025-08-25T10:16:00Z"
}
```

---

## Testing

- **Unit:** enum validation, path normalization, permission checks, checksum dedupe.
- **Integration:** upload → finalize → process → share; TTL expiry; revoked link; retries/idempotency.
- **Load:** bulk ingest (10k+ assets/project), rendition fan-out under queue backpressure.

---

## Migration & Evolution

- Track changes in a `migrations` collection; forward-only scripts.
- When versions grow large, split to `asset_versions` collection (ref by `assetId`, `version`).
- Add rendition profiles safely—null-tolerant reads keep old assets functional.

---

## Operational Notes

- **Backups:** Mongo snapshots + PITR; test restore monthly.
- **Object storage:** cross-region replication where supported; lifecycle rules for temp/abandoned uploads.
- **Retention:** policy by project/asset (e.g., 365 days) enforced via scheduled jobs.
- **Monetization levers:** quotas, feature flags (`enableApiAccess`, `enablePublicSharing`), API rate plans.

---

## Index DDL (Mongoose Example)

```ts
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
RoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

ProjectSchema.index(
    { organizationId: 1, path: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);
ProjectSchema.index({ organizationId: 1, 'ancestors._id': 1 });

AssetSchema.index({ organizationId: 1, projectId: 1, status: 1, updatedAt: -1 });
AssetSchema.index(
    { organizationId: 1, checksum: 1 },
    { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);
AssetSchema.index({ organizationId: 1, tags: 1 });
AssetSchema.index({ organizationId: 1, createdAt: -1 });

ProcessingJobSchema.index({ bullJobId: 1 }, { unique: true });
ProcessingJobSchema.index({ organizationId: 1, status: 1, queuedAt: -1 });

ShareLinkSchema.index({ token: 1 }, { unique: true });
ShareLinkSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { revokedAt: { $exists: false } } },
);
```

---

### Final Notes

- Keep **queries org-scoped**, **workers idempotent**, and **URLs short-lived**.
- Prefer **observability over guesswork**—measure time-to-first-preview and fix the slowest hop.
- When in doubt: **simplify paths, harden boundaries, and document invariants.**
