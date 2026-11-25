import { describe, expect, it } from "vitest";
import {
  isWorkspaceRole,
  workspaceRoleValues,
  workspaceRoles,
} from "../../src/auth/permissions";

describe("workspace roles", () => {
  it("allows exactly the three fixed roles", () => {
    expect(workspaceRoleValues).toEqual(["owner", "admin", "member"]);
    expect(isWorkspaceRole("owner")).toBe(true);
    expect(isWorkspaceRole("administrator")).toBe(false);
  });
  it("does not give the admin organization deletion permission", () => {
    expect(workspaceRoles.admin.statements.organization).not.toContain("delete");
    expect(workspaceRoles.owner.statements.organization).toContain("delete");
  });
});
