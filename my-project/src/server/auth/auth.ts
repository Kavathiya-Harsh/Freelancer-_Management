import "server-only";
import { APIError, betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { organization } from "better-auth/plugins";
import { getMongoClientInstance } from "@/server/db/mongo-client";
import { getWorkspaceLifecycle } from "@/server/services/workspace-lifecycle";
import { provisionWorkspace } from "@/server/services/workspace-provisioning";
import { trustedOrigins } from "@/server/env";
import { workspaceAccessControl, workspaceRoles } from "@/auth/permissions";
import { sendPasswordResetEmail } from "@/server/email/emailjs";
import { sendTransactionalEmail } from "@/server/email/provider";

const client = getMongoClientInstance();
const db = client.db(process.env.MONGODB_DB ?? "freelanceflow");
const buildFallback = process.env.NEXT_PHASE === "phase-production-build";

async function rejectArchived(organizationId: string) {
  const lifecycle = await getWorkspaceLifecycle(organizationId);
  if (!lifecycle || lifecycle.status === "archived") {
    throw new APIError("FORBIDDEN", {
      message: "This workspace is not available for this operation.",
    });
  }
}

export const auth = betterAuth({
  database: mongodbAdapter(db, { client, transaction: true }),
  // Build analysis imports route modules without deployment secrets. Runtime
  // handlers validate the actual environment before servicing requests.
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (buildFallback ? "build-only-placeholder-secret-that-is-never-used" : undefined),
  baseURL:
    process.env.BETTER_AUTH_URL ?? (buildFallback ? "http://localhost:3000" : undefined),
  trustedOrigins: trustedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: process.env.NODE_ENV === "production",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const delivery = await sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        resetUrl: url,
        expiresMinutes: 20,
        productName: "FreelanceFlow",
      });
      if (!delivery.success) {
        throw new APIError("SERVICE_UNAVAILABLE", {
          message: "Password recovery email could not be delivered.",
        });
      }
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Verify your FreelanceFlow email",
          text: `Verify your email: ${url}`,
        });
      } catch {
        throw new APIError("SERVICE_UNAVAILABLE", {
          message: "Verification email is not configured.",
        });
      }
    },
  },
  plugins: [
    organization({
      ac: workspaceAccessControl,
      roles: workspaceRoles,
      disableOrganizationDeletion: true,
      requireEmailVerificationOnInvitation: true,
      organizationHooks: {
        beforeCreateOrganization: async ({ organization }) => {
          if (!organization.slug?.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
            throw new APIError("BAD_REQUEST", {
              message: "Workspace slug must be lowercase kebab-case.",
            });
          }
        },
        afterCreateOrganization: async ({ organization }) => {
          try {
            const orgId =
              organization.id ??
              (organization as Record<string, unknown>)._id?.toString();
            if (orgId) {
              await provisionWorkspace(orgId);
              console.info("Workspace provisioned", { organizationId: orgId });
            }
          } catch (error) {
            console.error("Organization created but provisioning failed", {
              organizationId: organization.id,
              name: error instanceof Error ? error.name : "UnknownError",
            });
          }
        },
        beforeUpdateOrganization: async ({ organization, member }) => {
          await rejectArchived(organization.id);
          if (
            !member.role.split(",").includes("owner") &&
            organization.slug !== undefined
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Only an owner can change a workspace slug.",
            });
          }
        },
        beforeAddMember: async ({ organization }) => rejectArchived(organization.id),
        beforeRemoveMember: async ({ organization }) => rejectArchived(organization.id),
        beforeUpdateMemberRole: async ({ member, newRole, user, organization }) => {
          await rejectArchived(organization.id);
          if (member.userId === user.id) {
            throw new APIError("FORBIDDEN", {
              message: "Members cannot change their own role.",
            });
          }
          const actor = await db
            .collection("member")
            .findOne({ userId: user.id, organizationId: organization.id });
          const isOwner = actor?.role?.split(",").includes("owner");
          if (!isOwner && newRole === "owner") {
            throw new APIError("FORBIDDEN", {
              message: "Only an owner can grant ownership.",
            });
          }
        },
        beforeCreateInvitation: async ({ organization }) =>
          rejectArchived(organization.id),
        beforeAcceptInvitation: async ({ organization }) =>
          rejectArchived(organization.id),
        beforeCancelInvitation: async ({ organization }) =>
          rejectArchived(organization.id),
      },
    }),
  ],
});
