"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Edit2,
  Archive,
  RotateCcw,
  AlertCircle,
  FileText,
  UploadCloud,
  Download,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  History,
  Send,
  FileCheck,
} from "lucide-react";
import { DeliverableFormModal } from "./deliverable-form-modal";
import { type DeliverableStatus } from "@/validations/deliverable";

export type DeliverableFileItem = {
  fileId: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  versionNumber: number;
  uploadedByUserId: string;
  uploadedAt: string;
  comment?: string;
};

export type DeliverableReviewItem = {
  reviewId: string;
  action: "submitted" | "approved" | "revision_requested" | "resubmitted";
  actorUserId: string;
  comment?: string;
  versionNumber: number;
  occurredAt: string;
};

export type DeliverableDetailData = {
  _id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string;
  status: DeliverableStatus;
  contributorUserIds: string[];
  reviewerUserIds: string[];
  dueDate?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  currentVersion: number;
  files: DeliverableFileItem[];
  reviews: DeliverableReviewItem[];
  externalLinks: Array<{ title: string; url: string }>;
  createdByUserId: string;
  updatedByUserId: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    _id: string;
    name: string;
    projectCode: string;
    status: string;
  } | null;
  milestone?: {
    _id: string;
    title: string;
    dueDate: string;
    status: string;
  } | null;
  contributors?: Array<{
    userId: string;
    name?: string;
    email?: string;
    image?: string | null;
  }>;
  reviewers?: Array<{
    userId: string;
    name?: string;
    email?: string;
    image?: string | null;
  }>;
  activities?: Array<{
    _id: string;
    action: string;
    actorUserId: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }>;
};

const statusConfig: Record<
  DeliverableStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-stone-50",
    text: "text-stone-700",
    border: "border-stone-200",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  submitted: {
    label: "Submitted",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  revision_required: {
    label: "Revision Required",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  approved: {
    label: "Approved",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  archived: {
    label: "Archived",
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200",
  },
};

export function DeliverableDetailView({
  workspaceSlug,
  deliverableId,
}: {
  workspaceSlug: string;
  deliverableId: string;
}) {
  const [deliverable, setDeliverable] = useState<DeliverableDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitComment, setSubmitComment] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // File Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchDeliverable() {
      try {
        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}`,
        );
        const json = await res.json();
        if (!active) return;

        if (!res.ok) {
          setErrorMessage(json.error?.message || "Failed to load deliverable details.");
          return;
        }

        setDeliverable(json.data);
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : "Network error loading deliverable.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDeliverable();
    return () => {
      active = false;
    };
  }, [workspaceSlug, deliverableId, refreshTrigger]);

  const handleFileUpload = async (file: File) => {
    if (!deliverable) return;
    setUploadError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Request presigned upload URL from API
      const presignRes = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        },
      );

      const presignJson = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignJson.error?.message || "Failed to authorize file upload.");
      }

      const { uploadUrl, storageKey, fileId, isLiveStorage } = presignJson.data;
      setUploadProgress(40);

      // 2. Perform direct upload if live storage, or mock complete
      if (isLiveStorage && uploadUrl.startsWith("http")) {
        const s3UploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!s3UploadRes.ok) {
          throw new Error("Failed to upload file to cloud storage.");
        }
      }

      setUploadProgress(80);

      // 3. Complete and verify upload metadata
      const completeRes = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}/complete-upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            originalFilename: file.name,
            storageKey,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        },
      );

      const completeJson = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(
          completeJson.error?.message || "Failed to register uploaded file.",
        );
      }

      setUploadProgress(100);
      setSuccessBanner(`File "${file.name}" uploaded successfully.`);
      setTimeout(() => setSuccessBanner(null), 3000);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (file: DeliverableFileItem) => {
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}/files/${file.fileId}/download-url`,
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || "Failed to get download URL.");
        return;
      }

      if (json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, "_blank");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Download error.");
    }
  };

  const executeReviewAction = async (
    endpoint: "submit" | "approve" | "request-revision" | "resubmit",
    comment?: string,
  ) => {
    setActionSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(
          json.error?.message || `Failed to ${endpoint.replace("-", " ")}.`,
        );
        return;
      }

      setSuccessBanner(`Deliverable status updated.`);
      setTimeout(() => setSuccessBanner(null), 3000);
      setRevisionDialogOpen(false);
      setApproveDialogOpen(false);
      setSubmitDialogOpen(false);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!deliverable) return;
    const isArchiving = !deliverable.archivedAt;
    const action = isArchiving ? "archive" : "restore";
    const confirmed = window.confirm(
      isArchiving
        ? "Are you sure you want to archive this deliverable?"
        : "Are you sure you want to restore this deliverable?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/deliverables/${deliverableId}/${action}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || `Failed to ${action} deliverable.`);
        return;
      }
      setSuccessBanner(isArchiving ? "Deliverable archived." : "Deliverable restored.");
      setTimeout(() => setSuccessBanner(null), 3000);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not specified";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
          <p className="text-xs text-[#587061]">Loading deliverable details…</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !deliverable) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-600 mb-2" />
        <h3 className="text-base font-bold text-red-900">Failed to load deliverable</h3>
        <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
        <Link
          href={`/w/${workspaceSlug}/deliverables`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-xs border border-stone-200 hover:bg-stone-50"
        >
          <ArrowLeft size={14} />
          Back to Deliverables
        </Link>
      </div>
    );
  }

  if (!deliverable) return null;

  const st = statusConfig[deliverable.status] || statusConfig.draft;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/w/${workspaceSlug}/deliverables`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#123524] shadow-xs hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft size={14} />
            Deliverables
          </Link>
          <span className="text-stone-300">/</span>
          {deliverable.project && (
            <Link
              href={`/w/${workspaceSlug}/projects/${deliverable.projectId}`}
              className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 hover:text-stone-900"
            >
              [{deliverable.project.projectCode}] {deliverable.project.name}
            </Link>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Submit / Resubmit */}
          {(deliverable.status === "draft" ||
            deliverable.status === "in_progress" ||
            deliverable.status === "revision_required") && (
            <button
              onClick={() => setSubmitDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-lime-300 px-4 py-2 text-xs font-bold text-[#123524] shadow-xs hover:bg-lime-400 active:scale-98 transition-all"
            >
              <Send size={14} />
              <span>
                {deliverable.status === "revision_required"
                  ? "Resubmit Revision"
                  : "Submit for Review"}
              </span>
            </button>
          )}

          {/* Review actions: Request Revision or Approve */}
          {deliverable.status === "submitted" && (
            <>
              <button
                onClick={() => setRevisionDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 active:scale-98 transition-all"
              >
                <MessageSquare size={14} />
                <span>Request Revision</span>
              </button>
              <button
                onClick={() => setApproveDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-98 transition-all"
              >
                <FileCheck size={14} />
                <span>Approve Deliverable</span>
              </button>
            </>
          )}

          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </button>

          <button
            onClick={handleArchiveToggle}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {deliverable.archivedAt ? (
              <>
                <RotateCcw size={14} />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive size={14} />
                <span>Archive</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-900 flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-semibold text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}
              >
                {st.label}
              </span>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-bold text-stone-600">
                Version {deliverable.currentVersion}
              </span>
              {deliverable.milestone && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  Milestone: {deliverable.milestone.title}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#123524]">{deliverable.title}</h1>

            {deliverable.description && (
              <p className="mt-2 text-xs text-[#587061] leading-relaxed max-w-3xl">
                {deliverable.description}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-4 shrink-0 text-xs">
            <div className="rounded-xl border border-emerald-50 bg-[#f7faf7] p-3 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-stone-400">
                Due Date
              </span>
              <p className="mt-0.5 font-semibold text-[#123524]">
                {formatDate(deliverable.dueDate)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-50 bg-[#f7faf7] p-3 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-stone-400">
                Files
              </span>
              <p className="mt-0.5 font-semibold text-[#123524]">
                {deliverable.files.length} attached
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="pt-4 border-t border-emerald-50">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {["draft", "in_progress", "submitted", "approved"].map((step, idx) => {
              const labels: Record<string, string> = {
                draft: "Draft",
                in_progress: "In Progress",
                submitted: "Submitted",
                approved: "Approved",
              };
              const isCurrent = deliverable.status === step;
              const isPast =
                (step === "draft" && deliverable.status !== "draft") ||
                (step === "in_progress" &&
                  ["submitted", "approved", "revision_required"].includes(
                    deliverable.status,
                  )) ||
                (step === "submitted" && deliverable.status === "approved");

              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[#123524] text-lime-300 ring-4 ring-emerald-100"
                          : deliverable.status === "revision_required" &&
                              step === "submitted"
                            ? "bg-amber-500 text-white"
                            : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={15} /> : idx + 1}
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-stone-600">
                    {labels[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Assets & Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Files & Assets */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload Zone */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#123524] flex items-center gap-2">
                  <UploadCloud size={16} className="text-emerald-700" />
                  Deliverable Files & Attachments
                </h3>
                <p className="text-[11px] text-[#587061]">
                  Upload client deliverables, design specs, and documentation (up to 20MB
                  per file).
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-xl bg-lime-300 px-3.5 py-1.5 text-xs font-bold text-[#123524] hover:bg-lime-400 disabled:opacity-50 transition-all"
              >
                Upload File
              </button>
            </div>

            {uploadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploading && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex justify-between text-xs font-semibold text-emerald-900 mb-1.5">
                  <span>Uploading to file storage…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-emerald-200/50 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Drag & drop dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragOver
                  ? "border-emerald-600 bg-emerald-50/50"
                  : "border-stone-200 hover:border-emerald-300 bg-stone-50/30"
              }`}
            >
              <UploadCloud size={24} className="mx-auto text-stone-400 mb-2" />
              <p className="text-xs font-medium text-stone-700">
                Drag and drop files here, or click <strong>Upload File</strong> above.
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                PDF, ZIP, PNG, JPG, MP4, FIG, DOCX up to 20 MB
              </p>
            </div>

            {/* Attached Files List */}
            {deliverable.files.length > 0 ? (
              <div className="divide-y divide-emerald-50 rounded-xl border border-emerald-100 overflow-hidden">
                {deliverable.files.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center justify-between p-3.5 hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                        <FileText size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#123524] truncate">
                          {file.originalFilename}
                        </p>
                        <p className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-emerald-800">
                            Version {file.versionNumber}
                          </span>
                          <span>•</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(file)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 shadow-2xs transition-colors shrink-0"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic text-center py-4">
                No files uploaded to this deliverable yet.
              </p>
            )}
          </div>

          {/* External Links */}
          {deliverable.externalLinks.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#123524] flex items-center gap-2">
                <ExternalLink size={16} className="text-emerald-700" />
                External Deliverable Links
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deliverable.externalLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-emerald-100 bg-[#f7faf7] p-3 text-xs font-semibold text-[#123524] hover:border-emerald-300 hover:bg-white transition-all"
                  >
                    <span className="truncate">{link.title}</span>
                    <ExternalLink size={14} className="text-emerald-700 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Review & Version History Timeline */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#123524] flex items-center gap-2">
              <History size={16} className="text-emerald-700" />
              Review & Version History
            </h3>

            {deliverable.reviews.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
                {deliverable.reviews.map((rev) => (
                  <div key={rev.reviewId} className="relative">
                    <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-700"></div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-bold text-[#123524] capitalize">
                        {rev.action.replace("_", " ")} (Version {rev.versionNumber})
                      </p>
                      <span className="text-[11px] text-[#587061]">
                        {new Date(rev.occurredAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="mt-1 text-xs text-stone-600 bg-stone-50 border border-stone-100 rounded-lg p-2.5">
                        {rev.comment}
                      </p>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">
                      By user: <span className="font-mono">{rev.actorUserId}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">
                No review events logged yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Team & Metadata */}
        <div className="space-y-6">
          {/* Contributors & Reviewers */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123524] flex items-center gap-1.5">
              <Users size={15} className="text-emerald-700" />
              Assigned Team
            </h3>

            {/* Contributors */}
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">
                Contributors ({deliverable.contributors?.length || 0})
              </span>
              <div className="space-y-2">
                {deliverable.contributors && deliverable.contributors.length > 0 ? (
                  deliverable.contributors.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center gap-2.5 rounded-xl border border-emerald-50 bg-[#f7faf7] p-2"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#123524] font-bold text-lime-300 text-[10px]">
                        {(c.name || c.email || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#123524] truncate">
                          {c.name || c.userId}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">{c.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">
                    No contributors assigned
                  </p>
                )}
              </div>
            </div>

            {/* Reviewers */}
            <div className="pt-2 border-t border-emerald-50">
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">
                Reviewers ({deliverable.reviewers?.length || 0})
              </span>
              <div className="space-y-2">
                {deliverable.reviewers && deliverable.reviewers.length > 0 ? (
                  deliverable.reviewers.map((r) => (
                    <div
                      key={r.userId}
                      className="flex items-center gap-2.5 rounded-xl border border-emerald-50 bg-[#f7faf7] p-2"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 font-bold text-white text-[10px]">
                        {(r.name || r.email || "R").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#123524] truncate">
                          {r.name || r.userId}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">{r.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">No reviewers assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123524] mb-3">
              Deliverable Audit Info
            </h3>
            <dl className="divide-y divide-emerald-50 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="text-stone-500">Created On</dt>
                <dd className="font-semibold text-[#123524]">
                  {formatDate(deliverable.createdAt)}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-stone-500">Submitted On</dt>
                <dd className="font-semibold text-[#123524]">
                  {formatDate(deliverable.submittedAt)}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-stone-500">Approved On</dt>
                <dd className="font-semibold text-[#123524]">
                  {formatDate(deliverable.approvedAt)}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-stone-500">Lifecycle Status</dt>
                <dd className="font-semibold text-[#123524] capitalize">
                  {deliverable.archivedAt ? "Archived" : "Active"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Submit for Review Modal */}
      {submitDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#123524]">
              {deliverable.status === "revision_required"
                ? "Resubmit Revised Deliverable"
                : "Submit Deliverable for Review"}
            </h3>
            <p className="mt-1 text-xs text-[#587061]">
              Notify reviewers that your work is ready for client review and sign-off.
            </p>
            <textarea
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
              placeholder="Add submission notes for reviewers (optional)..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-emerald-100 bg-stone-50/50 p-3 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmitDialogOpen(false)}
                disabled={actionSubmitting}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeReviewAction(
                    deliverable.status === "revision_required" ? "resubmit" : "submit",
                    submitComment,
                  )
                }
                disabled={actionSubmitting}
                className="rounded-xl bg-lime-300 px-4 py-2 text-xs font-bold text-[#123524] hover:bg-lime-400 disabled:opacity-50"
              >
                {actionSubmitting ? "Submitting…" : "Confirm Submission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {revisionDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#123524]">Request Revisions</h3>
            <p className="mt-1 text-xs text-[#587061]">
              Provide constructive feedback. The version number will automatically
              increment.
            </p>
            <textarea
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              placeholder="Describe required changes in detail..."
              rows={4}
              required
              className="mt-4 w-full rounded-xl border border-emerald-100 bg-stone-50/50 p-3 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevisionDialogOpen(false)}
                disabled={actionSubmitting}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeReviewAction("request-revision", revisionComment)}
                disabled={actionSubmitting || !revisionComment.trim()}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {actionSubmitting ? "Sending…" : "Request Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#123524]">Approve Deliverable</h3>
            <p className="mt-1 text-xs text-[#587061]">
              Sign off on this deliverable as completed and approved.
            </p>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add sign-off notes or client approval reference (optional)..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-emerald-100 bg-stone-50/50 p-3 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveDialogOpen(false)}
                disabled={actionSubmitting}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeReviewAction("approve", approveComment)}
                disabled={actionSubmitting}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {actionSubmitting ? "Approving…" : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editOpen && (
        <DeliverableFormModal
          workspaceSlug={workspaceSlug}
          mode="edit"
          initialData={{
            _id: deliverable._id,
            projectId: deliverable.projectId,
            milestoneId: deliverable.milestoneId,
            title: deliverable.title,
            description: deliverable.description,
            status: deliverable.status === "archived" ? "draft" : deliverable.status,
            contributorUserIds: deliverable.contributorUserIds,
            reviewerUserIds: deliverable.reviewerUserIds,
            dueDate: deliverable.dueDate,
            externalLinks: deliverable.externalLinks,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setSuccessBanner("Deliverable updated.");
            setTimeout(() => setSuccessBanner(null), 3000);
            setRefreshTrigger((p) => p + 1);
          }}
        />
      )}
    </div>
  );
}
