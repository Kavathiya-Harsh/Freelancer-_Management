# Deployment & Storage Configuration

## Environment Variables

### Database & Auth

- `MONGODB_URI`: MongoDB connection string. Optional only in automated tests.
- `MONGODB_DB`: Database name (default `freelanceflow`).
- `TEST_MONGODB_URI`: Explicit transaction-capable disposable MongoDB URI used only by integration tests. It never falls back to `MONGODB_URI`.
- `TEST_MONGODB_DB`: Disposable database name used by integration tests and test-mode Mongo connections. Never point this at production data.
- `BETTER_AUTH_SECRET`: Secret key (min 32 characters) for Better Auth JWT/session encryption.
- `BETTER_AUTH_URL`: Canonical root URL (e.g. `https://app.freelanceflow.com` or `http://localhost:3000`).
- `APP_BASE_URL`: Trusted origin used to build password reset links.
- `BETTER_AUTH_TRUSTED_ORIGINS`: Comma-separated list of additional allowed origins.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Required for production rate limiting; placeholder values fail closed.
- `TRUST_PROXY_HOPS`: Number of trusted reverse-proxy hops before deriving the client IP (default `0`).
- `TRUSTED_PROXY_IPS`: Optional exact-IP allowlist of trusted proxies, used instead of hop counting.
- `EMAIL_PROVIDER`: Set to `emailjs` in production; `test` is accepted only under `NODE_ENV=test`.
- `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID_PASSWORD_RESET`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`: Real EmailJS credentials; placeholders are rejected.
- `EMAILJS_TIMEOUT_MS`: Email delivery timeout in milliseconds (default `8000`).
- `ALLOW_EMAILJS_TEST_SEND`, `EMAIL_TEST_RECIPIENT`: Explicit opt-in and dedicated recipient for `npm run email:test`; never use a customer mailbox.

### S3-Compatible Object Storage (Phase 06)

- `STORAGE_BUCKET`: Target S3 bucket name (e.g. `freelanceflow-uploads`).
- `STORAGE_REGION`: AWS region (e.g. `us-east-1` or `auto` for Cloudflare R2).
- `STORAGE_ENDPOINT`: Custom S3 endpoint URL (mandatory for Cloudflare R2 or MinIO; omit for standard AWS S3).
- `STORAGE_ACCESS_KEY_ID`: IAM access key or R2 API token ID with PutObject, GetObject, HeadObject, and DeleteObject permissions.
- `STORAGE_SECRET_ACCESS_KEY`: IAM secret key or R2 secret token.
- `MAX_FILE_SIZE_BYTES`: Configurable file upload size limit in bytes (defaults to `20971520` = 20 MB).

> [!NOTE]
> If storage credentials are not supplied in `.env.local`, file upload and download endpoints gracefully report `isLiveStorage: false`. Application services and tests function cleanly without throwing unhandled driver crashes.
