import "server-only";

export type EmailMessage = { to: string; subject: string; text: string };
type TestOutbox = typeof globalThis & { __freelanceFlowTestEmails?: EmailMessage[] };

/**
 * Deliberately has no production fallback. An unconfigured mail provider must
 * fail closed instead of claiming that a verification or reset message sent.
 */
export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  if (process.env.EMAIL_PROVIDER === "test" && process.env.NODE_ENV === "test") {
    const testGlobal = globalThis as TestOutbox;
    testGlobal.__freelanceFlowTestEmails ??= [];
    testGlobal.__freelanceFlowTestEmails.push(message);
    return;
  }
  throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
}

export function getTestEmailOutbox(): EmailMessage[] {
  return (globalThis as TestOutbox).__freelanceFlowTestEmails ?? [];
}
