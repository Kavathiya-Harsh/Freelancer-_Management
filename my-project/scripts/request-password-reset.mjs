/**
 * Request a real password recovery email for a specific account.
 *
 * Requires the app server to be running (npm run dev) and a reachable
 * APP_BASE_URL. Never prints token material — only the HTTP result.
 *
 * Usage:
 *   npm run reset:request -- --email=developer@example.com
 */
const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

function recipient() {
  const arg = process.argv.find((value) => value.startsWith("--email="));
  return (arg ? arg.slice("--email=".length) : process.env.EMAIL_TEST_RECIPIENT || "").trim();
}

async function main() {
  const email = recipient();
  if (!email) {
    console.error("Provide --email=<account email> or set EMAIL_TEST_RECIPIENT.");
    process.exitCode = 1;
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      cache: "no-store",
      body: JSON.stringify({ email }),
    });
    const payload = await response.json().catch(() => ({}));
    console.log(`Recovery request status: ${response.status}`);
    console.log(payload.error?.message ?? payload.message ?? "No response message.");
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.error(`Could not reach ${baseUrl}. Start the app server first.`);
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error("Recovery request failed.");
  process.exitCode = 1;
});
