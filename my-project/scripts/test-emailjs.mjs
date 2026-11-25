/**
 * FreelanceFlow — EmailJS Configuration & Delivery Diagnostic
 *
 * Dry-run by default. A live test message is sent only when all are true:
 *   - configuration values are present and non-placeholder
 *   - a dedicated test recipient is supplied
 *   - ALLOW_EMAILJS_TEST_SEND=true
 *
 * Usage:
 *   npm run email:test
 *   npm run email:test -- --to=developer@example.com
 */
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PLACEHOLDER_PATTERN = /your_|placeholder|example|xxx|replace|changeme/i;

function configured(value) {
  const trimmed = value?.trim();
  return Boolean(trimmed) && !PLACEHOLDER_PATTERN.test(trimmed);
}

function status(value) {
  return configured(value) ? "OK" : "MISSING/PLACEHOLDER";
}

async function main() {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID_PASSWORD_RESET;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const appBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000";

  console.log("\nEmailJS configuration (values intentionally hidden):");
  console.log(`  Service ID:  ${status(serviceId)}`);
  console.log(`  Template ID: ${status(templateId)}`);
  console.log(`  Public Key:  ${status(publicKey)}`);
  console.log(`  Private Key: ${status(privateKey)}`);
  console.log(`  App URL:     ${appBaseUrl}`);

  const isConfigured = [serviceId, templateId, publicKey, privateKey].every(configured);
  if (!isConfigured) {
    console.log("\nConfiguration incomplete. Replace placeholder values in .env.local.");
    return;
  }

  const argTo = process.argv
    .find((arg) => arg.startsWith("--to="))
    ?.split("=")[1]
    ?.trim();
  const testRecipient = argTo || process.env.EMAIL_TEST_RECIPIENT?.trim();
  const optedIn = process.env.ALLOW_EMAILJS_TEST_SEND === "true";

  if (!testRecipient || !optedIn) {
    console.log("\nDry run only. No email sent.");
    console.log(
      "To send a safe test email, set EMAIL_TEST_RECIPIENT and ALLOW_EMAILJS_TEST_SEND=true.",
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: appBaseUrl,
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        user_id: publicKey.trim(),
        accessToken: privateKey.trim(),
        service_id: serviceId.trim(),
        template_id: templateId.trim(),
        template_params: {
          to_email: testRecipient,
          email: testRecipient,
          user_email: testRecipient,
          to_name: "FreelanceFlow Developer",
          name: "FreelanceFlow Developer",
          product_name: "FreelanceFlow",
          reset_url: `${appBaseUrl.replace(/\/+$/, "")}/reset-password?token=DIAGNOSTIC_TEST_LINK_DO_NOT_CLICK`,
          reset_link: `${appBaseUrl.replace(/\/+$/, "")}/reset-password?token=DIAGNOSTIC_TEST_LINK_DO_NOT_CLICK`,
          expires_minutes: 20,
          support_email: "support@freelanceflow.dev",
        },
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      console.error(`\nEmailJS rejected the request (status ${response.status}): ${bodyText}`);
      process.exitCode = 1;
      return;
    }

    console.log(`\nEmailJS accepted the diagnostic message (status ${response.status}): ${bodyText}`);
    console.log("Email successfully dispatched via EmailJS!");
  } catch (err) {
    console.error("\nEmailJS request failed or timed out.", err?.message || "");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

main().catch(() => {
  console.error("Diagnostic execution failed.");
  process.exitCode = 1;
});
