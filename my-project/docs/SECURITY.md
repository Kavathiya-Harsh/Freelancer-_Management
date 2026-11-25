# Security

Production requires distributed Redis-backed rate limiting through `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; process-local rate limiting is not used. Rate limiting fails closed in production when Redis is missing or still set to a placeholder. Keys are SHA-256 hashed and include an IP derived from `TRUST_PROXY_HOPS` or an exact `TRUSTED_PROXY_IPS` allowlist; forwarded headers are ignored unless one of those settings is configured. API responses include a correlation ID. Errors do not disclose database details or stack traces.

Password recovery endpoints enforce JSON `Content-Type` and a trusted `Origin`. Request bodies are Zod-validated. Reset tokens are high-entropy values stored only as salted SHA-256 hashes; raw tokens and reset links are never logged or returned by an API. Password changes, token consumption, and session revocation occur in one MongoDB transaction with majority write concern. Token indexes are created on startup: unique token hash, active-token lookup, and TTL expiry.

Email delivery failures are reported internally but never leak token material to the client. Recovery requests return the same generic response for existing and unknown emails. `EMAIL_PROVIDER=test` is accepted only under `NODE_ENV=test`, and a live diagnostic send requires explicit `ALLOW_EMAILJS_TEST_SEND=true` plus a dedicated recipient.

Security headers are configured globally. Private signed object-storage uploads/downloads, MIME/size checks, and malware scanning are required before file features are introduced.

Archived workspaces block normal writes, invitations, and role changes. Historical financial data must be retained.
