"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Receipt,
  WalletCards,
  Search,
  Settings,
  UserRound,
  Users,
  X,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { BrandLogo } from "@/components/ui/brand-logo";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  lifecycle: "active" | "archived" | "unprovisioned";
};

const navigation = [
  { label: "Overview", segment: "dashboard", icon: LayoutDashboard },
  { label: "Clients", segment: "clients", icon: Users },
  { label: "Projects", segment: "projects", icon: FolderKanban },
  { label: "Tasks", segment: "tasks", icon: CheckSquare },
  { label: "Deliverables", segment: "deliverables", icon: PackageCheck },
  { label: "Invoices", segment: "invoices", icon: Receipt },
  { label: "Payments", segment: "payments", icon: WalletCards },
  { label: "Reports", segment: "reports", icon: BarChart3 },
] as const;

export function AppShell({
  workspaceSlug,
  workspaceName,
  workspaceRole,
  userName,
  children,
}: {
  workspaceSlug: string;
  workspaceName: string;
  workspaceRole: string;
  userName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceError, setWorkspaceError] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/workspaces", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok) setWorkspaces(payload.data ?? []);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setProfileOpen(false);
        setWorkspaceOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function switchWorkspace(workspace: Workspace) {
    setWorkspaceOpen(false);
    setWorkspaceError("");
    try {
      const response = await fetch(
        `/api/v1/workspaces/${encodeURIComponent(workspace.slug)}/select`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Unable to switch workspace.");
      router.push(`/w/${workspace.slug}/dashboard`);
      router.refresh();
    } catch (cause) {
      setWorkspaceError(
        cause instanceof Error ? cause.message : "Unable to switch workspace.",
      );
    }
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = search.trim().toLowerCase();
    if (!query) return;
    const match = navigation.find(
      (item) => item.label.toLowerCase().includes(query) || item.segment.includes(query),
    );
    if (match) router.push(`/w/${workspaceSlug}/${match.segment}`);
    else
      router.push(
        `/w/${workspaceSlug}/projects?search=${encodeURIComponent(search.trim())}`,
      );
  }

  const currentLabel =
    navigation.find(
      (item) =>
        pathname === `/w/${workspaceSlug}/${item.segment}` ||
        pathname.startsWith(`/w/${workspaceSlug}/${item.segment}/`),
    )?.label ?? "Workspace";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center px-5">
        <BrandLogo size="md" subtitle="Business Workspace" theme="dark" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Workspace navigation">
        {navigation.map((item) => {
          const href = `/w/${workspaceSlug}/${item.segment}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.segment}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-lime-300 text-[#102B22]"
                  : "text-emerald-100 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href={`/w/${workspaceSlug}/settings`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-100 hover:bg-white/8 hover:text-white"
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8F5]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-[#102B22] lg:block">
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-[#102B22]/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[#102B22] shadow-2xl">
            <button
              aria-label="Close navigation"
              className="absolute right-3 top-5 z-10 rounded-lg p-2 text-emerald-100"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[#E4E9E3] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            className="rounded-xl border border-[#E4E9E3] p-2 text-[#153D2E] lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden min-w-44 sm:block">
            <p className="text-xs text-[#707A73]">Workspace</p>
            <p className="truncate text-sm font-semibold text-[#19251F]">
              {currentLabel}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707A73]"
              size={17}
            />
            <form onSubmit={submitSearch}>
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workspace"
                aria-label="Search workspace"
                className="h-10 w-full rounded-xl border border-[#E4E9E3] bg-[#F7F8F5] pl-10 pr-14 text-sm outline-none focus:border-[#25865A] focus:ring-3 focus:ring-emerald-100"
              />
            </form>
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[#E4E9E3] bg-white px-1.5 py-0.5 text-[10px] text-[#707A73] sm:block">
              Ctrl K
            </kbd>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-2 rounded-xl border border-[#E4E9E3] p-1.5 pr-2"
              aria-expanded={profileOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-[#153D2E]">
                {(userName || "U").charAt(0).toUpperCase()}
              </span>
              <ChevronDown size={15} className="hidden text-[#707A73] sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-[#E4E9E3] bg-white p-2 shadow-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-[#19251F]">
                    {userName || "User"}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-[#707A73]">
                    {workspaceRole}
                  </p>
                </div>
                <Link
                  href={`/w/${workspaceSlug}/settings`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#19251F] hover:bg-[#F7F8F5]"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserRound size={16} />
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>

          <div className="relative hidden xl:block">
            <button
              type="button"
              onClick={() => setWorkspaceOpen((value) => !value)}
              className="flex max-w-48 items-center gap-2 rounded-xl border border-[#E4E9E3] px-3 py-2 text-sm"
            >
              <span className="truncate font-semibold text-[#19251F]">
                {workspaceName}
              </span>
              <ChevronDown size={15} className="text-[#707A73]" />
            </button>
            {workspaceOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-[#E4E9E3] bg-white p-2 shadow-xl">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => void switchWorkspace(workspace)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                      workspace.slug === workspaceSlug
                        ? "bg-emerald-50 font-semibold text-[#153D2E]"
                        : "text-[#19251F] hover:bg-[#F7F8F5]"
                    }`}
                  >
                    <span className="block truncate">{workspace.name}</span>
                    <span className="mt-0.5 block text-xs capitalize text-[#707A73]">
                      {workspace.role}
                    </span>
                  </button>
                ))}
                <Link
                  href="/select-workspace"
                  className="mt-1 block rounded-xl border-t border-[#E4E9E3] px-3 py-2.5 text-sm font-semibold text-[#25865A]"
                >
                  Manage workspaces
                </Link>
              </div>
            )}
          </div>
        </header>
        {workspaceError && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6 lg:mx-8"
          >
            {workspaceError}
          </div>
        )}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
