"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  Grid,
  List,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  Archive,
  RotateCcw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { ProjectFormModal } from "./project-form-modal";

export type ProjectItem = {
  _id: string;
  projectCode: string;
  name: string;
  description?: string;
  clientId: string;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  budgetMinor: number;
  currency: string;
  minorUnit: number;
  startDate?: string | null;
  dueDate?: string | null;
  progressPercent: number;
  memberUserIds: string[];
  tags: string[];
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    _id: string;
    name: string;
    companyName?: string;
    status: string;
  } | null;
  members?: Array<{
    userId: string;
    name?: string;
    email?: string;
    image?: string | null;
  }>;
};

type ProjectStats = {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
  planning: number;
  archived: number;
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
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

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-sky-100", text: "text-sky-700" },
  high: { bg: "bg-amber-100", text: "text-amber-800" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
};

export function ProjectManager({ workspaceSlug }: { workspaceSlug: string }) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    onHold: 0,
    planning: 0,
    archived: 0,
  });
  const [clients, setClients] = useState<Array<{ _id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<"active" | "archived">("active");
  const [sortField, setSortField] = useState("recently_created");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  // Load clients once for filter dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadClientOptions() {
      try {
        const res = await fetch(`/api/v1/workspaces/${workspaceSlug}/clients?limit=100`);
        if (res.ok && isMounted) {
          const json = await res.json();
          setClients(json.data?.items || []);
        }
      } catch (e) {
        console.error("Failed to load clients filter:", e);
      }
    }
    loadClientOptions();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug]);

  // Fetch projects inside effect with zero synchronous setState
  useEffect(() => {
    let active = true;

    async function fetchProjects() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
          sort: sortField,
          view: viewFilter,
          stats: "true",
        });

        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (priorityFilter !== "all") params.set("priority", priorityFilter);
        if (clientFilter) params.set("clientId", clientFilter);

        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects?${params.toString()}`,
        );
        const json = await res.json();

        if (!active) return;

        if (!res.ok) {
          setErrorMessage(json.error?.message || "Failed to load projects.");
          return;
        }

        setProjects(json.data.items || []);
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

    fetchProjects();

    return () => {
      active = false;
    };
  }, [
    workspaceSlug,
    page,
    sortField,
    viewFilter,
    search,
    statusFilter,
    priorityFilter,
    clientFilter,
    refreshTrigger,
  ]);

  const handleArchiveToggle = async (project: ProjectItem) => {
    const isArchiving = !project.archivedAt;
    const action = isArchiving ? "archive" : "restore";
    const confirmMessage = isArchiving
      ? `Are you sure you want to archive project "${project.name}"?`
      : `Restore project "${project.name}" to active status?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/v1/workspaces/${workspaceSlug}/projects/${project._id}/${action}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message || `Failed to ${action} project.`);
        setLoading(false);
        return;
      }
      setSuccessBanner(
        isArchiving
          ? `Project "${project.name}" archived.`
          : `Project "${project.name}" restored.`,
      );
      setTimeout(() => setSuccessBanner(null), 4000);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to perform action.");
      setLoading(false);
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
    if (!dateStr) return "Not set";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#123524]">Projects</h1>
          <p className="mt-1 text-sm text-[#587061]">
            Plan, track, and manage client projects and team deliveries.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedProject(null);
            setModalMode("create");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      {/* Success & Error Banners */}
      {successBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
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
              setRefreshTrigger((prev) => prev + 1);
            }}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-900 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#587061]">
              Total Projects
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
              <FolderKanban size={18} />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-[#123524]">{stats.total}</p>
          <p className="mt-1 text-xs text-[#587061]">Active in workspace</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              In Progress
            </span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-900">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{stats.inProgress}</p>
          <p className="mt-1 text-xs text-emerald-700">Active development</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
              Completed
            </span>
            <div className="rounded-xl bg-green-50 p-2 text-green-800">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-900">{stats.completed}</p>
          <p className="mt-1 text-xs text-green-700">Delivered successfully</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              On Hold
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-800">
              <PauseCircle size={18} />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-900">{stats.onHold}</p>
          <p className="mt-1 text-xs text-amber-700">Pending client input</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4">
        {/* Top bar: View Tabs + Search + Layout Switch */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Active vs Archived segmented control */}
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
              Active Projects ({stats.total})
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
              Archived ({stats.archived})
            </button>
          </div>

          {/* Search Box */}
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
              placeholder="Search by project name, code (PRJ-101), or tags…"
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2 text-sm text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Grid vs Table view switch */}
          <div className="flex items-center gap-1 rounded-xl border border-emerald-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              className={`rounded-lg p-1.5 transition-colors ${
                layoutMode === "grid"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("table")}
              className={`rounded-lg p-1.5 transition-colors ${
                layoutMode === "table"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Bottom bar: Dropdown Filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 border-t border-emerald-50">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Client
            </label>
            <select
              value={clientFilter}
              onChange={(e) => {
                setClientFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Sort By
            </label>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              <option value="recently_created">Recently Created</option>
              <option value="name">Project Name (A-Z)</option>
              <option value="deadline">Deadline (Earliest)</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
            <p className="text-sm text-[#587061]">Loading projects…</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-emerald-200 mb-3" />
          <h3 className="text-lg font-bold text-[#123524]">No projects found</h3>
          <p className="mt-1 text-sm text-[#587061] max-w-md mx-auto">
            {search || statusFilter !== "all" || priorityFilter !== "all" || clientFilter
              ? "No projects match the current search filters. Try adjusting or clearing your filters."
              : viewFilter === "archived"
                ? "No archived projects in this workspace."
                : "Get started by creating your first project with client budget and assignments."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {search ||
            statusFilter !== "all" ||
            priorityFilter !== "all" ||
            clientFilter ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setClientFilter("");
                  setPage(1);
                }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Clear all filters
              </button>
            ) : viewFilter === "active" ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(null);
                  setModalMode("create");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 text-sm font-semibold text-[#123524] shadow-sm hover:bg-lime-400"
              >
                <Plus size={16} />
                Create your first project
              </button>
            ) : null}
          </div>
        </div>
      ) : layoutMode === "grid" ? (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const sc = statusColors[p.status] || statusColors.planning;
            const pc = priorityColors[p.priority] || priorityColors.medium;
            return (
              <div
                key={p._id}
                className="group relative flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Code & Priority Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold tracking-wider text-[#123524] bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                      {p.projectCode}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${pc.bg} ${pc.text}`}
                      >
                        {p.priority}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${sc.bg} ${sc.text} ${sc.border}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Project Title */}
                  <h3 className="mt-3 text-lg font-bold text-[#123524] group-hover:text-emerald-800 transition-colors line-clamp-1">
                    <Link
                      href={`/w/${workspaceSlug}/projects/${p._id}`}
                      className="hover:underline flex items-center justify-between"
                    >
                      <span>{p.name}</span>
                      <ExternalLink
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-700"
                      />
                    </Link>
                  </h3>

                  {/* Client Info */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#587061]">
                    <Building2 size={14} className="shrink-0 text-emerald-700" />
                    <span className="font-medium text-stone-700 truncate">
                      {p.client?.name || "No Client Assigned"}
                    </span>
                    {p.client?.companyName && (
                      <span className="text-stone-400 truncate">
                        • {p.client.companyName}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500 font-medium">Progress</span>
                      <span className="font-bold text-[#123524]">
                        {p.progressPercent}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget & Due Date */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                        Budget
                      </span>
                      <span className="font-bold text-[#123524]">
                        {formatCurrency(p.budgetMinor, p.currency, p.minorUnit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                        Deadline
                      </span>
                      <span className="font-medium text-stone-700 flex items-center gap-1">
                        <Calendar size={12} className="text-emerald-700" />
                        {formatDate(p.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Assigned Members & Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-emerald-50 pt-3">
                  {/* Team Members */}
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {p.members && p.members.length > 0 ? (
                      p.members.slice(0, 3).map((m) => (
                        <div
                          key={m.userId}
                          title={m.name || m.email || m.userId}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#123524] text-[10px] font-bold text-lime-300"
                        >
                          {(m.name || m.email || "U").slice(0, 2).toUpperCase()}
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-stone-400">Unassigned</span>
                    )}
                    {p.members && p.members.length > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-[10px] font-bold text-stone-600">
                        +{p.members.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(p);
                        setModalMode("edit");
                      }}
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                      title="Edit Project"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveToggle(p)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        p.archivedAt
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : "text-stone-400 hover:bg-stone-100 hover:text-amber-700"
                      }`}
                      title={p.archivedAt ? "Restore Project" : "Archive Project"}
                    >
                      {p.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}
                    </button>
                  </div>
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
                  <th className="p-4">Project</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4">Budget</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4">Team</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {projects.map((p) => {
                  const sc = statusColors[p.status] || statusColors.planning;
                  const pc = priorityColors[p.priority] || priorityColors.medium;
                  return (
                    <tr key={p._id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-stone-500">
                            {p.projectCode}
                          </span>
                          <Link
                            href={`/w/${workspaceSlug}/projects/${p._id}`}
                            className="font-semibold text-[#123524] hover:underline"
                          >
                            {p.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-stone-700">
                          {p.client?.name || "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${sc.bg} ${sc.text} ${sc.border}`}
                        >
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${pc.bg} ${pc.text}`}
                        >
                          {p.priority}
                        </span>
                      </td>
                      <td className="p-4 w-32">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-stone-700">
                            {p.progressPercent}%
                          </span>
                          <div className="h-1.5 w-full rounded-full bg-stone-100">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-[#123524]">
                        {formatCurrency(p.budgetMinor, p.currency, p.minorUnit)}
                      </td>
                      <td className="p-4 text-xs text-stone-600">
                        {formatDate(p.dueDate)}
                      </td>
                      <td className="p-4">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {p.members && p.members.length > 0 ? (
                            p.members.slice(0, 3).map((m) => (
                              <div
                                key={m.userId}
                                title={m.name || m.email || m.userId}
                                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#123524] text-[9px] font-bold text-lime-300"
                              >
                                {(m.name || m.email || "U").slice(0, 2).toUpperCase()}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProject(p);
                              setModalMode("edit");
                            }}
                            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            title="Edit Project"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveToggle(p)}
                            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                            title={p.archivedAt ? "Restore" : "Archive"}
                          >
                            {p.archivedAt ? (
                              <RotateCcw size={15} />
                            ) : (
                              <Archive size={15} />
                            )}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm text-sm">
          <p className="text-xs text-[#587061]">
            Showing Page <span className="font-bold text-[#123524]">{page}</span> of{" "}
            <span className="font-bold text-[#123524]">{totalPages}</span> ({totalItems}{" "}
            projects)
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

      {/* Project Form Modal (Create or Edit) */}
      {modalMode && (
        <ProjectFormModal
          workspaceSlug={workspaceSlug}
          mode={modalMode}
          initialData={
            selectedProject
              ? {
                  _id: selectedProject._id,
                  name: selectedProject.name,
                  projectCode: selectedProject.projectCode,
                  clientId: selectedProject.clientId,
                  description: selectedProject.description,
                  status: selectedProject.status,
                  priority: selectedProject.priority,
                  budgetMinor: selectedProject.budgetMinor,
                  currency: selectedProject.currency,
                  minorUnit: selectedProject.minorUnit,
                  startDate: selectedProject.startDate,
                  dueDate: selectedProject.dueDate,
                  progressPercent: selectedProject.progressPercent,
                  memberUserIds: selectedProject.memberUserIds,
                  tags: selectedProject.tags,
                }
              : undefined
          }
          onClose={() => {
            setModalMode(null);
            setSelectedProject(null);
          }}
          onSuccess={() => {
            setSuccessBanner(
              modalMode === "create"
                ? "Project created successfully."
                : "Project updated successfully.",
            );
            setTimeout(() => setSuccessBanner(null), 4000);
            setLoading(true);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
