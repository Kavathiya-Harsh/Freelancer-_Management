"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  PackageCheck,
  Receipt,
  Users,
  BarChart3,
} from "lucide-react";

export function WorkspaceNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  const links = [
    {
      label: "Dashboard",
      href: `/w/${workspaceSlug}/dashboard`,
      icon: LayoutDashboard,
      active:
        pathname === `/w/${workspaceSlug}/dashboard` ||
        pathname === `/w/${workspaceSlug}`,
    },
    {
      label: "Projects",
      href: `/w/${workspaceSlug}/projects`,
      icon: FolderKanban,
      active:
        pathname === `/w/${workspaceSlug}/projects` ||
        pathname.startsWith(`/w/${workspaceSlug}/projects/`),
    },
    {
      label: "Tasks",
      href: `/w/${workspaceSlug}/tasks`,
      icon: CheckSquare,
      active:
        pathname === `/w/${workspaceSlug}/tasks` ||
        pathname.startsWith(`/w/${workspaceSlug}/tasks/`),
    },
    {
      label: "Deliverables",
      href: `/w/${workspaceSlug}/deliverables`,
      icon: PackageCheck,
      active:
        pathname === `/w/${workspaceSlug}/deliverables` ||
        pathname.startsWith(`/w/${workspaceSlug}/deliverables/`),
    },
    {
      label: "Invoices",
      href: `/w/${workspaceSlug}/invoices`,
      icon: Receipt,
      active:
        pathname === `/w/${workspaceSlug}/invoices` ||
        pathname.startsWith(`/w/${workspaceSlug}/invoices/`),
    },
    {
      label: "Clients",
      href: `/w/${workspaceSlug}/clients`,
      icon: Users,
      active:
        pathname === `/w/${workspaceSlug}/clients` ||
        pathname.startsWith(`/w/${workspaceSlug}/clients/`),
    },
    {
      label: "Reports",
      href: `/w/${workspaceSlug}/reports`,
      icon: BarChart3,
      active: pathname === `/w/${workspaceSlug}/reports`,
    },
  ];

  return (
    <nav className="mt-8 space-y-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              link.active
                ? "bg-lime-300 font-semibold text-[#123524] shadow-sm"
                : "text-emerald-100 hover:bg-emerald-900/50 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
