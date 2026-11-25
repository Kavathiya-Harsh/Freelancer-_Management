import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const workspaceStatements = {
  ...defaultStatements,
} as const;

export const workspaceAccessControl = createAccessControl(workspaceStatements);

// The default statements are deliberately retained. Dynamic organization roles
// are not configured anywhere in this application.
export const workspaceRoles = {
  owner: workspaceAccessControl.newRole({ ...ownerAc.statements }),
  admin: workspaceAccessControl.newRole({ ...adminAc.statements }),
  member: workspaceAccessControl.newRole({ ...memberAc.statements }),
};

export type WorkspaceRole = keyof typeof workspaceRoles;
export const workspaceRoleValues = Object.keys(workspaceRoles) as WorkspaceRole[];

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return workspaceRoleValues.includes(value as WorkspaceRole);
}
