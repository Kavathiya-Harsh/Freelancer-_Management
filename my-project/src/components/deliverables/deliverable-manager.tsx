"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Grid,
  List,
  Calendar,
  AlertCircle,
  PackageCheck,
  FileText,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { DeliverableFormModal } from "./deliverable-form-modal";
import { deliverableStatuses, type DeliverableStatus } from "@/validations/deliverable";

export type DeliverableListItem = {
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
  fileCount: number;
  linkCount: number;
  createdAt: string;
  updatedAt: string;
  project?: {
    _id: string;
    name: string;
    projectCode: string;
  } | null;
};

type DeliverableStats = {
  total: number;
  draft: number;
  inProgress: number;
  submitted: number;
  approved: number;
  revisionRequired: number;
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

export function DeliverableManager({
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
  const [deliverables, setDeliverables] = useState<DeliverableListItem[]>([]);
  const [stats, setStats] = useState<DeliverableStats>({
    total: 0,
    draft: 0,
    inProgress: 0,
    submitted: 0,
    approved: 0,
    revisionRequired: 0,
  });
  const [projects, setProjects] = useState<
    Array<{ _id: string; name: string; projectCode: string }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(initialProjectId || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState<"active" | "archived">("active");
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate" | "title" | "status">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Load project options for filtering
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/projects?limit=100&view=active`,
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          setProjects(json.data?.items || []);
        }
      } catch {
        // Ignored
      }
    }
    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [workspaceSlug]);

  // Load deliverables
  useEffect(() => {
    let isMounted = true;

    async function fetchDeliverables() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (projectFilter) params.set("projectId", projectFilter);
        if (search.trim()) params.set("search", search.trim());
        params.set("view", viewFilter);
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        params.set("page", page.toString());
        params.set("limit", "12");

        const res = await fetch(
          `/api/v1/workspaces/${workspaceSlug}/deliverables?${params.toString()}`,
        );
        const json = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setErrorMessage(json.error?.message || "Failed to load deliverables.");
          return;
        }

        setDeliverables(json.data.items || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
        if (json.data.pagination) {
          setTotalPages(json.data.pagination.totalPages);
          setTotalItems(json.data.pagination.total);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Error connecting to server.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDeliverables();
    return () => {
      isMounted = false;
    };
  }, [
    workspaceSlug,
    projectFilter,
    statusFilter,
    viewFilter,
    search,
    sortBy,
    sortOrder,
    page,
    refreshTrigger,
  ]);

  const [now] = useState(() => Date.now());

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (d?: string | null, status?: string) => {
    if (!d || status === "approved") return false;
    return new Date(d).getTime() < now;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideTitle ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#123524]">
              Deliverables & Files
            </h1>
            <p className="mt-1 text-sm text-[#587061]">
              Manage client work packages, file versioning, review submissions, and
              approvals.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-2.5 font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-98 transition-all"
          >
            <Plus size={18} />
            <span>New Deliverable</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#123524]">Project Deliverables</h2>
            <p className="text-xs text-[#587061]">
              Review files, asset handoffs, and sign-offs for this project.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2 text-xs font-semibold text-[#123524] shadow-sm hover:bg-lime-400 active:scale-98 transition-all"
          >
            <Plus size={16} />
            <span>New Deliverable</span>
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
              setRefreshTrigger((p) => p + 1);
            }}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-900 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-stone-500">
            Total
          </span>
          <p className="text-xl font-bold text-[#123524]">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-stone-500">
            Drafts
          </span>
          <p className="text-xl font-bold text-stone-600">{stats.draft}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-blue-600">
            In Progress
          </span>
          <p className="text-xl font-bold text-blue-700">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-purple-600">
            Submitted
          </span>
          <p className="text-xl font-bold text-purple-700">{stats.submitted}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-amber-700">
            Needs Revision
          </span>
          <p className="text-xl font-bold text-amber-800">{stats.revisionRequired}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-emerald-700">
            Approved
          </span>
          <p className="text-xl font-bold text-emerald-800">{stats.approved}</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs space-y-3">
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
                  ? "bg-white text-[#123524] shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Active ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewFilter("archived");
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                viewFilter === "archived"
                  ? "bg-white text-[#123524] shadow-xs"
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
              placeholder="Search deliverables by title…"
              className="w-full rounded-xl border border-emerald-100 bg-stone-50/50 pl-9 pr-3.5 py-2 text-xs text-[#123524] placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-emerald-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "grid"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Grid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "table"
                  ? "bg-[#123524] text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div
          className={`grid grid-cols-1 ${
            hideProjectFilter ? "sm:grid-cols-2" : "sm:grid-cols-3"
          } gap-3 pt-3 border-t border-emerald-50`}
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
              {deliverableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#587061] mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as "createdAt" | "dueDate" | "title" | "status",
                  );
                  setPage(1);
                }}
                className="flex-1 rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs text-[#123524] focus:border-emerald-600 focus:bg-white focus:outline-none"
              >
                <option value="createdAt">Date Created</option>
                <option value="dueDate">Due Date</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                className="rounded-xl border border-emerald-100 bg-stone-50/50 px-3 py-1.5 text-xs font-bold text-[#123524] hover:bg-white"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-emerald-100 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-[#123524]"></div>
            <p className="text-xs text-[#587061]">Loading deliverables…</p>
          </div>
        </div>
      ) : deliverables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-12 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-emerald-700 mb-3" />
          <h3 className="text-base font-bold text-[#123524]">No deliverables found</h3>
          <p className="mt-1 text-xs text-[#587061] max-w-sm mx-auto">
            {search || statusFilter !== "all" || projectFilter
              ? "No deliverables match your search filters."
              : "Create deliverables to organize work items, upload review assets, and request client sign-offs."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-lime-300 px-4 py-2 text-xs font-bold text-[#123524] shadow-xs hover:bg-lime-400 transition-all"
          >
            <Plus size={16} />
            <span>Create Deliverable</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((d) => {
            const st = statusConfig[d.status] || statusConfig.draft;
            const overdue = isOverdue(d.dueDate, d.status);
            return (
              <Link
                key={d._id}
                href={`/w/${workspaceSlug}/deliverables/${d._id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Project Tag & Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {d.project ? (
                      <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 truncate max-w-[130px]">
                        [{d.project.projectCode}] {d.project.name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">Project</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-600">
                        v{d.currentVersion}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${st.bg} ${st.text} ${st.border}`}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-[#123524] group-hover:text-emerald-800 transition-colors line-clamp-2">
                    {d.title}
                  </h3>

                  {/* Description preview */}
                  {d.description && (
                    <p className="mt-1 text-xs text-[#587061] line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center gap-1 text-[11px]"
                      title="Attached Files"
                    >
                      <FileText size={13} className="text-emerald-700" />
                      {d.fileCount}
                    </span>
                    {d.linkCount > 0 && (
                      <span
                        className="flex items-center gap-1 text-[11px]"
                        title="External Links"
                      >
                        <LinkIcon size={13} className="text-sky-700" />
                        {d.linkCount}
                      </span>
                    )}
                  </div>

                  {d.dueDate ? (
                    <span
                      className={`flex items-center gap-1 text-[11px] font-medium ${
                        overdue ? "text-red-600 font-bold" : "text-stone-500"
                      }`}
                    >
                      <Calendar size={13} />
                      {formatDate(d.dueDate)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-400">No deadline</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f7faf7] text-[11px] font-bold uppercase tracking-wider text-[#587061] border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-3.5">Deliverable</th>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Version</th>
                  <th className="px-4 py-3.5">Assets</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-stone-700">
                {deliverables.map((d) => {
                  const st = statusConfig[d.status] || statusConfig.draft;
                  const overdue = isOverdue(d.dueDate, d.status);
                  return (
                    <tr key={d._id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#123524] max-w-xs truncate">
                        <Link
                          href={`/w/${workspaceSlug}/deliverables/${d._id}`}
                          className="hover:underline"
                        >
                          {d.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600 truncate max-w-[150px]">
                        {d.project ? `[${d.project.projectCode}] ${d.project.name}` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${st.bg} ${st.text} ${st.border}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-stone-600">
                        v{d.currentVersion}
                      </td>
                      <td className="px-4 py-3.5 text-stone-500">
                        {d.fileCount} {d.fileCount === 1 ? "file" : "files"}
                        {d.linkCount > 0 && ` • ${d.linkCount} links`}
                      </td>
                      <td className="px-4 py-3.5">
                        {d.dueDate ? (
                          <span
                            className={
                              overdue ? "text-red-600 font-bold" : "text-stone-600"
                            }
                          >
                            {formatDate(d.dueDate)}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/w/${workspaceSlug}/deliverables/${d._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-4 py-3 text-xs text-stone-600 shadow-xs">
          <span>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (
            {totalItems} deliverables)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-emerald-100 p-1.5 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-emerald-100 p-1.5 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <DeliverableFormModal
          workspaceSlug={workspaceSlug}
          mode="create"
          defaultProjectId={initialProjectId}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setSuccessBanner("Deliverable created successfully.");
            setTimeout(() => setSuccessBanner(null), 3000);
            setRefreshTrigger((p) => p + 1);
          }}
        />
      )}
    </div>
  );
}
