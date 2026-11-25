import { describe, expect, it } from "vitest";
import {
  projectInputSchema,
  projectUpdateSchema,
  projectListSchema,
} from "../../src/validations/project";
import { ProjectModel } from "../../src/server/models/Project";
import { Types } from "mongoose";

describe("Project Validation & Schema", () => {
  const validClientId = new Types.ObjectId().toString();

  it("accepts valid project input with defaults", () => {
    const input = {
      clientId: validClientId,
      name: "Mobile App Redesign",
      status: "in_progress",
      priority: "high",
      budgetMinor: 500000,
      currency: "USD",
      minorUnit: 2,
    };

    const parsed = projectInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Mobile App Redesign");
      expect(parsed.data.progressPercent).toBe(0);
      expect(parsed.data.memberUserIds).toEqual([]);
    }
  });

  it("validates that deadline cannot be before start date", () => {
    const invalidDates = {
      clientId: validClientId,
      name: "Website Overhaul",
      startDate: new Date("2026-06-01"),
      dueDate: new Date("2026-05-01"),
    };

    const parsed = projectInputSchema.safeParse(invalidDates);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain(
        "Deadline must be on or after start date",
      );
    }
  });

  it("rejects invalid client ObjectId format", () => {
    const invalidClient = {
      clientId: "not-a-valid-objectid",
      name: "Branding",
    };

    const parsed = projectInputSchema.safeParse(invalidClient);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid project codes containing lowercase or special symbols", () => {
    const invalidCode = {
      clientId: validClientId,
      name: "Logo Redesign",
      projectCode: "prj_lowercase_123",
    };

    const parsed = projectInputSchema.safeParse(invalidCode);
    expect(parsed.success).toBe(false);
  });

  it("rejects progress percent outside 0 to 100", () => {
    expect(
      projectInputSchema.safeParse({
        clientId: validClientId,
        name: "Test",
        progressPercent: 120,
      }).success,
    ).toBe(false);

    expect(
      projectInputSchema.safeParse({
        clientId: validClientId,
        name: "Test",
        progressPercent: -10,
      }).success,
    ).toBe(false);
  });

  it("validates project list arguments and default pagination bounds", () => {
    const parsed = projectListSchema.parse({
      status: "in_progress",
      priority: "urgent",
      page: "2",
      limit: "15",
    });

    expect(parsed.status).toBe("in_progress");
    expect(parsed.priority).toBe("urgent");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
    expect(parsed.view).toBe("active");
  });

  it("validates projectUpdateSchema partial updates", () => {
    const update = {
      name: "Updated Mobile Project Name",
      status: "completed",
      progressPercent: 100,
    };
    const parsed = projectUpdateSchema.safeParse(update);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Updated Mobile Project Name");
      expect(parsed.data.status).toBe("completed");
    }
  });

  it("instantiates ProjectModel with workspace isolation and required fields", () => {
    const project = new ProjectModel({
      organizationId: "org_workspace_123",
      clientId: new Types.ObjectId(),
      projectCode: "PRJ-901",
      name: "E-Commerce Replatform",
      normalizedName: "e-commerce replatform",
      budgetMinor: 1000000,
      currency: "USD",
      minorUnit: 2,
      createdByUserId: "user_owner_1",
      updatedByUserId: "user_owner_1",
    });

    const error = project.validateSync();
    expect(error).toBeUndefined();
    expect(project.organizationId).toBe("org_workspace_123");
    expect(project.status).toBe("planning");
    expect(project.priority).toBe("medium");
  });
});
