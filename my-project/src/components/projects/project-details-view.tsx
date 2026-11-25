"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Edit2,
  Archive,
  RotateCcw,
  AlertCircle,
  Tag,
  Activity,
  Receipt,
} from "lucide-react";
import { ProjectFormModal } from "./project-form-modal";
import { projectPriorities, projectStatuses } from "@/validations/project";
import { TaskBoard } from "@/components/tasks/task-board";
import { MilestoneManager } from "@/components/milestones/milestone-manager";
import { DeliverableManager } from "@/components/deliverables/deliverable-manager";

export type ProjectDetailData = {
  _id: string;
  projectCode: string;
  name: string;
  description?: string;
  clientId: string;
  status: (typeof projectStatuses)[number];
  priority: (typeof projectPriorities)[number];
  budgetMinor: number;
  currency: string;
  minorUnit: number;
  startDate?: string | null;
  dueDate?: string | null;
  progressPercent: number;
  memberUserIds: string[];
  tags: string[];
  createdByUserId: string;
  updatedByUserId: string;
  archivedAt?: string | null;
  archivedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    _id: string;
    name: string;
    companyName?: string;
    email?: string;
    phone?: string;
    status: string;
  } | null;
  members?: Array<{
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

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  planning: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  in_progress: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  on_hold: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  cancelled: {
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200",
  },
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-sky-100", text: "text-sky-700" },
  high: { bg: "bg-amber-100", text: "text-amber-800" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
};

export function ProjectDetailsView({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId: string;
}) {
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "milestones" | "deliverables" | "invoices"
  >("overview");

  useEffect(() => {
    let active = true;

    async function fetchProject() {
      try {
        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        );
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json.error?.message || "Failed to load project details.");
          return;
        }
        setProject(json.data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Network error loading project.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchProject();

    return () => {
      active = false;
    };
  }, [workspaceSlug, projectId, refreshTrigger]);

  const updateStatus = async (newStatus: string) => {
    if (!project) return;
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to update project status.");
        return;
      }
      setSuccessBanner(`Status updated to ${newStatus.replace("_", " ")}.`);
      setTimeout(() => setSuccessBanner(null), 3000);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const updatePriority = async (newPriority: string) => {
    if (!project) return;
    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: newPriority }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to update project priority.");
        return;
      }
      setSuccessBanner(`Priority updated to ${newPriority}.`);
      setTimeout(() => setSuccessBanner(null), 3000);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update priority.");
    }
  };

  const handleArchiveToggle = async () => {
    if (!project) return;
    const isArchiving = !project.archivedAt;
    const action = isArchiving ? "archive" : "restore";
    const confirmed = window.confirm(
      isArchiving
        ? "Are you sure you want to archive this project?"
        : "Are you sure you want to restore this project to active?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/${action}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || `Failed to ${action} project.`);
        return;
      }
      setSuccessBanner(isArchiving ? "Project has been archived." : "Project restored.");
      setTimeout(() => setSuccessBanner(null), 4000);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform action.");
    }
  };

  const formatCurrency = (minor: number, curr = "USD", minorUnit = 2) => {
    const major = minor / Math.pow(10, minorUnit);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(major);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not specified";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
          <p className="text-sm text-[#587061]">Loading project details…</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link
          href={`/w/${workspaceSlug}/projects`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#123524] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-600 mb-2" />
          <h3 className="text-lg font-bold text-red-900">Project Not Found</h3>
          <p className="mt-1 text-sm text-red-700">
            {error || "Unable to display this project."}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setRefreshTrigger((p) => p + 1);
            }}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sc = statusStyles[project.status] || statusStyles.planning;
  const pc = priorityStyles[project.priority] || priorityStyles.medium;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/w/${workspaceSlug}/projects`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#123524] shadow-sm hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft size={14} />
            Projects
          </Link>
          <span className="text-stone-300">/</span>
          <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            {project.projectCode}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Quick Changer */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#587061] font-medium hidden sm:inline">
              Status:
            </span>
            <select
              value={project.status}
              onChange={(e) => updateStatus(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize focus:outline-none ${sc.bg} ${sc.text} ${sc.border}`}
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Quick Changer */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#587061] font-medium hidden sm:inline">
              Priority:
            </span>
            <select
              value={project.priority}
              onChange={(e) => updatePriority(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize focus:outline-none ${pc.bg} ${pc.text}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Edit Project Button */}
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#123524] shadow-sm hover:bg-emerald-50 transition-colors"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </button>

          {/* Archive / Restore Button */}
          <button
            onClick={handleArchiveToggle}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              project.archivedAt
                ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {project.archivedAt ? (
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

      {/* Success Notification */}
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

      {/* Archive Warning Banner if project is archived */}
      {project.archivedAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-amber-700 shrink-0" />
            <span>
              This project was archived on {formatDate(project.archivedAt)}. It is
              read-only until restored.
            </span>
          </div>
          <button
            onClick={handleArchiveToggle}
            className="rounded-lg bg-amber-200/80 px-3 py-1 font-semibold text-amber-950 hover:bg-amber-300"
          >
            Restore Project
          </button>
        </div>
      )}

      {/* Project Title Header Box */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded border border-stone-200">
              {project.projectCode}
            </span>
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${sc.bg} ${sc.text} ${sc.border}`}
            >
              {project.status.replace("_", " ")}
            </span>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${pc.bg} ${pc.text}`}
            >
              {project.priority} Priority
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[#123524] mt-1">
            {project.name}
          </h1>

          {project.description ? (
            <p className="mt-2 text-sm text-[#587061] leading-relaxed max-w-3xl">
              {project.description}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-stone-400">
              No project description provided.
            </p>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600"
                >
                  <Tag size={11} className="text-stone-400" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Client Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#587061] font-semibold uppercase tracking-wider mb-2">
            <span>Client</span>
            <Building2 size={16} className="text-emerald-700" />
          </div>
          {project.client ? (
            <div>
              <p className="text-base font-bold text-[#123524]">{project.client.name}</p>
              {project.client.companyName && (
                <p className="text-xs text-[#587061]">{project.client.companyName}</p>
              )}
              {project.client.email && (
                <p className="mt-2 text-xs text-stone-500 truncate">
                  {project.client.email}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-stone-400">No client details</p>
          )}
        </div>

        {/* Budget Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#587061] font-semibold uppercase tracking-wider mb-2">
            <span>Budget</span>
            <DollarSign size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-[#123524]">
            {formatCurrency(project.budgetMinor, project.currency, project.minorUnit)}
          </p>
          <p className="mt-1 text-xs text-[#587061]">
            Currency: <span className="font-mono font-semibold">{project.currency}</span>
          </p>
        </div>

        {/* Timeline & Deadline */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#587061] font-semibold uppercase tracking-wider mb-2">
            <span>Deadline</span>
            <Calendar size={16} className="text-emerald-700" />
          </div>
          <p className="text-lg font-bold text-[#123524]">
            {formatDate(project.dueDate)}
          </p>
          <p className="mt-1 text-xs text-[#587061]">
            Started: {formatDate(project.startDate)}
          </p>
        </div>

        {/* Progress Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#587061] font-semibold uppercase tracking-wider mb-2">
            <span>Progress</span>
            <span className="font-bold text-[#123524]">{project.progressPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${Math.min(100, project.progressPercent)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#587061]">Manual progress tracking</p>
        </div>
      </div>

      {/* Navigation Tabs (Overview, Tasks, Milestones, Deliverables, Invoices) */}
      <div className="border-b border-emerald-100">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-[#123524] text-[#123524]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Overview & Team
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "tasks"
                ? "border-[#123524] text-[#123524]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "milestones"
                ? "border-[#123524] text-[#123524]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>Milestones</span>
          </button>
          <button
            onClick={() => setActiveTab("deliverables")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "deliverables"
                ? "border-[#123524] text-[#123524]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>Deliverables</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "invoices"
                ? "border-[#123524] text-[#123524]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>Invoices</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
              Phase 6
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Team & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Members Card */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#123524] flex items-center gap-2">
                  <Users size={18} className="text-emerald-800" />
                  Assigned Team Members ({project.members?.length || 0})
                </h3>
              </div>
              {project.members && project.members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center gap-3 rounded-xl border border-emerald-50 bg-[#f7faf7] p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#123524] font-bold text-lime-300 text-xs">
                        {(m.name || m.email || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#123524] truncate">
                          {m.name || m.userId}
                        </p>
                        <p className="text-[11px] text-[#587061] truncate">
                          {m.email || m.userId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">
                  No workspace members assigned to this project yet. Use Edit to assign
                  members.
                </p>
              )}
            </div>

            {/* Real Activity Timeline */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#123524] flex items-center gap-2 mb-4">
                <Activity size={18} className="text-emerald-800" />
                Project Activity Log
              </h3>
              {project.activities && project.activities.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
                  {project.activities.map((act) => (
                    <div key={act._id} className="relative">
                      <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-700"></div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-bold text-[#123524] capitalize">
                          Project {act.action}
                        </p>
                        <span className="text-[11px] text-[#587061]">
                          {new Date(act.occurredAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        By user: <span className="font-mono">{act.actorUserId}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No activity recorded yet.</p>
              )}
            </div>
          </div>

          {/* Right Column: Metadata & Audit info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#123524] uppercase tracking-wider mb-4">
                Project Audit Info
              </h3>
              <dl className="divide-y divide-emerald-50 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#587061]">Created On</dt>
                  <dd className="font-semibold text-[#123524]">
                    {formatDate(project.createdAt)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#587061]">Created By</dt>
                  <dd className="font-mono text-stone-600 truncate max-w-[120px]">
                    {project.createdByUserId}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#587061]">Last Updated</dt>
                  <dd className="font-semibold text-[#123524]">
                    {formatDate(project.updatedAt)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#587061]">Workspace Isolation</dt>
                  <dd className="font-mono text-emerald-800 font-semibold">
                    Scraped & Scoped
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#587061]">Lifecycle Status</dt>
                  <dd className="font-semibold text-[#123524] capitalize">
                    {project.archivedAt ? "Archived" : "Active"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Project Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="pt-2">
          <TaskBoard
            workspaceSlug={workspaceSlug}
            initialProjectId={projectId}
            hideProjectFilter
            hideTitle
          />
        </div>
      )}

      {/* Project Milestones Tab */}
      {activeTab === "milestones" && (
        <div className="pt-2">
          <MilestoneManager
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            hideBreadcrumb
          />
        </div>
      )}

      {/* Project Deliverables Tab */}
      {activeTab === "deliverables" && (
        <div className="pt-2">
          <DeliverableManager
            workspaceSlug={workspaceSlug}
            initialProjectId={projectId}
            hideProjectFilter
            hideTitle
          />
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-emerald-700 mb-3" />
          <h3 className="text-lg font-bold text-[#123524]">Invoices & Billing</h3>
          <p className="mt-1 text-sm text-[#587061] max-w-md mx-auto">
            Generate project invoices, track payments, and review client statements in
            Phase 6.
          </p>
          <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
            Coming Soon — Phase 06
          </span>
        </div>
      )}

      {/* Edit Project Modal */}
      {editOpen && (
        <ProjectFormModal
          workspaceSlug={workspaceSlug}
          mode="edit"
          initialData={{
            _id: project._id,
            name: project.name,
            projectCode: project.projectCode,
            clientId: project.clientId,
            description: project.description,
            status: project.status,
            priority: project.priority,
            budgetMinor: project.budgetMinor,
            currency: project.currency,
            minorUnit: project.minorUnit,
            startDate: project.startDate,
            dueDate: project.dueDate,
            progressPercent: project.progressPercent,
            memberUserIds: project.memberUserIds,
            tags: project.tags,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setSuccessBanner("Project updated successfully.");
            setTimeout(() => setSuccessBanner(null), 3000);
            setLoading(true);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
