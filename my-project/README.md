# FreelanceFlow

FreelanceFlow is a modern multi-tenant operating system for independent freelancers and boutique agencies, built with Next.js 16 App Router, React 19, Tailwind CSS 4, MongoDB Atlas, Mongoose, Better Auth, and AWS S3-compatible cloud storage.

## Core Modules & Status

- **Phase 01 & 02: Foundation, Authentication & Workspaces** (PASSED)
  - Better Auth multi-tenancy, email & password authentication, organization roles (`owner`, `admin`, `member`), lifecycle provisioning, and tenant context isolation.
- **Phase 03: Client Management** (PASSED)
  - Client directory, statuses, contact management, soft-archival, and workspace scoping.
- **Phase 04: Project Management** (PASSED)
  - Project directory, unique project code generation, minor-unit money budgets, team assignment, and audit trails.
- **Phase 05: Tasks, Kanban Board & Milestone Tracking** (PASSED)
  - 5-column drag-and-drop Kanban board (`todo`, `in_progress`, `in_review`, `blocked`, `done`), list view switch, search and filtering, milestone checkpoints, and overdue tracking.
- **Phase 06: Deliverables & File Storage** (PASSED)
  - Complete work package lifecycle (`draft` -> `in_progress` -> `submitted` -> `revision_required` / `approved`).
  - S3 / Cloudflare R2 presigned direct upload & download URLs with 20MB limits.
  - Review and revision comment history with automatic version incrementing (`v1`, `v2`, ...).
  - Prevention of self-approvals by contributors.
  - Integration with Project Details view and project deliverables tab.
- **Phase 08: Dashboard Analytics & Business Reports**
  - Workspace-scoped dashboard at `/w/[workspaceSlug]/dashboard` and reports at `/w/[workspaceSlug]/reports`.
  - Revenue is the sum of `successful` payment records by `paymentDate`; pending, failed, and reversed records are excluded. Amounts remain separated by currency.
  - Financial totals, invoices, payments, financial activity, and CSV exports are restricted to workspace owners and admins. Members receive only operational project/task/activity data.
  - Date filters run server-side using the saved workspace timezone (UTC fallback). Previous comparisons cover an equivalent preceding interval.
  - CSV exports are bounded and quote/protect spreadsheet-formula-like text. Revenue exports contain payment period, currency, and minor-unit amount; invoice exports contain only invoice summary fields.

- **Premium frontend application shell** (PASSED)
  - Responsive authenticated sidebar and top bar, workspace switching, profile sign-out, mobile navigation, and keyboard search shortcut.
  - Polished sign-in, sign-up, recovery, verification, onboarding, and workspace-selection flows use Better Auth and existing workspace APIs.
  - Existing workspace invoices and settings routes now have usable frontend states backed by the actual invoice and workspace APIs.

## Setup

1. Copy `.env.example` to `.env.local` and provide values for required variables.
2. Ensure MongoDB Atlas connection is set (`MONGODB_URI`).
3. (Optional) Provide S3 / Cloudflare R2 credentials for live cloud object storage (`STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`).
4. Run `npm install`.
5. Run `npm run dev` to launch on `http://localhost:3000`.

## Quality & Verification

## Demo Database Seeding

For a designated demo/test/development database only:

```bash
npm run db:seed:demo
npm run db:seed:status
npm run db:seed:reset -- --confirm-reset
```

The seed system requires `SEED_MONGODB_URI`, `SEED_ORGANIZATION_ID`, and `SEED_OWNER_USER_ID`. It never uses `MONGODB_URI` as a fallback. See [DEMO_DATA.md](./docs/DEMO_DATA.md).

For a ready-to-sign-in local demo account, also set `DEMO_ACCOUNT_EMAIL` and a 12-character-or-longer `DEMO_ACCOUNT_PASSWORD`, then run `npm run db:seed:demo`. The sign-in page automatically shows a “Use demo account” button when both variables are configured.

Run all test suites and production checks:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```
