"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Grid,
  List,
  Calendar,
  AlertCircle,
  Edit2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { TaskFormModal } from "./task-form-modal";
import { TaskDetailModal, type TaskDetailData } from "./task-detail-modal";
import { taskStatuses } from "@/validations/task";

type TaskStats = {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  done: number;
  overdue: number;
};

const columnConfig: Array<{
  id: (typeof taskStatuses)[number];
  title: string;
  dotColor: string;
  badgeBg: string;
}> = [
  {
    id: "todo",
    title: "To Do",
    dotColor: "bg-stone-400",
    badgeBg: "bg-stone-100 text-stone-700",
  },
  {
    id: "in_progress",
    title: "In Progress",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50 text-blue-700",
  },
  {
    id: "in_review",
    title: "In Review",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-50 text-purple-700",
  },
  {
    id: "blocked",
    title: "Blocked",
    dotColor: "bg-red-500",
    badgeBg: "bg-red-50 text-red-700",
  },
  {
    id: "done",
    title: "Done",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-800",
  },
];

const priorityPills: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-sky-100", text: "text-sky-700" },
  high: { bg: "bg-amber-100", text: "text-amber-800" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
};

export function TaskBoard({
  workspaceSlug,
  initialProjectId,
  hideProjectFilter = false,
  hideTitle = false,
}: {
  workspaceSlug: string;
  initialProjectId?: string;
  hideProjectFilter?: boolean;
  hideTitle?: boolean;
}) {
  const [tasks, setTasks] = useState<TaskDetailData[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    inReview: 0,
    blocked: 0,
    done: 0,
    overdue: 0,
  });
  const [projects, setProjects] = useState<
    Array<{ _id: string; name: string; projectCode: string }>
  >([]);
  const [members, setMembers] = useState<
    Array<{ userId: string; name?: string; email?: string }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & Layout State
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(initialProjectId || "");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState<"active" | "archived">("active");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modals
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);
  const [detailTask, setDetailTask] = useState<TaskDetailData | null>(null);
  const [createWithStatus, setCreateWithStatus] = useState<string | undefined>(undefined);

  // Load project & member lookup options
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        const [projRes, membRes] = await Promise.all([
          fetch(`/api/v1/workspaces/${workspaceSlug}/projects?limit=100&view=active`),
          fetch(`/api/v1/workspaces/${workspaceSlug}/members`),
        ]);
        if (projRes.ok && isMounted) {
          const pJson = await projRes.json();
          setProjects(pJson.data?.items || []);
        }
        if (membRes.ok && isMounted) {
          const mJson = await membRes.json();
          setMembers(mJson.data || []);
        }
      } catch (e) {
        console.error("Failed to load task filters lookups:", e);
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug]);

  // Load Tasks inside effect with zero synchronous setState
  useEffect(() => {
    let active = true;

    async function fetchTasks() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: viewMode === "kanban" ? "100" : "20",
          view: viewFilter,
        });

        if (search.trim()) params.set("search", search.trim());
        if (projectFilter) params.set("projectId", projectFilter);
        if (assigneeFilter) params.set("assigneeId", assigneeFilter);
        if (priorityFilter !== "all") params.set("priority", priorityFilter);

        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/tasks?${params.toString()}`,
        );
        const json = await res.json();

        if (!active) return;

        if (!res.ok) {
          setErrorMessage(json.error?.message || "Failed to load tasks.");
          return;
        }

        setTasks(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
        setTotalItems(json.data.total || 0);
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

    fetchTasks();

    return () => {
      active = false;
    };
  }, [
    workspaceSlug,
    page,
    viewMode,
    viewFilter,
    search,
    projectFilter,
    assigneeFilter,
    priorityFilter,
    refreshTrigger,
  ]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? { ...t, status: newStatus as (typeof taskStatuses)[number] }
          : t,
      ),
    );

    try {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/tasks/${taskId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || "Failed to update status.");
        setRefreshTrigger((p) => p + 1);
        return;
      }
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error moving task status.");
      setRefreshTrigger((p) => p + 1);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDragOverColumn(null);
    setDraggedTaskId(null);

    if (taskId && colId) {
      await handleStatusChange(taskId, colId);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      {!hideTitle ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#123524]">
              Tasks & Kanban Board
            </h1>
            <p className="mt-1 text-sm text-[#587061]">
              Track work items, sprint backlog, and deliveries across projects.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedTask(null);
              setCreateWithStatus("todo");
              setFormMode("create");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            <span>New Task</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#123524]">Project Tasks</h2>
            <p className="text-xs text-[#587061]">
              Manage sprint items, deadlines, and progress.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedTask(null);
              setCreateWithStatus("todo");
              setFormMode("create");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2 text-xs font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            <span>New Task</span>
          </button>
        </div>
      )}

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

      {/* Statistics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-stone-500">
            Total
          </span>
          <p className="text-xl font-bold text-[#123524]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-stone-500">
            To Do
          </span>
          <p className="text-xl font-bold text-stone-700">{stats.todo}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-blue-600">
            In Progress
          </span>
          <p className="text-xl font-bold text-blue-700">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-purple-600">
            In Review
          </span>
          <p className="text-xl font-bold text-purple-700">{stats.inReview}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-red-600">
            Blocked
          </span>
          <p className="text-xl font-bold text-red-700">{stats.blocked}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-emerald-700">
            Done
          </span>
          <p className="text-xl font-bold text-emerald-800">{stats.done}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
          <span className="text-[10px] font-semibold uppercase text-red-700">
            Overdue
          </span>
          <p className="text-xl font-bold text-red-700">{stats.overdue}</p>
        </div>
      </div>

      {/* Control Bar & Filter Bar */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Active vs Archived */}
          <div className="flex items-center rounded-xl bg-stone-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => {
                setViewFilter("active");
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                viewFilter === "active"
                  ? "bg-white text-[#123524] shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Active Tasks ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewFilter("archived");
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                viewFilter === "archived"
                  ? "bg-white text-[#123524] shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Archived
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-3 text-stone-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tasks by title or tags…"
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Kanban vs List Switch */}
          <div className="flex items-center gap-1 rounded-xl border border-emerald-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "kanban"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Grid size={15} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <List size={15} />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div
          className={`grid grid-cols-1 ${hideProjectFilter ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3 pt-3 border-t border-emerald-50`}
        >
          {!hideProjectFilter && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    [{p.projectCode}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Assignee
            </label>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              <option value="">All Members</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || m.email || m.userId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Board / List View */}
      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
            <p className="text-sm text-[#587061]">Loading tasks…</p>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {columnConfig.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border transition-all ${
                  isOver
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400"
                    : "border-emerald-100 bg-[#f7faf7]"
                } p-3 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-emerald-100/80">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#123524]">
                      {col.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(null);
                      setCreateWithStatus(col.id);
                      setFormMode("create");
                    }}
                    className="rounded-lg p-1 text-stone-400 hover:bg-white hover:text-stone-700"
                    title={`Add task to ${col.title}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1">
                  {colTasks.map((t) => {
                    const pp = priorityPills[t.priority] || priorityPills.medium;
                    const dueDateFormatted = formatDate(t.dueDate);

                    return (
                      <div
                        key={t._id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, t._id)}
                        onClick={() => setDetailTask(t)}
                        className="group relative cursor-pointer rounded-xl border border-emerald-100/90 bg-white p-3.5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
                      >
                        {/* Drag Handle & Project Badge */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <GripVertical
                              size={13}
                              className="text-stone-300 group-hover:text-stone-500 shrink-0"
                            />
                            {t.project && (
                              <span className="font-mono text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 truncate">
                                {t.project.projectCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${pp.bg} ${pp.text}`}
                            >
                              {t.priority}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-[#123524] line-clamp-2 group-hover:text-emerald-800 transition-colors">
                          {t.title}
                        </h4>

                        {/* Due Date & Overdue Badge */}
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          {dueDateFormatted ? (
                            <span
                              className={`flex items-center gap-1 font-medium ${
                                t.isOverdue
                                  ? "text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded"
                                  : "text-stone-500"
                              }`}
                            >
                              <Calendar size={12} />
                              {dueDateFormatted}
                            </span>
                          ) : (
                            <span className="text-stone-400">No due date</span>
                          )}

                          {/* Assignee Avatar Stack */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {t.assignees && t.assignees.length > 0 ? (
                              t.assignees.slice(0, 2).map((a) => (
                                <div
                                  key={a.userId}
                                  title={a.name || a.email}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#123524] text-[8px] font-bold text-lime-300"
                                >
                                  {(a.name || a.email || "U").slice(0, 2).toUpperCase()}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-stone-300">—</span>
                            )}
                          </div>
                        </div>

                        {/* Quick Move Status Dropdown (Accessible Fallback) */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between"
                        >
                          <span className="text-[10px] text-stone-400 font-medium">
                            Move:
                          </span>
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="text-[10px] font-semibold rounded bg-stone-50 border border-stone-200 px-1.5 py-0.5 text-stone-700 focus:outline-none"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7faf7] text-xs font-semibold uppercase tracking-wider text-[#587061] border-b border-emerald-100">
                <tr>
                  <th className="p-4">Task</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Assignees</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-xs">
                {tasks.map((t) => {
                  const pp = priorityPills[t.priority] || priorityPills.medium;
                  return (
                    <tr
                      key={t._id}
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                      onClick={() => setDetailTask(t)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-[#123524]">{t.title}</div>
                      </td>
                      <td className="p-4">
                        {t.project ? (
                          <span className="font-mono text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                            {t.project.projectCode}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-[#123524] focus:outline-none"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="in_review">In Review</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${pp.bg} ${pp.text}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        {t.dueDate ? (
                          <span
                            className={
                              t.isOverdue
                                ? "text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded"
                                : "text-stone-600"
                            }
                          >
                            {formatDate(t.dueDate)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {t.assignees && t.assignees.length > 0 ? (
                            t.assignees.map((a) => (
                              <div
                                key={a.userId}
                                title={a.name || a.email}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-[#123524] text-[9px] font-bold text-lime-300"
                              >
                                {(a.name || a.email || "U").slice(0, 2).toUpperCase()}
                              </div>
                            ))
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTask(t);
                              setFormMode("edit");
                            }}
                            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            title="Edit Task"
                          >
                            <Edit2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls in List View */}
      {viewMode === "list" && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm text-sm">
          <p className="text-xs text-[#587061]">
            Showing Page <span className="font-bold text-[#123524]">{page}</span> of{" "}
            <span className="font-bold text-[#123524]">{totalPages}</span> ({totalItems}{" "}
            tasks)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 px-3 py-1.5 text-xs font-semibold text-[#123524] hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 px-3 py-1.5 text-xs font-semibold text-[#123524] hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Task Form Modal (Create or Edit) */}
      {formMode && (
        <TaskFormModal
          workspaceSlug={workspaceSlug}
          mode={formMode}
          defaultProjectId={initialProjectId || projectFilter || undefined}
          initialData={
            selectedTask
              ? {
                  _id: selectedTask._id,
                  title: selectedTask.title,
                  description: selectedTask.description,
                  projectId: selectedTask.projectId,
                  status: selectedTask.status,
                  priority: selectedTask.priority,
                  assigneeUserIds: selectedTask.assigneeUserIds,
                  startDate: selectedTask.startDate,
                  dueDate: selectedTask.dueDate,
                  estimatedMinutes: selectedTask.estimatedMinutes,
                  actualMinutes: selectedTask.actualMinutes,
                  progressPercent: selectedTask.progressPercent,
                  tags: selectedTask.tags,
                }
              : createWithStatus
                ? {
                    _id: "",
                    title: "",
                    projectId: "",
                    status: createWithStatus as (typeof taskStatuses)[number],
                    priority: "medium",
                  }
                : undefined
          }
          onClose={() => {
            setFormMode(null);
            setSelectedTask(null);
            setCreateWithStatus(undefined);
          }}
          onSuccess={() => {
            setSuccessBanner(
              formMode === "create"
                ? "Task created successfully."
                : "Task updated successfully.",
            );
            setTimeout(() => setSuccessBanner(null), 3000);
            setRefreshTrigger((p) => p + 1);
          }}
        />
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          workspaceSlug={workspaceSlug}
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onEdit={() => {
            setSelectedTask(detailTask);
            setFormMode("edit");
          }}
          onUpdate={() => {
            setRefreshTrigger((p) => p + 1);
          }}
        />
      )}
    </div>
  );
}
