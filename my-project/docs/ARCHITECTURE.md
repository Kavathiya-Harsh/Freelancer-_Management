# FreelanceFlow Architecture

## System Overview

FreelanceFlow is a multi-tenant client, project, task, and deliverable management application for freelancers and independent agencies.

```
                    ┌─────────────────────────────────┐
                    │      Next.js 16 App Router      │
                    │   React 19 + Tailwind CSS 4     │
                    └───────────────┬─────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │       API Route Handlers        │
                    │  Tenant Scoping & Zod Schemas   │
                    └───────────────┬─────────────────┘
                                    │
            ┌───────────────────────┼────────────────────────┐
            ▼                       ▼                        ▼
┌───────────────────────┐ ┌───────────────────┐ ┌────────────────────────┐
│ Better Auth + Mongo   │ │ Mongoose Services │ │ S3 Object Storage      │
│ Users, Orgs, Sessions │ │ Clients, Projects │ │ Presigned Uploads/     │
│                       │ │ Tasks, Deliverables││ Downloads (Max 20MB)   │
└───────────────────────┘ └───────────────────┘ └────────────────────────┘
```

## Storage Architecture

Direct browser-to-S3 uploads protect application servers from handling heavy binary streams.

1. Browser requests presigned upload URL with file metadata (`size <= 20MB`).
2. Server validates user permissions, generates an opaque storage path (`orgs/{orgId}/deliverables/{delivId}/{uuid}-{sanitizedName}`), and signs a `PutObjectCommand`.
3. Browser performs direct HTTP PUT to object storage.
4. Browser notifies server; server verifies object existence and size using `HeadObjectCommand` before appending metadata to MongoDB.
5. Downloads generate signed `GetObjectCommand` URLs with `attachment; filename="..."` disposition.

## Analytics

The dashboard uses server-side MongoDB aggregations in `src/server/analytics/service.ts`. Route handlers authenticate a verified tenant context before resolving timezone-aware date ranges. The client dashboard only renders the bounded API response; it never calculates financial totals from raw records.
