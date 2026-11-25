import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  taskInputSchema,
  taskStatusUpdateSchema,
  taskListSchema,
  taskStatuses,
  taskPriorities,
} from "../../src/validations/task";
import { TaskModel } from "../../src/server/models/Task";

describe("Task Validation & Schema", () => {
  const validProjectId = new Types.ObjectId().toString();

  it("accepts valid task input with defaults", () => {
    const input = {
      projectId: validProjectId,
      title: "Implement user authentication modal",
      description: "Setup Better Auth dialog with Google and credentials",
      priority: "high",
      tags: ["auth", "frontend"],
    };

    const parsed = taskInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Implement user authentication modal");
      expect(parsed.data.status).toBe("todo");
      expect(parsed.data.priority).toBe("high");
      expect(parsed.data.progressPercent).toBe(0);
      expect(parsed.data.estimatedMinutes).toBe(0);
      expect(parsed.data.actualMinutes).toBe(0);
      expect(parsed.data.assigneeUserIds).toEqual([]);
      expect(parsed.data.tags).toEqual(["auth", "frontend"]);
    }
  });

  it("rejects task if projectId is not a valid 24-character ObjectId", () => {
    const parsed = taskInputSchema.safeParse({
      projectId: "invalid-id",
      title: "Fix responsive layout",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("Please select a valid project.");
    }
  });

  it("validates that dueDate cannot be before startDate", () => {
    const parsed = taskInputSchema.safeParse({
      projectId: validProjectId,
      title: "Write documentation",
      startDate: new Date("2026-06-15"),
      dueDate: new Date("2026-06-10"),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain(
        "Due date must be on or after start date",
      );
    }
  });

  it("accepts dueDate equal to or after startDate", () => {
    const parsed = taskInputSchema.safeParse({
      projectId: validProjectId,
      title: "Sprint Review",
      startDate: new Date("2026-06-10T10:00:00Z"),
      dueDate: new Date("2026-06-10T12:00:00Z"),
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects negative estimated or actual minutes", () => {
    const negativeEst = taskInputSchema.safeParse({
      projectId: validProjectId,
      title: "Test Minutes",
      estimatedMinutes: -30,
    });
    expect(negativeEst.success).toBe(false);

    const negativeAct = taskInputSchema.safeParse({
      projectId: validProjectId,
      title: "Test Minutes",
      actualMinutes: -15,
    });
    expect(negativeAct.success).toBe(false);
  });

  it("rejects progress percent outside 0 to 100", () => {
    expect(
      taskInputSchema.safeParse({
        projectId: validProjectId,
        title: "Test progress",
        progressPercent: -5,
      }).success,
    ).toBe(false);

    expect(
      taskInputSchema.safeParse({
        projectId: validProjectId,
        title: "Test progress",
        progressPercent: 120,
      }).success,
    ).toBe(false);
  });

  it("validates all supported task statuses and priorities", () => {
    for (const status of taskStatuses) {
      const parsed = taskInputSchema.safeParse({
        projectId: validProjectId,
        title: `Task with ${status}`,
        status,
      });
      expect(parsed.success).toBe(true);
    }

    for (const priority of taskPriorities) {
      const parsed = taskInputSchema.safeParse({
        projectId: validProjectId,
        title: `Task with ${priority}`,
        priority,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("validates taskStatusUpdateSchema", () => {
    const valid = taskStatusUpdateSchema.safeParse({ status: "in_progress" });
    expect(valid.success).toBe(true);

    const invalid = taskStatusUpdateSchema.safeParse({ status: "invalid_status" });
    expect(invalid.success).toBe(false);
  });

  it("validates taskListSchema pagination and bounds", () => {
    const parsed = taskListSchema.parse({
      status: "done",
      priority: "urgent",
      page: "3",
      limit: "25",
    });

    expect(parsed.status).toBe("done");
    expect(parsed.priority).toBe("urgent");
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
  });

  it("instantiates TaskModel with correct schema properties", () => {
    const taskDoc = new TaskModel({
      organizationId: "org_workspace_123",
      projectId: new Types.ObjectId(),
      title: "Database schema migration",
      status: "todo",
      priority: "high",
      createdByUserId: "user_admin_1",
      updatedByUserId: "user_admin_1",
    });

    expect(taskDoc.organizationId).toBe("org_workspace_123");
    expect(taskDoc.title).toBe("Database schema migration");
    expect(taskDoc.status).toBe("todo");
    expect(taskDoc.priority).toBe("high");
    expect(taskDoc.assigneeUserIds).toEqual([]);
    expect(taskDoc.progressPercent).toBe(0);
  });
});
