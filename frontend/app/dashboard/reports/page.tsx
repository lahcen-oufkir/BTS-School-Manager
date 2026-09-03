"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchAcademicYears } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  fetchAttendanceAnalytics,
  fetchGradeAnalytics,
  fetchReportSummary,
  fetchStudentDistribution,
} from "@/lib/report-api";
import type {
  AcademicYear,
  AttendanceAnalytics,
  GradeAnalytics,
  ReportSummary,
  StudentDistribution,
} from "@/lib/types";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        {hint !== undefined && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function BarList({
  label,
  items,
  valueLabel,
  emptyLabel,
}: {
  label: string;
  items: { label: string; count: number }[];
  valueLabel: string;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-slate-500">
                  {item.count} {valueLabel}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState(0);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [distribution, setDistribution] = useState<StudentDistribution | null>(null);
  const [grades, setGrades] = useState<GradeAnalytics | null>(null);
  const [attendance, setAttendance] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAcademicYears({ per_page: 100 })
      .then((result) => setYears(result.data))
      .catch(() => setYears([]));
  }, []);

  const effectiveYearId =
    selectedYear ||
    years.find((year) => year.is_current && year.school_id === user?.school_id)?.id ||
    years[0]?.id ||
    0;

  useEffect(() => {
    if (!hasPermission("reports.view")) {
      return;
    }
    const year = effectiveYearId || undefined;
    let ignore = false;
    Promise.all([
      fetchReportSummary(year ? { academic_year_id: year } : {}),
      fetchStudentDistribution(year ? { academic_year_id: year } : {}),
      fetchGradeAnalytics(year ? { academic_year_id: year } : {}),
      fetchAttendanceAnalytics(year ? { academic_year_id: year } : {}),
    ])
      .then(([s, d, g, a]) => {
        if (ignore) return;
        setSummary(s);
        setDistribution(d);
        setGrades(g);
        setAttendance(a);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : t("reports.load_error"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [effectiveYearId, hasPermission, t, user?.school_id]);

  if (!hasPermission("reports.view")) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">{t("reports.denied")}</p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("reports.title")}</h1>
        {years.length > 0 && (
          <div className="w-56">
            <Select
              label={t("reports.academic_year")}
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              <option value={0}>{t("admin.all")}</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label={t("reports.students")} value={summary.students} />
          <StatCard label={t("reports.teachers")} value={summary.teachers} />
          <StatCard label={t("reports.classes")} value={summary.classes} />
          <StatCard label={t("reports.active_students")} value={summary.active_students} />
          <StatCard
            label={t("reports.assessments")}
            value={summary.assessments}
            hint={t("reports.average")}
          />
          <StatCard label={t("reports.programs")} value={summary.programs} />
          <StatCard
            label={t("reports.grade_average")}
            value={`${summary.grades.average} / 20`}
            hint={`${summary.grades.total_grades} ${t("reports.grades")}`}
          />
          <StatCard
            label={t("reports.present_rate")}
            value={`${summary.attendance.present_rate}%`}
            hint={`${summary.attendance.total_records} ${t("reports.records")}`}
          />
        </div>
      )}

      {distribution && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarList
            label={t("reports.students_by_class")}
            items={distribution.classes}
            valueLabel={t("reports.students")}
            emptyLabel={t("admin.empty")}
          />
          <BarList
            label={t("reports.students_by_program")}
            items={distribution.programs}
            valueLabel={t("reports.students")}
            emptyLabel={t("admin.empty")}
          />
          <BarList
            label={t("reports.students_by_status")}
            items={distribution.status}
            valueLabel={t("reports.students")}
            emptyLabel={t("admin.empty")}
          />
          <BarList
            label={t("reports.students_by_gender")}
            items={distribution.gender}
            valueLabel={t("reports.students")}
            emptyLabel={t("admin.empty")}
          />
        </div>
      )}

      {grades && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("reports.grades")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">{t("reports.average")}</span>
                <span className="font-semibold text-slate-900">
                  {grades.average} / 20
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">{t("reports.pass_rate")}</span>
                <span className="font-semibold text-slate-900">{grades.pass_rate}%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">{t("reports.total_grades")}</span>
                <span className="font-semibold text-slate-900">{grades.total_grades}</span>
              </div>
            </CardContent>
          </Card>
          <BarList
            label={t("reports.average_by_class")}
            items={grades.by_class.map((row) => ({ label: row.label, count: row.average }))}
            valueLabel="/ 20"
            emptyLabel={t("admin.empty")}
          />
        </div>
      )}

      {attendance && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarList
            label={t("reports.attendance_by_status")}
            items={attendance.by_status.map((row) => ({ ...row, count: Number(row.count) }))}
            valueLabel={t("reports.records")}
            emptyLabel={t("admin.empty")}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("reports.attendance_by_class")}</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.by_class.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">{t("admin.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {attendance.by_class.map((row) => (
                    <div key={row.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{row.label}</span>
                        <span className="text-slate-500">{row.present_rate}%</span>
                      </div>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="success">{row.present}</Badge>
                        <Badge variant="danger">{row.absent}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}