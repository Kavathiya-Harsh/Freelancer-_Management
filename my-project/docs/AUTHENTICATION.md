# Authentication

Better Auth handles email/password accounts, sessions, verification, resets, organizations, invitations, and memberships. Passwords require 12–128 characters. Verification is required for sensitive workspace operations and invitations.

Required environment names: `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_BASE_URL`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID_PASSWORD_RESET`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, and `BETTER_AUTH_TRUSTED_ORIGINS`. Distributed deployments also require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Tests use `TEST_MONGODB_URI` and `TEST_MONGODB_DB`.

An email provider abstraction is implemented. `EMAIL_PROVIDER=test` is accepted only under `NODE_ENV=test`; production has no fallback and verification/recovery deliberately fail closed until a real transactional provider is configured. EmailJS delivery uses a timeout, rejects placeholder credentials, and sanitizes provider errors.

Password recovery uses Better Auth's `sendResetPassword` callback plus a hardened custom reset service. Reset links expire in 20 minutes, tokens are hashed at rest and single-use, password updates and session revocation are transactional, and the forgot-password response is intentionally identical for existing and unknown accounts. The UI mirrors the server password policy and never exposes developer-only reset links.

Recovery fails closed: if the EmailJS credentials are missing or placeholders, `/api/auth/forgot-password` returns 503 before any database lookup instead of falsely reporting that a link was sent. Configure all four `EMAILJS_*` values and enable "Allow server-side API requests" in the EmailJS dashboard. The reset template must map `{{to_email}}`, `{{to_name}}`, `{{reset_url}}`, `{{expires_minutes}}`, `{{product_name}}` and `{{support_email}}`.

Rate limiting uses Upstash Redis when configured and a per-process sliding window otherwise, so local development is protected. `ALLOW_EMAILJS_TEST_SEND` accepts both `true` and `false`.

## Custom JWT migration status

The JWT, Argon2id, and persistence-schema foundations are staged separately from the active Better Auth flow. Do not switch routes or migrate user/workspace records until a non-production MongoDB connection, authentication, and permissions have been verified. The configured URI now parses, but the prior Atlas TLS failure leaves live connectivity unverified; no registration, login, or database migration has been run against Atlas.
