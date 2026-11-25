import { AppShell } from "@/components/workspace/app-shell";
import {
  createTenantContext,
  requireSession,
} from "@/server/authorization/tenant-context";
import { getMongoDb } from "@/server/db/mongo-client";
import { notFound, redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  let context;
  let session;
  try {
    [context, session] = await Promise.all([
      createTenantContext(workspaceSlug, "workspace-layout"),
      requireSession(),
    ]);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHENTICATED") redirect("/sign-in");
    if (code === "WORKSPACE_NOT_FOUND" || code === "WORKSPACE_FORBIDDEN") notFound();
    // Auto-provision the lifecycle record when it is missing (e.g. workspaces
    // created before provisioning was introduced) and retry once.
    if (code === "WORKSPACE_NOT_PROVISIONED") {
      try {
        const { getMongoDb } = await import("@/server/db/mongo-client");
        const { provisionWorkspace } = await import("@/server/services/workspace-provisioning");
        const db = await getMongoDb();
        const org = await db.collection("organization").findOne({ slug: workspaceSlug });
        if (org) {
          const orgId = (org.id ?? org._id.toString()) as string;
          await provisionWorkspace(orgId);
          // Retry context creation after provisioning
          [context, session] = await Promise.all([
            createTenantContext(workspaceSlug, "workspace-layout"),
            requireSession(),
          ]);
        } else {
          notFound();
        }
      } catch {
        notFound();
      }
    } else {
      throw error;
    }
  }
  const db = await getMongoDb();
  const organization = await db
    .collection("organization")
    .findOne(
      {
        $or: [
          { id: context.organizationId },
          { slug: workspaceSlug },
        ],
      },
      { projection: { name: 1 } },
    );
  return (
    <AppShell
      workspaceSlug={workspaceSlug}
      workspaceName={organization?.name ?? workspaceSlug}
      workspaceRole={context.role}
      userName={session.user.name}
    >
      {children}
    </AppShell>
  );
}
