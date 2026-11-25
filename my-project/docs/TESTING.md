# Testing

## Unit Tests

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The unit suite covers analytics ranges, CSV safety, permissions, currency precision, payment validation, project/task/milestone behavior, workspace models, password recovery hardening, trusted proxy IP resolution, and recovery API behavior.

## MongoDB Integration Tests

Set both `TEST_MONGODB_URI` and `TEST_MONGODB_DB` explicitly to a transaction-capable disposable database. Integration tests must never fall back to `MONGODB_URI` or `MONGODB_DB`. The database name must indicate `test`, `dev`, `demo`, or `sandbox`; otherwise the password reset integration suite skips.

The test runner uses unique fixtures, reads test-only reset tokens from the in-process outbox, and cleans up only records created by the fixtures. Do not run destructive integration tests against production or an unidentified database.

The password reset integration suite covers generic responses for unknown emails, hash-only token storage, mismatched and weak passwords, invalid/expired/reused tokens, transactional password updates, and session/refresh-token revocation.

No live database integration test was run in the current environment because `TEST_MONGODB_URI`/`TEST_MONGODB_DB` were not configured.

## Email Delivery Diagnostic

`npm run email:test` is a dry run by default. A live EmailJS message is sent only when all credentials are non-placeholder, `EMAIL_TEST_RECIPIENT` is a dedicated mailbox, and `ALLOW_EMAILJS_TEST_SEND=true` is explicitly set. No live diagnostic email was sent in the current environment.

To request a real recovery email for a known account while the app server is running, use `npm run reset:request -- --email=<account email>`. The command prints only the HTTP status and generic response; it never prints token material.

For local testing without EmailJS credentials, set `ALLOW_DEV_RESET_LINK=true` (development only — it is a hard no-op in production) and run `npm run reset:dev-link`. With the app server running, this requests a real reset for `DEMO_ACCOUNT_EMAIL` (or `--email=...`) and prints the link captured in the gitignored `.dev-reset-links.jsonl`. No provider call is made in this mode.

## Demo Database Seeding

Demo seeding requires explicit `SEED_MONGODB_URI`, `SEED_ORGANIZATION_ID`, and `SEED_OWNER_USER_ID` values. It never falls back to `MONGODB_URI`.

The target database name must indicate `demo`, `test`, `development`, `dev`, or `sandbox`, or `SEED_ALLOW_DEMO_DATABASE=true` must be set explicitly. Production-like names and hosts are rejected.

Commands:

```bash
npm run db:seed:demo
npm run db:seed:status
npm run db:seed:reset -- --confirm-reset
```

Reset removes only IDs recorded in the seed manifest. It never deletes the organization, members, users, or unrelated records.
