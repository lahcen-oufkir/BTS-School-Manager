"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  fetchAttendance,
  fetchAttendanceStream,
  saveAttendance,
  type AttendanceSessionPayload,
} from "@/lib/attendance-api";
import { fetchClasses, fetchSubjects } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type {
  AttendanceSession,
  AttendanceStatus,
  AttendanceStreamRow,
  SchoolClass,
  Subject,
} from "@/lib/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const statusVariant: Record<AttendanceStatus, BadgeVariant> = {
  present: "success",
  late: "warning",
  justified: "info",
  absent: "danger",
};

const statuses: AttendanceStatus[] = ["present", "absent", "late", "justified"];

const emptyForm: AttendanceSessionPayload = {
  class_id: 0,
  subject_id: null,
  date: "",
  start_time: "",
  end_time: "",
};

export default function AttendancePage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<AttendanceSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState(0);
  const [dateFilter, setDateFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AttendanceSessionPayload>(emptyForm);
  const [deleting, setDeleting] = useState<AttendanceSession | null>(null);

  const [marking, setMarking] = useState<AttendanceSession | null>(null);
  const [rows, setRows] = useState<AttendanceStreamRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const load = useCallback(
    async (targetPage: number) => {
      try {
        const result = await fetchAttendance({
          page: targetPage,
          per_page: 15,
          class_id: classFilter || undefined,
          subject_id: subjectFilter || undefined,
          date: dateFilter || undefined,
        });
        setItems(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
        setPage(result.current_page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    },
    [classFilter, subjectFilter, dateFilter],
  );

  useEffect(() => {
    let ignore = false;
    fetchAttendance({
      page,
      per_page: 15,
      class_id: classFilter || undefined,
      subject_id: subjectFilter || undefined,
      date: dateFilter || undefined,
    })
      .then((result) => {
        if (ignore) return;
        setItems(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
        setPage(result.current_page);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, classFilter, subjectFilter, dateFilter]);

  useEffect(() => {
    fetchClasses({ per_page: 100 })
      .then((result) => setClasses(result.data))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    fetchSubjects({ per_page: 100 })
      .then((result) => setSubjects(result.data))
      .catch(() => setSubjects([]));
  }, []);

  const openCreate = () => {
    const hasClass = classes.length > 0;
    setForm({
      ...emptyForm,
      class_id: hasClass ? (classes[0]?.id ?? 0) : 0,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await createAttendanceSession({
        ...form,
        subject_id: form.subject_id || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      });
      setModalOpen(false);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteAttendanceSession(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openMarking = async (session: AttendanceSession) => {
    setMarking(session);
    setRowsLoading(true);
    setError("");
    try {
      const stream = await fetchAttendanceStream(session.id);
      setRows(stream);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRowsLoading(false);
    }
  };

  const setRowStatus = (studentId: number, status: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, status } : row)),
    );
  };

  const setRowJustification = (studentId: number, justification: string) => {
    setRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, justification } : row)),
    );
  };

  const saveRows = async () => {
    if (!marking) return;
    setSaving(true);
    setError("");
    try {
      await saveAttendance(
        marking.id,
        rows.map((row) => ({ student_id: row.student_id, status: row.status, justification: row.justification })),
      );
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canManage =
    hasPermission("attendance.create") || hasPermission("attendance.update");

  if (marking) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("attendance.enter_for")}</h1>
            <p className="text-sm text-slate-500">
              {marking.class?.name}
              {marking.subject ? ` · ${marking.subject.name}` : ""} · {marking.date}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMarking(null)}>
              {t("common.cancel")}
            </Button>
            {hasPermission("attendance.update") && (
              <Button onClick={saveRows} isLoading={saving}>
                {t("attendance.save")}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        )}

        <Card>
          <CardContent className="p-0">
            {rowsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">{t("attendance.no_students")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">{t("students.last_name")}</th>
                      <th className="px-5 py-3">{t("students.first_name")}</th>
                      <th className="px-5 py-3">{t("students.student_number")}</th>
                      <th className="px-5 py-3">{t("attendance.status")}</th>
                      <th className="px-5 py-3">{t("attendance.justification")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{row.last_name}</td>
                        <td className="px-5 py-3 text-slate-600">{row.first_name}</td>
                        <td className="px-5 py-3 text-slate-600">{row.student_number ?? "—"}</td>
                        <td className="px-5 py-3">
                          {hasPermission("attendance.update") ? (
                            <Select
                              aria-label={t("attendance.status")}
                              value={row.status}
                              onChange={(event) =>
                                setRowStatus(row.student_id, event.target.value as AttendanceStatus)
                              }
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {t(`attendance.status_${status}`)}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Badge variant={statusVariant[row.status]}>
                              {t(`attendance.status_${row.status}`)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {hasPermission("attendance.update") && row.status === "justified" ? (
                            <Input
                              value={row.justification ?? ""}
                              onChange={(event) =>
                                setRowJustification(row.student_id, event.target.value)
                              }
                              placeholder={t("attendance.justification_hint")}
                            />
                          ) : (
                            <span className="text-xs text-slate-500">
                              {row.justification ?? "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("attendance.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("attendance.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label={t("grades.class")}
            value={classFilter}
            onChange={(event) => {
              setClassFilter(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={0}>{t("admin.all")}</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            label={t("grades.subject")}
            value={subjectFilter}
            onChange={(event) => {
              setSubjectFilter(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={0}>{t("admin.all")}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Input
            type="date"
            label={t("grades.date")}
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">{t("admin.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("grades.date")}</th>
                    <th className="px-5 py-3">{t("grades.class")}</th>
                    <th className="px-5 py-3">{t("grades.subject")}</th>
                    <th className="px-5 py-3">{t("attendance.stats")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {item.date}
                        {item.start_time && (
                          <div className="text-xs text-slate-500">
                            {item.start_time}
                            {item.end_time ? ` – ${item.end_time}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {item.class ? <Badge variant="info">{item.class.name}</Badge> : "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.subject?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge variant="success">{item.present_count ?? 0} P</Badge>
                          <Badge variant="warning">{item.late_count ?? 0} R</Badge>
                          <Badge variant="info">{item.justified_count ?? 0} J</Badge>
                          <Badge variant="danger">{item.absent_count ?? 0} A</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission("attendance.view") && (
                            <Button variant="outline" size="sm" onClick={() => openMarking(item)}>
                              {t("attendance.enter")}
                            </Button>
                          )}
                          {hasPermission("attendance.update") && (
                            <Button variant="danger" size="sm" onClick={() => setDeleting(item)}>
                              {t("common.delete")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
            pageLabel={t("admin.page")}
            totalLabel={t("attendance.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={t("attendance.create")}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} isLoading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t("grades.class")}
            value={form.class_id}
            onChange={(event) => setForm({ ...form, class_id: Number(event.target.value) })}
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </Select>

          <Select
            label={t("grades.subject")}
            value={form.subject_id ?? 0}
            onChange={(event) =>
              setForm({ ...form, subject_id: Number(event.target.value) || null })
            }
          >
            <option value={0}>{t("attendance.no_subject")}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            label={t("grades.date")}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label={t("schedule.start_time")}
              value={form.start_time ?? ""}
              onChange={(event) => setForm({ ...form, start_time: event.target.value })}
            />
            <Input
              type="time"
              label={t("schedule.end_time")}
              value={form.end_time ?? ""}
              onChange={(event) => setForm({ ...form, end_time: event.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("attendance.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}
