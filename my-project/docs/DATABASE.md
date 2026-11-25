# Database Architecture & Schemas

The native MongoDB client is cached once per runtime. Mongoose attaches through its public `Connection#setClient()` API. MongoDB Atlas must be transaction-capable.

Percent-encode reserved characters in the MongoDB URI username and password separately. For example, encode `@` as `%40`; do not encode the entire URI. The MongoDB client reports malformed credentials before opening a network connection.

## Collections

1. `workspaceLifecycles` and `workspacePreferences`: Each with a unique `organizationId` index. Better Auth owns identity, account, session, organization, member, and invitation collections.
2. `clients`: Tenant-owned records indexed by `{ organizationId: 1, status: 1 }`.
3. `projects`: Scoped by `{ organizationId: 1, projectCode: 1 }` (unique) and `{ organizationId: 1, status: 1 }`. Contains client references, budget minor units, and member assignments.
4. `tasks`: Scoped by `{ organizationId: 1, projectId: 1, status: 1, dueDate: 1 }` and `{ organizationId: 1, assigneeUserIds: 1, status: 1 }`.
5. `milestones`: Scoped by `{ organizationId: 1, projectId: 1, dueDate: 1 }`. Includes target financial amounts, sequence ordering, and computed overdue logic.
6. `deliverables` (Phase 06):
   - Scoped indexes: `{ organizationId: 1, projectId: 1, status: 1 }`, `{ organizationId: 1, status: 1, dueDate: 1 }`, `{ organizationId: 1, contributorUserIds: 1 }`, `{ organizationId: 1, reviewerUserIds: 1 }`, `{ organizationId: 1, archivedAt: 1, createdAt: -1 }`.
   - Stores deliverable metadata, external links, embedded file records (`fileId`, `originalFilename`, `storageKey`, `mimeType`, `fileSize`, `versionNumber`, `uploadedByUserId`, `uploadedAt`), and review events (`reviewId`, `action`, `actorUserId`, `comment`, `versionNumber`, `occurredAt`).
   - Large binary objects are strictly stored in S3/Cloudflare R2; only verified object metadata is kept in MongoDB.
7. `activities`: Append-only collection for audit logging. Indexed by `{ organizationId: 1, entityType: 1, entityId: 1, occurredAt: -1 }`. Supported entity types: `client`, `project`, `workspace`, `task`, `milestone`, `deliverable`.

## Analytics data semantics

Analytics use workspace-scoped `payments`, `invoices`, `projects`, `tasks`, `milestones`, `clients`, and `activities` collections. Revenue aggregates `payments` with `status: successful`; a reversal changes the original payment's status to `reversed`, so it is excluded. Invoice outstanding and overdue values are derived from non-draft, non-void invoices' stored `amountDueMinor`; all values remain in their original currency and minor units.
