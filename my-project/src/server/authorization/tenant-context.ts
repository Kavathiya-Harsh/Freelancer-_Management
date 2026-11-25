import "server-only";
import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { getMongoDb } from "@/server/db/mongo-client";
import { getWorkspaceLifecycle } from "@/server/services/workspace-lifecycle";
import { isWorkspaceRole, type WorkspaceRole } from "@/auth/permissions";

import { ObjectId } from "mongodb";

export type TenantContext = {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: WorkspaceRole;
  workspaceSlug: string;
  workspaceStatus: "active" | "archived";
  requestId: string;
};

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function createTenantContext(
  workspaceSlug: string,
  requestId: string,
): Promise<TenantContext> {
  const session = await requireSession();
  const db = await getMongoDb();
  const organization = await db
    .collection("organization")
    .findOne({ slug: workspaceSlug });
  if (!organization) throw new Error("WORKSPACE_NOT_FOUND");
  const orgId = (organization.id ?? organization._id.toString()) as string;
  const membership = await requireWorkspaceMembership(orgId, session.user.id);
  let lifecycle = await getWorkspaceLifecycle(orgId);
  if (!lifecycle) {
    const { provisionWorkspace } = await import("@/server/services/workspace-provisioning");
    await provisionWorkspace(orgId);
    lifecycle = await getWorkspaceLifecycle(orgId);
  }
  if (!lifecycle) throw new Error("WORKSPACE_NOT_PROVISIONED");
  return {
    userId: session.user.id,
    organizationId: orgId,
    membershipId: (membership.id ?? (membership as Record<string, unknown>)._id?.toString()) as string,
    role: membership.role,
    workspaceSlug,
    workspaceStatus: lifecycle.status,
    requestId,
  };
}

export async function requireWorkspaceMembership(
  organizationId: string,
  userId?: string,
) {
  const session = userId ? null : await requireSession();
  const db = await getMongoDb();
  const uid = userId ?? session!.user.id;
  const userQuery = ObjectId.isValid(uid)
    ? { $in: [uid, new ObjectId(uid)] }
    : uid;
  const orgQuery = ObjectId.isValid(organizationId)
    ? { $in: [organizationId, new ObjectId(organizationId)] }
    : organizationId;
  const membership = await db
    .collection("member")
    .findOne({ organizationId: orgQuery, userId: userQuery });
  if (!membership || !isWorkspaceRole(membership.role))
    throw new Error("WORKSPACE_FORBIDDEN");
  return membership as unknown as {
    id: string;
    userId: string;
    organizationId: string;
    role: WorkspaceRole;
  };
}

export async function requireWorkspaceActive(context: TenantContext) {
  if (context.workspaceStatus !== "active") throw new Error("WORKSPACE_ARCHIVED");
  return context;
}

export function requirePermission(context: TenantContext, allowed: WorkspaceRole[]) {
  if (!allowed.includes(context.role)) throw new Error("WORKSPACE_FORBIDDEN");
  return context;
}
