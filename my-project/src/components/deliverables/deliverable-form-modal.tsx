"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  X,
  AlertCircle,
  Users,
  FolderKanban,
  Calendar,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deliverableInputSchema,
  deliverableStatuses,
  type DeliverableInput,
} from "@/validations/deliverable";

export type DeliverableFormData = {
  _id?: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  status: (typeof deliverableStatuses)[number];
  contributorUserIds: string[];
  reviewerUserIds: string[];
  dueDate?: string;
  externalLinks: Array<{ title: string; url: string }>;
};

type ProjectOption = {
  _id: string;
  name: string;
  projectCode: string;
  status: string;
};

type MilestoneOption = {
  _id: string;
  title: string;
  dueDate: string;
};

type MemberOption = {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
};

interface DeliverableFormModalProps {
  workspaceSlug: string;
  mode: "create" | "edit";
  defaultProjectId?: string;
  initialData?: {
    _id: string;
    projectId: string;
    milestoneId?: string | null;
    title: string;
    description?: string;
    status: (typeof deliverableStatuses)[number];
    contributorUserIds?: string[];
    reviewerUserIds?: string[];
    dueDate?: string | null;
    externalLinks?: Array<{ title: string; url: string }>;
  };
  onClose: () => void;
  onSuccess: (data: unknown) => void;
}

export function DeliverableFormModal({
  workspaceSlug,
  mode,
  defaultProjectId,
  initialData,
  onClose,
  onSuccess,
}: DeliverableFormModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const formatDateForInput = (d?: string | null) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DeliverableFormData>({
    defaultValues: {
      projectId: initialData?.projectId || defaultProjectId || "",
      milestoneId: initialData?.milestoneId || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialData?.status || "draft",
      contributorUserIds: initialData?.contributorUserIds || [],
      reviewerUserIds: initialData?.reviewerUserIds || [],
      dueDate: formatDateForInput(initialData?.dueDate),
      externalLinks: initialData?.externalLinks || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "externalLinks",
  });

  const selectedProjectId = watch("projectId");
  const selectedContributors = watch("contributorUserIds") || [];
  const selectedReviewers = watch("reviewerUserIds") || [];

  // Fetch projects and workspace members
  useEffect(() => {
    let isMounted = true;
    async function fetchLookups() {
      setLoadingLookups(true);
      try {
        const [projectsRes, membersRes] = await Promise.all([
          fetch(`/api/v1/workspaces/${workspaceSlug}/projects?limit=100&view=active`),
          fetch(`/api/v1/workspaces/${workspaceSlug}/members`),
        ]);

        if (projectsRes.ok && isMounted) {
          const projectsJson = await projectsRes.json();
          const pItems: ProjectOption[] = projectsJson.data?.items || [];
          setProjects(pItems);
          if (
            mode === "create" &&
            pItems.length > 0 &&
            !initialData?.projectId &&
            !defaultProjectId
          ) {
            setValue("projectId", pItems[0]._id);
          }
        }

        if (membersRes.ok && isMounted) {
          const membersJson = await membersRes.json();
          setMembers(membersJson.data?.members || []);
        }
      } catch {
        if (isMounted) {
          setApiError("Failed to load project or member details.");
        }
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    }

    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, mode, initialData?.projectId, defaultProjectId, setValue]);

  // Fetch milestones when project selection changes
  useEffect(() => {
    let isMounted = true;
    async function fetchMilestones() {
      if (!selectedProjectId) {
        setMilestones([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects/${selectedProjectId}/milestones?view=active`,
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          setMilestones(json.data?.items || []);
        }
      } catch {
        if (isMounted) setMilestones([]);
      }
    }

    fetchMilestones();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, selectedProjectId]);

  const toggleContributor = (userId: string) => {
    const next = selectedContributors.includes(userId)
      ? selectedContributors.filter((id) => id !== userId)
      : [...selectedContributors, userId];
    setValue("contributorUserIds", next, { shouldValidate: true });
  };

  const toggleReviewer = (userId: string) => {
    const next = selectedReviewers.includes(userId)
      ? selectedReviewers.filter((id) => id !== userId)
      : [...selectedReviewers, userId];
    setValue("reviewerUserIds", next, { shouldValidate: true });
  };

  const onSubmit = async (values: DeliverableFormData) => {
    setApiError(null);
    try {
      const payload: DeliverableInput = {
        projectId: values.projectId,
        milestoneId: values.milestoneId || null,
        title: values.title.trim(),
        description: values.description?.trim() || "",
        status: values.status,
        contributorUserIds: values.contributorUserIds,
        reviewerUserIds: values.reviewerUserIds,
        dueDate: values.dueDate ? new Date(values.dueDate) : null,
        externalLinks: values.externalLinks.filter((l) => l.title && l.url),
      };

      const parseResult = deliverableInputSchema.safeParse(payload);
      if (!parseResult.success) {
        setApiError(parseResult.error.issues[0].message);
        return;
      }

      const url =
        mode === "create"
          ? `/api/v1/workspaces/${workspaceSlug}/deliverables`
          : `/api/v1/workspaces/${workspaceSlug}/deliverables/${initialData?._id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message || "Failed to save deliverable.");
        return;
      }

      onSuccess(json.data);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error saving deliverable.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-50 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#123524]">
              {mode === "create" ? "Create Deliverable" : "Edit Deliverable"}
            </h2>
            <p className="text-xs text-[#587061]">
              Work packages, client sign-offs, and file attachments.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {apiError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle size={16} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* Project & Milestone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
                Project *
              </label>
              <div className="relative">
                <select
                  {...register("projectId", { required: "Project is required" })}
                  disabled={loadingLookups || mode === "edit"}
                  className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      [{p.projectCode}] {p.name}
                    </option>
                  ))}
                </select>
                <FolderKanban
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-3 text-stone-400"
                />
              </div>
              {errors.projectId && (
                <p className="mt-1 text-[11px] text-red-600">
                  {errors.projectId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
                Linked Milestone (Optional)
              </label>
              <select
                {...register("milestoneId")}
                className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
              >
                <option value="">No milestone linked</option>
                {milestones.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
              Deliverable Title *
            </label>
            <input
              type="text"
              {...register("title", {
                required: "Deliverable title is required",
                maxLength: { value: 200, message: "Max 200 characters" },
              })}
              placeholder="e.g. Brand Identity Guidelines & Asset Kit"
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
            {errors.title && (
              <p className="mt-1 text-[11px] text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
              Description / Scope Details
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Detail what is included in this submission, expectations, and instructions for reviewers..."
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 p-3.5 text-xs text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Due Date & Initial Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
                Due Date (Optional)
              </label>
              <div className="relative">
                <input
                  type="date"
                  {...register("dueDate")}
                  className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
                <Calendar
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-3 text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1">
                Status
              </label>
              <select
                {...register("status")}
                disabled={mode === "edit"}
                className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                {deliverableStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contributors & Reviewers Assignment */}
          <div className="space-y-4 pt-2">
            {/* Contributors */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1 flex items-center gap-1.5">
                <Users size={14} className="text-emerald-700" />
                Assign Contributors (Authors & Uploaders)
              </label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-100 bg-[#f7faf7] p-2.5 max-h-32 overflow-y-auto">
                {members.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">
                    No workspace members found
                  </span>
                ) : (
                  members.map((m) => {
                    const isSelected = selectedContributors.includes(m.userId);
                    return (
                      <button
                        type="button"
                        key={m.userId}
                        onClick={() => toggleContributor(m.userId)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-[#123524] text-white shadow-xs"
                            : "bg-white text-stone-700 border border-emerald-100 hover:border-emerald-300"
                        }`}
                      >
                        {m.name || m.email || m.userId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Reviewers */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#123524] mb-1 flex items-center gap-1.5">
                <Users size={14} className="text-emerald-700" />
                Assign Reviewers (Approvers & Sign-offs)
              </label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-100 bg-[#f7faf7] p-2.5 max-h-32 overflow-y-auto">
                {members.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">
                    No workspace members found
                  </span>
                ) : (
                  members.map((m) => {
                    const isSelected = selectedReviewers.includes(m.userId);
                    return (
                      <button
                        type="button"
                        key={m.userId}
                        onClick={() => toggleReviewer(m.userId)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-emerald-700 text-white shadow-xs"
                            : "bg-white text-stone-700 border border-emerald-100 hover:border-emerald-300"
                        }`}
                      >
                        {m.name || m.email || m.userId}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#123524] flex items-center gap-1.5">
                <LinkIcon size={14} className="text-emerald-700" />
                External Deliverable Links (Figma, GitHub, Loom, Staging)
              </label>
              <button
                type="button"
                onClick={() => append({ title: "", url: "" })}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Plus size={12} />
                Add Link
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    {...register(`externalLinks.${idx}.title` as const)}
                    placeholder="Link Label (e.g. Figma Prototype)"
                    className="w-1/3 rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <input
                    type="url"
                    {...register(`externalLinks.${idx}.url` as const)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-emerald-50 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-lime-300 px-6 py-2.5 text-xs font-bold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving…"
                : mode === "create"
                  ? "Create Deliverable"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
