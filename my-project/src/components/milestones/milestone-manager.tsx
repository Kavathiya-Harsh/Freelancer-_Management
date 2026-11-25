"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Edit2,
  RotateCcw,
  Milestone,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  milestoneInputSchema,
  milestoneStatuses,
  type MilestoneInput,
} from "@/validations/milestone";

export type MilestoneItem = {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "upcoming" | "in_progress" | "completed";
  computedStatus: (typeof milestoneStatuses)[number];
  isOverdue?: boolean;
  dueDate: string;
  completedAt?: string | null;
  completedByUserId?: string | null;
  order: number;
  targetAmountMinor: number;
  currency: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type MilestoneStats = {
  total: number;
  completed: number;
  upcoming: number;
  inProgress: number;
  overdue: number;
  percentage: number;
};

type FormValues = {
  title: string;
  description?: string;
  dueDate: string;
  status: "upcoming" | "in_progress" | "completed";
  order: number;
  targetMajor: number;
  currency: string;
};

export function MilestoneManager({
  workspaceSlug,
  projectId,
  hideBreadcrumb = false,
}: {
  workspaceSlug: string;
  projectId: string;
  hideBreadcrumb?: boolean;
}) {
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [stats, setStats] = useState<MilestoneStats>({
    total: 0,
    completed: 0,
    upcoming: 0,
    inProgress: 0,
    overdue: 0,
    percentage: 0,
  });
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  // Fetch project details for breadcrumb
  useEffect(() => {
    let isMounted = true;
    async function fetchProject() {
      try {
        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          setProjectName(json.data?.name || "Project");
          setProjectCode(json.data?.projectCode || "");
        }
      } catch (err) {
        console.error("Failed to load project info for milestone view:", err);
      }
    }
    fetchProject();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, projectId]);

  // Fetch milestones inside effect with zero synchronous setState
  useEffect(() => {
    let active = true;

    async function fetchMilestones() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones?${params.toString()}`,
        );
        const json = await res.json();

        if (!active) return;

        if (!res.ok) {
          setErrorMessage(json.error?.message || "Failed to load milestones.");
          return;
        }

        setMilestones(json.data.items || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : "Error connecting to server.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchMilestones();

    return () => {
      active = false;
    };
  }, [workspaceSlug, projectId, statusFilter, refreshTrigger]);

  const handleCompleteToggle = async (m: MilestoneItem) => {
    const isCompleted = m.status === "completed";
    const endpoint = isCompleted ? "reopen" : "complete";

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${m._id}/${endpoint}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || `Failed to update milestone.`);
        return;
      }
      setSuccessBanner(
        isCompleted
          ? `Milestone "${m.title}" reopened.`
          : `Milestone "${m.title}" marked as completed!`,
      );
      setTimeout(() => setSuccessBanner(null), 3000);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating milestone state.",
      );
    }
  };

  const openCreateModal = () => {
    setSelectedMilestone(null);
    reset({
      title: "",
      description: "",
      dueDate: "",
      status: "upcoming",
      order: milestones.length + 1,
      targetMajor: 0,
      currency: "USD",
    });
    setApiError(null);
    setModalMode("create");
  };

  const openEditModal = (m: MilestoneItem) => {
    setSelectedMilestone(m);
    reset({
      title: m.title,
      description: m.description || "",
      dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "",
      status: m.status,
      order: m.order ?? 0,
      targetMajor: (m.targetAmountMinor || 0) / 100,
      currency: m.currency || "USD",
    });
    setApiError(null);
    setModalMode("edit");
  };

  const onSubmitForm = async (values: FormValues) => {
    setApiError(null);
    try {
      const targetAmountMinor = Math.round(Number(values.targetMajor || 0) * 100);
      const payload: MilestoneInput = {
        title: values.title.trim(),
        description: values.description?.trim() || "",
        dueDate: new Date(values.dueDate),
        status: values.status,
        order: Number(values.order) || 0,
        targetAmountMinor,
        currency: values.currency || "USD",
      };

      const parseResult = milestoneInputSchema.safeParse(payload);
      if (!parseResult.success) {
        setApiError(parseResult.error.issues[0].message);
        return;
      }

      const url =
        modalMode === "create"
          ? `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones`
          : `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${selectedMilestone?._id}`;

      const res = await fetch(url, {
        method: modalMode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message || "Failed to save milestone.");
        return;
      }

      setSuccessBanner(
        modalMode === "create" ? "Milestone created successfully." : "Milestone updated.",
      );
      setTimeout(() => setSuccessBanner(null), 3000);
      setModalMode(null);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error saving milestone.");
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (minor: number, curr = "USD") => {
    const major = minor / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(major);
  };

  const milestoneStatusBadge = (m: MilestoneItem) => {
    if (m.status === "completed") {
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          Completed
        </span>
      );
    }
    if (m.isOverdue) {
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
          Overdue
        </span>
      );
    }
    if (m.status === "in_progress") {
      return (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          In Progress
        </span>
      );
    }
    return (
      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
        Upcoming
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header / Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideBreadcrumb ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/w/${workspaceSlug}/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#123524] shadow-sm hover:bg-stone-50 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Project
            </Link>
            <span className="text-stone-300">/</span>
            {projectCode && (
              <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                {projectCode}
              </span>
            )}
            <span className="text-xs font-medium text-stone-600 truncate max-w-xs">
              {projectName}
            </span>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-[#123524]">Project Milestones</h2>
            <p className="text-xs text-[#587061]">
              Billing checkpoints, phased deliverables, and progress tracking.
            </p>
          </div>
        )}

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setRefreshTrigger((p) => p + 1);
            }}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-900 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Progress & Overview Card */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#123524]">Project Milestones</h1>
            <p className="mt-1 text-sm text-[#587061]">
              Manage checkpoints, delivery phases, and client sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-black text-[#123524]">
                {stats.percentage}%
              </span>
              <p className="text-xs text-[#587061]">Milestones Completed</p>
            </div>
            <div className="w-32 h-3 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Counts strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-emerald-50 text-xs">
          <div>
            <span className="text-stone-400 font-medium">Total</span>
            <p className="text-lg font-bold text-[#123524]">{stats.total}</p>
          </div>
          <div>
            <span className="text-stone-400 font-medium">Completed</span>
            <p className="text-lg font-bold text-emerald-800">{stats.completed}</p>
          </div>
          <div>
            <span className="text-stone-400 font-medium">In Progress</span>
            <p className="text-lg font-bold text-blue-700">{stats.inProgress}</p>
          </div>
          <div>
            <span className="text-stone-400 font-medium">Upcoming</span>
            <p className="text-lg font-bold text-stone-600">{stats.upcoming}</p>
          </div>
          <div>
            <span className="text-stone-400 font-medium">Overdue</span>
            <p className="text-lg font-bold text-red-700">{stats.overdue}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", "in_progress", "upcoming", "completed", "overdue"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
              statusFilter === st
                ? "bg-[#123524] text-white shadow-sm"
                : "bg-white text-stone-600 border border-emerald-100 hover:bg-stone-50"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Milestone List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
            <p className="text-sm text-[#587061]">Loading milestones…</p>
          </div>
        </div>
      ) : milestones.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-12 text-center">
          <Milestone className="mx-auto h-12 w-12 text-emerald-200 mb-3" />
          <h3 className="text-lg font-bold text-[#123524]">No milestones found</h3>
          <p className="mt-1 text-sm text-[#587061] max-w-md mx-auto">
            {statusFilter !== "all"
              ? "No milestones match the selected filter."
              : "Define project delivery milestones and financial targets to track progress."}
          </p>
          {statusFilter === "all" && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 text-sm font-semibold text-[#123524] shadow-sm hover:bg-lime-400"
            >
              <Plus size={16} />
              Add your first milestone
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, idx) => (
            <div
              key={m._id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => handleCompleteToggle(m)}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                    m.status === "completed"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-white hover:border-emerald-600"
                  }`}
                  title={
                    m.status === "completed" ? "Reopen Milestone" : "Mark as Completed"
                  }
                >
                  {m.status === "completed" && <CheckCircle2 size={16} />}
                </button>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-stone-400">
                      #{m.order || idx + 1}
                    </span>
                    <h3
                      className={`text-base font-bold ${
                        m.status === "completed"
                          ? "line-through text-stone-400"
                          : "text-[#123524]"
                      }`}
                    >
                      {m.title}
                    </h3>
                    {milestoneStatusBadge(m)}
                  </div>

                  {m.description && (
                    <p className="mt-1 text-xs text-[#587061] leading-relaxed max-w-xl">
                      {m.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-700" />
                      Due:{" "}
                      <strong className="text-stone-700">{formatDate(m.dueDate)}</strong>
                    </span>

                    {m.targetAmountMinor > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-[#123524]">
                        <DollarSign size={13} className="text-emerald-700" />
                        Target: {formatCurrency(m.targetAmountMinor, m.currency)}
                      </span>
                    )}

                    {m.completedAt && (
                      <span className="text-emerald-800 font-medium">
                        Completed on {formatDate(m.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCompleteToggle(m)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    m.status === "completed"
                      ? "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      : "bg-[#123524] text-white hover:bg-emerald-900"
                  }`}
                >
                  {m.status === "completed" ? (
                    <span className="flex items-center gap-1">
                      <RotateCcw size={13} />
                      Reopen
                    </span>
                  ) : (
                    "Mark Complete"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(m)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"
                  title="Edit Milestone"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Milestone Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-emerald-100">
            <button
              onClick={() => setModalMode(null)}
              type="button"
              className="absolute right-5 top-5 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-[#123524] mb-1">
              {modalMode === "create" ? "Add Milestone" : "Edit Milestone"}
            </h2>
            <p className="text-xs text-[#587061] mb-5">
              Specify delivery expectations and financial milestones.
            </p>

            {apiError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[#123524] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("title", { required: "Milestone title is required" })}
                  placeholder="e.g. Design Approval & Figma Delivery"
                  className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
                {errors.title && (
                  <p className="mt-1 text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#123524] mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("dueDate", { required: "Due date is required" })}
                  className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
                {errors.dueDate && (
                  <p className="mt-1 text-red-600">{errors.dueDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[#123524] mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-2 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#123524] mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register("order", { valueAsNumber: true })}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-2 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold uppercase text-[#123524] mb-1">
                    Target Budget (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("targetMajor", { valueAsNumber: true })}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-2 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#123524] mb-1">
                    Currency
                  </label>
                  <select
                    {...register("currency")}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-2 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#123524] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  {...register("description")}
                  placeholder="Key milestones deliverables…"
                  className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#123524] px-5 py-2 font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving…" : "Save Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
