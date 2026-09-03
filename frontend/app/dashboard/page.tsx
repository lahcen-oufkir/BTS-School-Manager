"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface DashboardStats {
  students_count: number;
  teachers_count: number;
  classes_count: number;
  active_year?: string;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStats({
        students_count: 0,
        teachers_count: 0,
        classes_count: 0,
        active_year: null as unknown as string,
      });
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  const isAdmin = user?.role === "admin_system" || user?.role === "admin_establishment";
  const isTeacher = user?.role === "teacher";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user?.name} &middot; {user?.email}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-8 text-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(isAdmin || isTeacher) && (
            <StatCard label={t("dashboard.students_count")} value={stats?.students_count ?? 0} />
          )}
          {isAdmin && (
            <>
              <StatCard label={t("dashboard.teachers_count")} value={stats?.teachers_count ?? 0} />
              <StatCard label={t("dashboard.classes_count")} value={stats?.classes_count ?? 0} />
            </>
          )}
          {isAdmin && (
            <StatCard label={t("dashboard.active_year")} value={stats?.active_year ?? "—"} />
          )}
          {!isAdmin && (
            <>
              <StatCard label={t("dashboard.attendance_rate")} value="—" />
              <StatCard label={t("dashboard.my_grades")} value="—" />
            </>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recent_activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Aucune activité récente pour le moment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.announcements")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Aucune annonce publiée pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}