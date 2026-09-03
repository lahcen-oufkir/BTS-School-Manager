"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const sections: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "sidebar.main",
    items: [
      { href: "/dashboard", label: "dashboard.title" },
      { href: "/dashboard/announcements", label: "announcements.title", permission: "announcements.view" },
      { href: "/dashboard/notifications", label: "notifications.title", permission: "notifications.view" },
    ],
  },
  {
    titleKey: "sidebar.academic",
    items: [
      { href: "/dashboard/students", label: "students.title", permission: "students.view" },
      { href: "/dashboard/teachers", label: "teachers.title", permission: "teachers.view" },
      { href: "/dashboard/classes", label: "classes.title", permission: "classes.view" },
      { href: "/dashboard/subjects", label: "subjects.title", permission: "subjects.view" },
      { href: "/dashboard/grades", label: "grades.title", permission: "grades.view" },
      { href: "/dashboard/attendance", label: "attendance.title", permission: "attendance.view" },
      { href: "/dashboard/schedule", label: "schedule.title", permission: "schedule.view" },
      { href: "/dashboard/documents", label: "documents.title", permission: "documents.view" },
    ],
  },
  {
    titleKey: "sidebar.admin",
    items: [
      { href: "/dashboard/admin/users", label: "admin.users.title", permission: "users.view" },
      { href: "/dashboard/admin/schools", label: "admin.schools.title", permission: "settings.view" },
      {
        href: "/dashboard/admin/academic-years",
        label: "admin.academic_years.title",
        permission: "settings.view",
      },
      { href: "/dashboard/admin/programs", label: "admin.programs.title", permission: "settings.view" },
    ],
  },
  {
    titleKey: "sidebar.administration",
    items: [
      { href: "/dashboard/reports", label: "reports.title", permission: "reports.view" },
      { href: "/dashboard/settings", label: "settings.title", permission: "settings.view" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          BTS
        </div>
        <span className="text-sm font-semibold text-slate-900">
          {t("common.app_name")}
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          const visibleItems =
            user?.role === "admin_system"
              ? section.items
              : section.items.filter(
                  (item) => !item.permission || hasPermission(item.permission),
                );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.titleKey}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t(section.titleKey)}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {t(item.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}