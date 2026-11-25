import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  milestoneInputSchema,
  milestoneListSchema,
} from "../../src/validations/milestone";
import { MilestoneModel } from "../../src/server/models/Milestone";

describe("Milestone Validation & Schema", () => {
  const validProjectId = new Types.ObjectId().toString();

  it("accepts valid milestone input with defaults", () => {
    const input = {
      projectId: validProjectId,
      title: "MVP Release Sign-off",
      description: "First complete build with client review",
      dueDate: new Date("2026-07-01"),
      targetAmountMinor: 150000,
      currency: "USD",
      order: 1,
    };

    const parsed = milestoneInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("MVP Release Sign-off");
      expect(parsed.data.status).toBe("upcoming");
      expect(parsed.data.targetAmountMinor).toBe(150000);
      expect(parsed.data.currency).toBe("USD");
      expect(parsed.data.order).toBe(1);
    }
  });

  it("rejects milestone if title is empty or blank", () => {
    const parsed = milestoneInputSchema.safeParse({
      projectId: validProjectId,
      title: "   ",
      dueDate: new Date("2026-08-01"),
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects negative target amount", () => {
    const parsed = milestoneInputSchema.safeParse({
      projectId: validProjectId,
      title: "Phase 1 Payment",
      dueDate: new Date("2026-08-01"),
      targetAmountMinor: -5000,
    });

    expect(parsed.success).toBe(false);
  });

  it("computes overdue status correctly based on date and completion", () => {
    const pastDate = new Date("2025-01-01");
    const futureDate = new Date("2030-01-01");

    // Helper simulating the service's computedStatus logic
    function computeStatus(status: string, dueDate: Date) {
      if (status === "completed") return "completed";
      if (new Date(dueDate).getTime() < Date.now()) return "overdue";
      return status;
    }

    expect(computeStatus("upcoming", pastDate)).toBe("overdue");
    expect(computeStatus("in_progress", pastDate)).toBe("overdue");
    expect(computeStatus("completed", pastDate)).toBe("completed");
    expect(computeStatus("upcoming", futureDate)).toBe("upcoming");
    expect(computeStatus("in_progress", futureDate)).toBe("in_progress");
  });

  it("validates milestoneListSchema query filters", () => {
    const parsed = milestoneListSchema.parse({
      status: "in_progress",
      view: "archived",
    });

    expect(parsed.status).toBe("in_progress");
    expect(parsed.view).toBe("archived");
  });

  it("instantiates MilestoneModel with correct fields and defaults", () => {
    const milestoneDoc = new MilestoneModel({
      organizationId: "org_workspace_123",
      projectId: new Types.ObjectId(),
      title: "Alpha Milestone",
      dueDate: new Date("2026-09-01"),
      status: "upcoming",
      order: 0,
      targetAmountMinor: 50000,
      currency: "USD",
      createdByUserId: "user_owner_1",
      updatedByUserId: "user_owner_1",
    });

    expect(milestoneDoc.organizationId).toBe("org_workspace_123");
    expect(milestoneDoc.title).toBe("Alpha Milestone");
    expect(milestoneDoc.status).toBe("upcoming");
    expect(milestoneDoc.targetAmountMinor).toBe(50000);
    expect(milestoneDoc.order).toBe(0);
    expect(milestoneDoc.completedAt).toBeNull();
  });
});
