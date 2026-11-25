# Demo Data

FreelanceFlow includes a repeatable, manifest-based MongoDB seed system.

## Required environment

Set these variables only in a designated demo/test/development shell or environment:

- `SEED_MONGODB_URI`
- `SEED_ORGANIZATION_ID`
- `SEED_OWNER_USER_ID`
- `SEED_ALLOW_DEMO_DATABASE=true` when the database name does not identify itself as demo/test/dev/sandbox
- Optional: `DEMO_ACCOUNT_EMAIL`
- Optional: `DEMO_ACCOUNT_PASSWORD` (minimum 12 characters)

The script never falls back to `MONGODB_URI`. It rejects production-like database names and hosts, missing organizations, inactive lifecycle state, missing owner users, and owner users who are not workspace members.

## Commands

```bash
npm run db:seed:demo
npm run db:seed:status
npm run db:seed:reset -- --confirm-reset
```

## Dataset

The seed batch creates or reuses:

- 8 fictional clients
- 12 projects
- 18 milestones
- 40 tasks
- 20 deliverables
- 15 invoices
- Successful, pending and failed payment records
- Tenant-linked activity records

Demo addresses use example.test domains and no real storage files are created.

## Safety

The `freelanceflowSeedManifests` collection tracks exact seeded record IDs. Normal seed runs do not overwrite existing business records. Reset deletes only manifest-owned IDs and never removes authentication or organization records.
