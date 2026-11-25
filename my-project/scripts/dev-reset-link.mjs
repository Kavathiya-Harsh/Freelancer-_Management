/**
 * Development-only helper: request a real reset for a known account and print
 * the generated link from the gitignored local outbox.
 *
 * Requires ALLOW_DEV_RESET_LINK=true and a running app server. Never usable
 * in production because the server refuses to capture links there.
 *
 * Usage:
 *   npm run reset:dev-link
 *   npm run reset:dev-link -- --email=account@example.com
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const OUTBOX = join(process.cwd(), ".dev-reset-links.jsonl");
const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

function recipient() {
  const arg = process.argv.find((value) => value.startsWith("--email="));
  return (
    arg?.slice("--email=".length) ||
    process.env.EMAIL_TEST_RECIPIENT ||
    process.env.DEMO_ACCOUNT_EMAIL ||
    ""
  ).trim();
}

async function main() {
  if (process.env.ALLOW_DEV_RESET_LINK !== "true") {
    console.error("Set ALLOW_DEV_RESET_LINK=true in .env.local first.");
    process.exitCode = 1;
    return;
  }

  const email = recipient();
  if (!email) {
    console.error("No account email available. Pass --email=<account email>.");
    process.exitCode = 1;
    return;
  }

  const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    cache: "no-store",
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  console.log(`Recovery request status: ${response.status}`);

  if (!response.ok) {
    console.error(payload.error?.message ?? "Recovery request was rejected.");
    process.exitCode = 1;
    return;
  }

  const lines = (await readFile(OUTBOX, "utf8")).split("\n").filter(Boolean);
  const records = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((record) => record && record.to === email);

  const latest = records.at(-1);
  if (!latest?.resetUrl) {
    console.error("No captured link found. Confirm the app server has the dev flag enabled.");
    process.exitCode = 1;
    return;
  }

  console.log(`Reset link for ${email} (expires in ${latest.expiresMinutes} minutes):`);
  console.log(latest.resetUrl);
}

main().catch((error) => {
  console.error(
    error?.code === "ENOENT"
      ? `No outbox yet. Start the app server and retry. (${OUTBOX})`
      : "Could not generate a reset link.",
  );
  process.exitCode = 1;
});
