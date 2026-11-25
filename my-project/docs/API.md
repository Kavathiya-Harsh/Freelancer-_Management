# FreelanceFlow API Specification

## Password Recovery API

`POST /api/auth/forgot-password` accepts `{ email }` with a trusted `Origin` and JSON `Content-Type`. It always returns `202` with the same generic message for existing and unknown emails, includes a correlation ID, and never returns reset tokens or links. Email/IP rate-limit keys are hashed.

`POST /api/auth/reset-password` accepts `{ token, password, confirmPassword }` with a trusted `Origin` and JSON `Content-Type`. Tokens are limited to 512 characters, rate-limit keys are hashed, and password policy is enforced server-side. Successful resets return `200`, consume the token atomically, rotate the password, and revoke active sessions/refresh tokens. Invalid, expired, reused, or malformed input returns a generic error code without token details.

## 1. Client API

`/api/v1/workspaces/[workspaceSlug]/clients` supports authenticated Owner/Admin list and create operations. Detail, update, archive, and restore routes are tenant-scoped by verified organization membership. `search`, `status`, `sort`, and `limit` are Zod-validated; maximum limit is 50. Members are denied until project-client association exists.

## 2. Project API

- `GET /api/v1/workspaces/[workspaceSlug]/projects` - List workspace projects with filters (search, status, priority, client, view=active|archived, pagination).
- `POST /api/v1/workspaces/[workspaceSlug]/projects` - Create a project with code generation, minor-unit money validation, and workspace membership scoping.
- `GET /api/v1/workspaces/[workspaceSlug]/projects/[projectId]` - Project detail with populated client, team members, and audit activities.
- `PATCH /api/v1/workspaces/[workspaceSlug]/projects/[projectId]` - Update project metadata, status, priority, progress.
- `POST /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/archive` - Soft-archive project.
- `POST /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/restore` - Restore archived project.

## 3. Tasks & Kanban Board API

- `GET /api/v1/workspaces/[workspaceSlug]/tasks` - List tasks with status, priority, project, and assignee filters.
- `POST /api/v1/workspaces/[workspaceSlug]/tasks` - Create a task belonging to a workspace project.
- `GET /api/v1/workspaces/[workspaceSlug]/tasks/[taskId]` - Retrieve task detail.
- `PATCH /api/v1/workspaces/[workspaceSlug]/tasks/[taskId]` - Update task properties.
- `POST /api/v1/workspaces/[workspaceSlug]/tasks/[taskId]/status` - Update task status (`todo`, `in_progress`, `in_review`, `blocked`, `done`).
- `POST /api/v1/workspaces/[workspaceSlug]/tasks/[taskId]/archive` - Archive a task.

## 4. Milestone API

- `GET /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones` - List milestones for a project with overdue indicators.
- `POST /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones` - Create milestone.
- `GET /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones/[milestoneId]` - Milestone detail.
- `PATCH /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones/[milestoneId]` - Edit milestone.
- `POST /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones/[milestoneId]/complete` - Mark complete.
- `POST /api/v1/workspaces/[workspaceSlug]/projects/[projectId]/milestones/[milestoneId]/reopen` - Reopen milestone.

## 5. Deliverables & File Storage API (Phase 06)

- `GET /api/v1/workspaces/[workspaceSlug]/deliverables` - List deliverables with status summary stats, project filter, search, active/archived views, and pagination.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables` - Create deliverable with project link, optional milestone, assigned contributors, reviewers, and external links.
- `GET /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]` - Full detail with populated project, milestone, assigned members, file attachments, review trail, and audit activity.
- `PATCH /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]` - Update deliverable title, scope, deadlines, members, and links.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/submit` - Submit draft or revised work for reviewer sign-off.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/approve` - Authorized reviewer or Owner/Admin sign-off (contributors cannot self-approve).
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/request-revision` - Reviewer requests changes with comments; automatically bumps version number.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/resubmit` - Resubmit revised work with uploader notes.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/upload-url` - Server-authorized S3/R2 presigned PUT upload URL with size (<= 20MB) and MIME checks.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/complete-upload` - Verifies stored object in cloud storage and appends file version metadata to MongoDB.
- `GET /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/files/[fileId]/download-url` - Generates short-lived presigned GET download URL with attachment content disposition.
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/archive` - Archive deliverable (Owner/Admin only).
- `POST /api/v1/workspaces/[workspaceSlug]/deliverables/[deliverableId]/restore` - Restore deliverable to active.

## Analytics reports

`GET /api/v1/workspaces/:workspaceSlug/reports/overview` returns bounded, workspace-scoped dashboard metrics. It accepts `preset` (`7d`, `30d`, `this-month`, `previous-month`, `90d`, `this-year`) or `preset=custom&start=YYYY-MM-DD&end=YYYY-MM-DD`; custom end is exclusive and ranges are limited to 366 days.

`GET /api/v1/workspaces/:workspaceSlug/reports` returns the report payload. Add `format=csv&report=revenue` or `format=csv&report=invoices` to download a filtered CSV. Financial report data and exports require an `owner` or `admin` membership.

Revenue is successful payments only, grouped by payment timestamp in the workspace timezone. No currency conversion is performed.
Pending and failed payments are excluded. Reversed payments retain the `reversed` status and are also excluded. Invoice rows and outstanding balances are returned only for owners and admins. CSV text cells are quoted and formula-prefixed text is protected from spreadsheet execution.
