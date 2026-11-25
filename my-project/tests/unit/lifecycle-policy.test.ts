import { describe, expect, it } from "vitest";
import {
  canRestoreWorkspace,
  canWriteWorkspace,
} from "../../src/server/authorization/lifecycle-policy";

describe("workspace lifecycle policy", () => {
  it("blocks writes to archived workspaces", () => {
    expect(canWriteWorkspace("active")).toBe(true);
    expect(canWriteWorkspace("archived")).toBe(false);
  });
  it("limits restoration to owners", () => {
    expect(canRestoreWorkspace("owner")).toBe(true);
    expect(canRestoreWorkspace("admin")).toBe(false);
  });
});
