import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  deliverableInputSchema,
  deliverableListSchema,
  uploadUrlRequestSchema,
  completeUploadSchema,
  isValidTransition,
} from "../../src/validations/deliverable";
import { DeliverableModel } from "../../src/server/models/Deliverable";
import {
  isStorageConfigured,
  getStorageConfig,
} from "../../src/server/storage/s3-provider";

describe("Deliverable Validation & Schema", () => {
  const validProjectId = new Types.ObjectId().toString();
  const validMilestoneId = new Types.ObjectId().toString();

  it("accepts valid deliverable input with defaults", () => {
    const input = {
      projectId: validProjectId,
      title: "UI Design System & Component Kit",
      description: "Figma libraries, token exports, and usage documentation",
      contributorUserIds: ["usr_author_1"],
      reviewerUserIds: ["usr_reviewer_1"],
      externalLinks: [
        {
          title: "Figma Components",
          url: "https://figma.com/design/example",
        },
      ],
    };

    const parsed = deliverableInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("UI Design System & Component Kit");
      expect(parsed.data.status).toBe("draft");
      expect(parsed.data.contributorUserIds).toEqual(["usr_author_1"]);
      expect(parsed.data.reviewerUserIds).toEqual(["usr_reviewer_1"]);
      expect(parsed.data.externalLinks).toHaveLength(1);
    }
  });

  it("rejects invalid project ObjectId", () => {
    const parsed = deliverableInputSchema.safeParse({
      projectId: "invalid-id",
      title: "Design Kit",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("Please select a valid project.");
    }
  });

  it("rejects invalid milestone ObjectId when milestone is provided", () => {
    const parsed = deliverableInputSchema.safeParse({
      projectId: validProjectId,
      milestoneId: "not-a-mongo-id",
      title: "Design Kit",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("Invalid milestone ID format.");
    }
  });

  it("accepts valid milestoneId", () => {
    const parsed = deliverableInputSchema.safeParse({
      projectId: validProjectId,
      milestoneId: validMilestoneId,
      title: "Design Kit",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty title", () => {
    const parsed = deliverableInputSchema.safeParse({
      projectId: validProjectId,
      title: "   ",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates external link URL format", () => {
    const invalidUrl = deliverableInputSchema.safeParse({
      projectId: validProjectId,
      title: "Project Assets",
      externalLinks: [{ title: "Figma", url: "not-a-valid-url" }],
    });

    expect(invalidUrl.success).toBe(false);

    const validUrl = deliverableInputSchema.safeParse({
      projectId: validProjectId,
      title: "Project Assets",
      externalLinks: [{ title: "Figma", url: "https://figma.com/file/123" }],
    });

    expect(validUrl.success).toBe(true);
  });

  it("enforces strict status transition rules", () => {
    // Draft transitions
    expect(isValidTransition("draft", "in_progress")).toBe(true);
    expect(isValidTransition("draft", "submitted")).toBe(true);
    expect(isValidTransition("draft", "approved")).toBe(false);
    expect(isValidTransition("draft", "revision_required")).toBe(false);

    // In Progress transitions
    expect(isValidTransition("in_progress", "submitted")).toBe(true);
    expect(isValidTransition("in_progress", "approved")).toBe(false);

    // Submitted transitions (Review stage)
    expect(isValidTransition("submitted", "approved")).toBe(true);
    expect(isValidTransition("submitted", "revision_required")).toBe(true);
    expect(isValidTransition("submitted", "draft")).toBe(false);

    // Revision Required transitions
    expect(isValidTransition("revision_required", "submitted")).toBe(true);
    expect(isValidTransition("revision_required", "in_progress")).toBe(true);
    expect(isValidTransition("revision_required", "approved")).toBe(false);

    // Approved is terminal (except archiving)
    expect(isValidTransition("approved", "submitted")).toBe(false);
    expect(isValidTransition("approved", "revision_required")).toBe(false);
    expect(isValidTransition("approved", "archived")).toBe(true);

    // Self transition
    expect(isValidTransition("in_progress", "in_progress")).toBe(true);
  });

  it("validates uploadUrlRequestSchema file constraints", () => {
    const valid = uploadUrlRequestSchema.safeParse({
      filename: "design-v1.zip",
      mimeType: "application/zip",
      fileSize: 1048576, // 1MB
    });
    expect(valid.success).toBe(true);

    const negativeSize = uploadUrlRequestSchema.safeParse({
      filename: "empty.pdf",
      mimeType: "application/pdf",
      fileSize: 0,
    });
    expect(negativeSize.success).toBe(false);

    const emptyFilename = uploadUrlRequestSchema.safeParse({
      filename: "",
      mimeType: "application/pdf",
      fileSize: 500,
    });
    expect(emptyFilename.success).toBe(false);
  });

  it("validates completeUploadSchema metadata constraints", () => {
    const valid = completeUploadSchema.safeParse({
      fileId: "file_uuid_123",
      originalFilename: "final-render.png",
      storageKey: "orgs/org_1/deliverables/deliv_1/file_uuid_123-final-render.png",
      mimeType: "image/png",
      fileSize: 204800,
    });
    expect(valid.success).toBe(true);
  });

  it("validates deliverableListSchema query arguments", () => {
    const parsed = deliverableListSchema.parse({
      status: "submitted",
      view: "active",
      page: "2",
      limit: "15",
      sortBy: "dueDate",
      sortOrder: "asc",
    });

    expect(parsed.status).toBe("submitted");
    expect(parsed.view).toBe("active");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(15);
    expect(parsed.sortBy).toBe("dueDate");
    expect(parsed.sortOrder).toBe("asc");
  });

  it("instantiates DeliverableModel with subdocuments", () => {
    const doc = new DeliverableModel({
      organizationId: "org_alpha",
      projectId: new Types.ObjectId(),
      title: "Marketing Deck & Pitch Guidelines",
      normalizedTitle: "marketing deck & pitch guidelines",
      status: "draft",
      currentVersion: 1,
      contributorUserIds: ["usr_author_1"],
      reviewerUserIds: ["usr_reviewer_1"],
      files: [
        {
          fileId: "file_uuid_999",
          originalFilename: "pitch-deck.pdf",
          storageKey: "orgs/org_alpha/pitch-deck.pdf",
          mimeType: "application/pdf",
          fileSize: 524288,
          versionNumber: 1,
          uploadedByUserId: "usr_author_1",
        },
      ],
      reviews: [
        {
          reviewId: "rev_uuid_1",
          action: "submitted",
          actorUserId: "usr_author_1",
          comment: "Initial draft ready for feedback",
          versionNumber: 1,
        },
      ],
      createdByUserId: "usr_author_1",
      updatedByUserId: "usr_author_1",
    });

    expect(doc.organizationId).toBe("org_alpha");
    expect(doc.status).toBe("draft");
    expect(doc.currentVersion).toBe(1);
    expect(doc.files).toHaveLength(1);
    expect(doc.files[0].originalFilename).toBe("pitch-deck.pdf");
    expect(doc.reviews).toHaveLength(1);
    expect(doc.reviews[0].action).toBe("submitted");
  });

  it("checks storage configuration defaults", () => {
    const config = getStorageConfig();
    expect(config.maxSizeBytes).toBeGreaterThan(0);
    expect(typeof isStorageConfigured()).toBe("boolean");
  });
});
