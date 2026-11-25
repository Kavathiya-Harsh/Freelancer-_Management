"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  FolderKanban,
  Edit2,
  Archive,
  RotateCcw,
  Tag,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { taskStatuses, taskPriorities } from "@/validations/task";

export type TaskDetailData = {
  _id: string;
  title: string;
  description?: string;
  projectId: string;
  status: (typeof taskStatuses)[number];
  priority: (typeof taskPriorities)[number];
  assigneeUserIds: string[];
  reporterUserId: string;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number;
  actualMinutes?: number;
  progressPercent?: number;
  tags?: string[];
  completedAt?: string | null;
  completedByUserId?: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
  project?: {
    _id: string;
    name: string;
    projectCode: string;
    status: string;
  } | null;
  assignees?: Array<{
    userId: string;
    name?: string;
    email?: string;
    image?: string | null;
  }>;
};

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  todo: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-300" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_review: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  blocked: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  done: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-sky-100", text: "text-sky-700" },
  high: { bg: "bg-amber-100", text: "text-amber-800" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
};

interface TaskDetailModalProps {
  workspaceSlug: string;
  task: TaskDetailData;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({
  workspaceSlug,
  task,
  onClose,
  onEdit,
  onUpdate,
}: TaskDetailModalProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/tasks/${task._id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to update status.");
        return;
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleArchiveToggle = async () => {
    const isArchiving = !task.archivedAt;
    const action = isArchiving ? "archive" : "restore";
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/tasks/${task._id}/${action}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || `Failed to ${action} task.`);
        return;
      }
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform action.");
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

  const sc = statusStyles[task.status] || statusStyles.todo;
  const pc = priorityStyles[task.priority] || priorityStyles.medium;

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

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {task.project && (
            <Link
              href={`/w/${workspaceSlug}/projects/${task.project._id}`}
              className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-[#123524] hover:bg-stone-200 transition-colors"
            >
              <FolderKanban size={13} />
              <span>
                [{task.project.projectCode}] {task.project.name}
              </span>
            </Link>
          )}

          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${pc.bg} ${pc.text}`}
          >
            {task.priority} Priority
          </span>

          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${sc.bg} ${sc.text} ${sc.border}`}
          >
            {task.status.replace("_", " ")}
          </span>

          {task.isOverdue && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              Overdue
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[#123524] mb-3">{task.title}</h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Description */}
        <div className="rounded-xl border border-emerald-50 bg-[#f7faf7] p-4 text-sm text-[#123524] leading-relaxed mb-6">
          {task.description ? (
            <p className="whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="italic text-stone-400">No task description provided.</p>
          )}
        </div>

        {/* Status Quick Updater */}
        <div className="mb-6 rounded-xl border border-emerald-100 p-4 bg-white">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#587061] mb-2">
            Move Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {taskStatuses.map((st) => (
              <button
                key={st}
                type="button"
                disabled={updatingStatus || task.status === st}
                onClick={() => handleStatusChange(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  task.status === st
                    ? "bg-[#123524] text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                } disabled:opacity-50`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
          {/* Dates */}
          <div className="rounded-xl border border-emerald-100 p-3.5 space-y-2">
            <p className="font-semibold uppercase text-[#587061] text-[10px] tracking-wider">
              Timeline & Schedule
            </p>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Start Date:</span>
              <span className="font-medium text-[#123524] flex items-center gap-1">
                <Calendar size={13} className="text-emerald-700" />
                {formatDate(task.startDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Due Date:</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  task.isOverdue ? "text-red-700" : "text-[#123524]"
                }`}
              >
                <Calendar size={13} />
                {formatDate(task.dueDate)}
              </span>
            </div>
            {task.completedAt && (
              <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-emerald-800">
                <span>Completed:</span>
                <span className="font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {formatDate(task.completedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Time Tracking */}
          <div className="rounded-xl border border-emerald-100 p-3.5 space-y-2">
            <p className="font-semibold uppercase text-[#587061] text-[10px] tracking-wider">
              Time Tracking
            </p>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Estimated:</span>
              <span className="font-medium text-[#123524] flex items-center gap-1">
                <Clock size={13} className="text-emerald-700" />
                {task.estimatedMinutes ? `${task.estimatedMinutes} min` : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Actual Spent:</span>
              <span className="font-medium text-[#123524]">
                {task.actualMinutes ? `${task.actualMinutes} min` : "0 min"}
              </span>
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#587061] mb-2">
            Assignees ({task.assignees?.length || 0})
          </label>
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((a) => (
                <div
                  key={a.userId}
                  className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-1.5 text-xs text-[#123524]"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#123524] text-[9px] font-bold text-lime-300">
                    {(a.name || a.email || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium">{a.name || a.email || a.userId}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-stone-400">No assignees selected.</p>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#587061] mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600"
                >
                  <Tag size={11} className="text-stone-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
          <button
            type="button"
            onClick={handleArchiveToggle}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
          >
            {task.archivedAt ? <RotateCcw size={14} /> : <Archive size={14} />}
            <span>{task.archivedAt ? "Restore Task" : "Archive Task"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#123524] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors"
            >
              <Edit2 size={13} />
              <span>Edit Task</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
