"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { workspaceAccessControl, workspaceRoles } from "@/auth/permissions";

export const authClient = createAuthClient({
  plugins: [organizationClient({ ac: workspaceAccessControl, roles: workspaceRoles })],
});
