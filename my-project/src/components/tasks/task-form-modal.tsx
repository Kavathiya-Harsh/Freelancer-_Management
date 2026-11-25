"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { X, AlertCircle, Users, FolderKanban, Clock, Plus } from "lucide-react";
import {
  taskInputSchema,
  taskPriorities,
  taskStatuses,
  type TaskInput,
} from "@/validations/task";

export type TaskFormData = {
  _id?: string;
  title: string;
  description?: string;
  projectId: string;
  status: (typeof taskStatuses)[number];
  priority: (typeof taskPriorities)[number];
  assigneeUserIds: string[];
  startDate?: string;
  dueDate?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  progressPercent: number;
  tagsString: string;
};

type ProjectOption = {
  _id: string;
  name: string;
  projectCode: string;
  status: string;
};

type MemberOption = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  role?: string;
};

interface TaskFormModalProps {
  workspaceSlug: string;
  mode: "create" | "edit";
  defaultProjectId?: string;
  initialData?: {
    _id: string;
    title: string;
    description?: string;
    projectId: string;
    status: (typeof taskStatuses)[number];
    priority: (typeof taskPriorities)[number];
    assigneeUserIds?: string[];
    startDate?: string | null;
    dueDate?: string | null;
    estimatedMinutes?: number;
    actualMinutes?: number;
    progressPercent?: number;
    tags?: string[];
  };
  onClose: () => void;
  onSuccess: (data: unknown) => void;
}

export function TaskFormModal({
  workspaceSlug,
  mode,
  defaultProjectId,
  initialData,
  onClose,
  onSuccess,
}: TaskFormModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
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
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      projectId: initialData?.projectId || defaultProjectId || "",
      status: initialData?.status || "todo",
      priority: initialData?.priority || "medium",
      assigneeUserIds: initialData?.assigneeUserIds || [],
      startDate: formatDateForInput(initialData?.startDate),
      dueDate: formatDateForInput(initialData?.dueDate),
      estimatedMinutes: initialData?.estimatedMinutes ?? 0,
      actualMinutes: initialData?.actualMinutes ?? 0,
      progressPercent: initialData?.progressPercent ?? 0,
      tagsString: initialData?.tags?.join(", ") || "",
    },
  });

  const selectedAssigneeIds = watch("assigneeUserIds") || [];

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
          setMembers(membersJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load task form lookups:", err);
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    }

    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, mode, initialData?.projectId, defaultProjectId, setValue]);

  const toggleAssignee = (userId: string) => {
    const current = selectedAssigneeIds;
    if (current.includes(userId)) {
      setValue(
        "assigneeUserIds",
        current.filter((id) => id !== userId),
      );
    } else {
      setValue("assigneeUserIds", [...current, userId]);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    setApiError(null);
    try {
      const tags = data.tagsString
        ? data.tagsString
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload: TaskInput = {
        title: data.title.trim(),
        description: data.description?.trim() || "",
        projectId: data.projectId,
        status: data.status,
        priority: data.priority,
        assigneeUserIds: data.assigneeUserIds || [],
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedMinutes: Number(data.estimatedMinutes) || 0,
        actualMinutes: Number(data.actualMinutes) || 0,
        progressPercent: Number(data.progressPercent) || 0,
        tags,
      };

      const parseResult = taskInputSchema.safeParse(payload);
      if (!parseResult.success) {
        setApiError(parseResult.error.issues[0].message);
        return;
      }

      const url =
        mode === "create"
          ? `/api/v1/workspaces/${workspaceSlug}/tasks`
          : `/api/v1/workspaces/${workspaceSlug}/tasks/${initialData?._id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error?.message || "Failed to save task.");
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
            {mode === "create" ? "Create New Task" : "Edit Task"}
          </h2>
          <p className="mt-1 text-sm text-[#587061]">
            {mode === "create"
              ? "Add a task to a project and assign workspace members."
              : "Update task details, deadline, priority, or assigned members."}
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
            Loading workspace projects and team members…
          </div>
        ) : projects.length === 0 && mode === "create" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-amber-700 mb-2" />
            <h3 className="text-lg font-semibold text-amber-900">
              Active Project Required
            </h3>
            <p className="mt-1 text-sm text-amber-800 max-w-md mx-auto">
              Every task must belong to an active project. Create a project before adding
              tasks.
            </p>
            <div className="mt-5">
              <Link
                href={`/w/${workspaceSlug}/projects`}
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl bg-[#123524] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"
              >
                <Plus size={16} />
                Go to Projects
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Task Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                {...register("title", { required: "Task title is required" })}
                placeholder="e.g. Implement user authentication flow"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Project Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                Project <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  {...register("projectId", { required: "Project is required" })}
                  disabled={Boolean(defaultProjectId && mode === "create")}
                  className="w-full appearance-none rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-75"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      [{p.projectCode}] {p.name}
                    </option>
                  ))}
                </select>
                <FolderKanban
                  size={16}
                  className="pointer-events-none absolute right-3.5 top-3 text-stone-400"
                />
              </div>
              {errors.projectId && (
                <p className="mt-1 text-xs text-red-600">{errors.projectId.message}</p>
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
                placeholder="Details, acceptance criteria, or technical notes…"
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
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
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

            {/* Dates: Start Date & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Start Date
                </label>
                <input
                  type="date"
                  {...register("startDate")}
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Due Date (Deadline)
                </label>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Time Estimates (Minutes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Estimated Time (Minutes)
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                    <Clock size={16} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    {...register("estimatedMinutes", { valueAsNumber: true })}
                    placeholder="e.g. 120"
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524]">
                  Actual Time Spent (Minutes)
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                    <Clock size={16} />
                  </div>
                  <input
                    type="number"
                    min="0"
                    {...register("actualMinutes", { valueAsNumber: true })}
                    placeholder="e.g. 60"
                    className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2.5 text-sm text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Workspace Members Assignment */}
            {members.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#123524] mb-1.5">
                  Assignees ({selectedAssigneeIds.length} selected)
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-emerald-100 bg-stone-50/50">
                  {members.map((m) => {
                    const isSelected = selectedAssigneeIds.includes(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleAssignee(m.userId)}
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
                placeholder="e.g. Frontend, Auth, Bug"
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
                    ? "Creating Task…"
                    : "Saving Changes…"
                  : mode === "create"
                    ? "Create Task"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
