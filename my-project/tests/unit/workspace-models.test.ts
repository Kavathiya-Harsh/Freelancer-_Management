import { describe, expect, it } from "vitest";
import { WorkspaceLifecycleModel } from "../../src/server/models/workspace-lifecycle";
import { WorkspacePreferencesModel } from "../../src/server/models/workspace-preferences";

describe("workspace models", () => {
  it("requires an organization ID for lifecycle records", () => {
    const document = new WorkspaceLifecycleModel({});
    expect(document.validateSync()).toBeTruthy();
  });
  it("applies safe workspace preference defaults", () => {
    const document = new WorkspacePreferencesModel({ organizationId: "org_test" });
    expect(document.currency).toBe("USD");
    expect(document.invoiceSequence).toBe(0);
  });
});
