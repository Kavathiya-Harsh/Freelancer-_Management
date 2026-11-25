"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { X, AlertCircle, Users, Building2, DollarSign, Plus } from "lucide-react";
import {
  projectInputSchema,
  projectPriorities,
  projectStatuses,
  type ProjectInput,
} from "@/validations/project";

export type ProjectFormData = {
  _id?: string;
  name: string;
  projectCode?: string;
  clientId: string;
  description?: string;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  budgetMajor: number;
  currency: string;
  startDate?: string;
  dueDate?: string;
  progressPercent: number;
  memberUserIds: string[];
  tagsString: string;
};

type ClientOption = {
  _id: string;
  name: string;
  companyName?: string;
  status: string;
};

type MemberOption = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  role?: string;
};

interface ProjectFormModalProps {
  workspaceSlug: string;
  mode: "create" | "edit";
  initialData?: {
    _id: string;
    name: string;
    projectCode: string;
    clientId: string;
    description?: string;
    status: (typeof projectStatuses)[number];
    priority: (typeof projectPriorities)[number];
    budgetMinor: number;
    currency: string;
    minorUnit: number;
    startDate?: string | null;
    dueDate?: string | null;
    progressPercent: number;
    memberUserIds?: string[];
    tags?: string[];
  };
  onClose: () => void;
  onSuccess: (data: unknown) => void;
}

export function ProjectFormModal({
  workspaceSlug,
  mode,
  initialData,
  onClose,
  onSuccess,
}: ProjectFormModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Convert minor unit to major (e.g. 150000 -> 1500.00)
  const initialBudgetMajor = initialData
    ? initialData.budgetMinor / Math.pow(10, initialData.minorUnit ?? 2)
    : 0;

  const formatDateForInput = (d?: string | null) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    defaultValues: {
      name: initialData?.name || "",
      projectCode: initialData?.projectCode || "",
      clientId: initialData?.clientId || "",
      description: initialData?.description || "",
      status: initialData?.status || "planning",
      priority: initialData?.priority || "medium",
      budgetMajor: initialBudgetMajor,
      currency: initialData?.currency || "USD",
      startDate: formatDateForInput(initialData?.startDate),
      dueDate: formatDateForInput(initialData?.dueDate),
      progressPercent: initialData?.progressPercent ?? 0,
      memberUserIds: initialData?.memberUserIds || [],
      tagsString: initialData?.tags?.join(", ") || "",
    },
  });

  const selectedMemberIds = watch("memberUserIds") || [];
  const currentProgress = watch("progressPercent") || 0;

  useEffect(() => {
    let isMounted = true;
    async function fetchLookups() {
      setLoadingLookups(true);
      try {
        const [clientsRes, membersRes] = await Promise.all([
          fetch(`/api/v1/workspaces/${workspaceSlug}/clients?limit=100`),
          fetch(`/api/v1/workspaces/${workspaceSlug}/members`),
        ]);

        if (clientsRes.ok && isMounted) {
          const clientsJson = await clientsRes.json();
          const items: ClientOption[] = clientsJson.data?.items || [];
          setClients(items.filter((c) => c.status === "active"));
          // If creating and clients available, preselect first client
          if (mode === "create" && items.length > 0 && !initialData?.clientId) {
            setValue("clientId", items[0]._id);
          }
        }

        if (membersRes.ok && isMounted) {
          const membersJson = await membersRes.json();
          setMembers(membersJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load project form lookups:", err);
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    }

    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, mode, initialData?.clientId, setValue]);

  const toggleMember = (userId: string) => {
    const current = selectedMemberIds;
    if (current.includes(userId)) {
      setValue(
        "memberUserIds",
        current.filter((id) => id !== userId),
      );
    } else {
      setValue("memberUserIds", [...current, userId]);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    setApiError(null);
    try {
      const minorUnit = 2;
      const budgetMinor = Math.round(
        Number(data.budgetMajor || 0) * Math.pow(10, minorUnit),
      );

      const tags = data.tagsString
        ? data.tagsString
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload: ProjectInput = {
        name: data.name.trim(),
        projectCode: data.projectCode?.trim() || undefined,
        clientId: data.clientId,
        description: data.description?.trim() || "",
        status: data.status,
        priority: data.priority,
        budgetMinor,
        currency: (data.currency || "USD").toUpperCase(),
        minorUnit,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        progressPercent: Number(data.progressPercent) || 0,
        memberUserIds: data.memberUserIds || [],
        tags,
      };

      const parseResult = projectInputSchema.safeParse(payload);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        setApiError(firstIssue.message);
        return;
      }

      const url =
        mode === "create"
          ? `/api/v1/workspaces/${workspaceSlug}/projects`
          : `/api/v1/workspaces/${workspaceSlug}/projects/${initialData?._id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message || "Failed to save project.");
        return;
      }

      onSuccess(json.data);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-5 top-5 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#123524]">
            {mode === "create" ? "Create New Project" : "Edit Project"}
          </h2>
          <p className="mt-1 text-sm text-[#587061]">
            {mode === "create"
              ? "Set up a new client project with budget, timeline, and team members."
              : "Update project information, timeline, budget, and assignments."}
          </p>
        </div>

        {apiError && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span>{apiError}</span>
          </div>
        )}

        {loadingLookups ? (
          <div className="py-12 text-center text-sm text-[#587061]">
            Loading workspace clients and team members…
          </div>
        ) : clients.length === 0 && mode === "create" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
            <Building2 className="mx-auto h-10 w-10 text-amber-700 mb-2" />
            <h3 className="text-lg font-semibold text-amber-900">
              Active Client Required
            </h3>
            <p className="mt-1 text-sm text-amber-800 max-w-md mx-auto">
              You must have at least one active client before creating a project. Projects
              must be associated with a client.
            </p>
            <div className="mt-5">
              <Link
                href={`/w/${workspaceSlug}/clients`}
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl bg-[#123524] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"
              >
                <Plus size={16} />
                Go to Client Management
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Project Name & Project Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name", { required: "Project name is required" })}
                  placeholder="e.g. Website Redesign & SEO"
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Project Code
                </label>
                <input
                  {...register("projectCode")}
                  placeholder="Auto (e.g. PRJ-101)"
                  className="mt-1.5 w-full uppercase rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <p className="mt-1 text-[11px] text-[#587061]">
                  Leave blank to auto-generate
                </p>
              </div>
            </div>

            {/* Client Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                Client <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  {...register("clientId", { required: "Client selection is required" })}
                  className="w-full appearance-none rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ""}
                    </option>
                  ))}
                </select>
                <Building2
                  size={16}
                  className="pointer-events-none absolute right-3.5 top-3 text-stone-400"
                />
              </div>
              {errors.clientId && (
                <p className="mt-1 text-xs text-red-600">{errors.clientId.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Key objectives, scope, or delivery details…"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Status
                </label>
                <select
                  {...register("status")}
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Priority
                </label>
                <select
                  {...register("priority")}
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Budget & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Budget
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                    <DollarSign size={16} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("budgetMajor", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Currency
                </label>
                <select
                  {...register("currency")}
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            {/* Dates: Start Date & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Start Date
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="date"
                    {...register("startDate")}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Deadline (Due Date)
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="date"
                    {...register("dueDate")}
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Progress ({currentProgress}%)
                </label>
                <span className="text-xs font-bold text-emerald-800">
                  {currentProgress}% Completed
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                {...register("progressPercent", { valueAsNumber: true })}
                className="mt-2 w-full accent-emerald-700 cursor-pointer"
              />
            </div>

            {/* Workspace Members Assignment */}
            {members.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524] mb-1.5">
                  Assigned Team Members ({selectedMemberIds.length} assigned)
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-emerald-100 bg-stone-50/50">
                  {members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleMember(m.userId)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-[#123524] text-white shadow-sm"
                            : "bg-white text-stone-600 border border-emerald-100 hover:border-emerald-300"
                        }`}
                      >
                        <Users size={12} />
                        <span>{m.name || m.email || m.userId}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                Tags (comma-separated)
              </label>
              <input
                {...register("tagsString")}
                placeholder="e.g. Design, Mobile, Q3-Priority"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#123524] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? mode === "create"
                    ? "Creating Project…"
                    : "Saving Changes…"
                  : mode === "create"
                    ? "Create Project"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
