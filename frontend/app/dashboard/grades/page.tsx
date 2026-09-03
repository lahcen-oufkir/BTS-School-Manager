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
  createAssessment,
  deleteAssessment,
  fetchAcademicYears,
  fetchAssessments,
  fetchClasses,
  fetchGradeStream,
  fetchSubjects,
  lockAssessment,
  publishAssessment,
  saveGrades,
  updateAssessment,
  type AssessmentPayload,
  type GradeEntry,
} from "@/lib/grades-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type {
  AcademicYear,
  Assessment,
  AssessmentType,
  GradeStreamRow,
  SchoolClass,
  Subject,
} from "@/lib/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const typeVariant: Record<AssessmentType, BadgeVariant> = {
  exam: "danger",
  quiz: "info",
  homework: "warning",
  practical: "success",
  project: "default",
  continuous: "info",
};

const assessmentTypes: AssessmentType[] = [
  "exam",
  "quiz",
  "homework",
  "practical",
  "project",
  "continuous",
];

export default function GradesPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<Assessment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  // Assessment modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [form, setForm] = useState<AssessmentPayload>({
    class_id: 0,
    subject_id: 0,
    academic_year_id: 0,
    title: "",
    type: "continuous",
    date: "",
    max_score: 20,
    weight: 1,
  });
  const [deleting, setDeleting] = useState<Assessment | null>(null);

  // Grade entry
  const [entering, setEntering] = useState<Assessment | null>(null);
  const [rows, setRows] = useState<GradeStreamRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");

  const canManage =
    hasPermission("grades.create") || hasPermission("grades.update") || hasPermission("grades.delete");

  const load = useCallback(
    async (targetPage: number) => {
      try {
        const result = await fetchAssessments({
          page: targetPage,
          per_page: 15,
          class_id: classFilter || undefined,
          subject_id: subjectFilter || undefined,
          search: query || undefined,
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
    [classFilter, subjectFilter, query],
  );

  useEffect(() => {
    let ignore = false;
    fetchAssessments({
      page,
      per_page: 15,
      class_id: classFilter || undefined,
      subject_id: subjectFilter || undefined,
      search: query || undefined,
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
  }, [page, classFilter, subjectFilter, query]);

  useEffect(() => {
    fetchClasses({ per_page: 100 })
      .then((result) => setClasses(result.data))
      .catch(() => setClasses([]));
    fetchSubjects({ per_page: 100 })
      .then((result) => setSubjects(result.data))
      .catch(() => setSubjects([]));
    fetchAcademicYears({ per_page: 100 })
      .then((result) => setYears(result.data))
      .catch(() => setYears([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      class_id: classes[0]?.id ?? 0,
      subject_id: subjects[0]?.id ?? 0,
      academic_year_id: years.find((y) => y.is_current)?.id ?? years[0]?.id ?? 0,
      title: "",
      type: "continuous",
      date: "",
      max_score: 20,
      weight: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (item: Assessment) => {
    setEditing(item);
    setForm({
      class_id: item.class_id,
      subject_id: item.subject_id,
      academic_year_id: item.academic_year_id,
      title: item.title,
      type: item.type,
      date: item.date ?? "",
      max_score: Number(item.max_score),
      weight: Number(item.weight),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateAssessment(editing.id, form);
      } else {
        await createAssessment(form);
      }
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
      await deleteAssessment(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openEntry = (item: Assessment) => {
    setEntering(item);
    setRows([]);
    setRowsLoading(true);
    setRowsError("");
    fetchGradeStream(item.id)
      .then(setRows)
      .catch((err) => setRowsError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setRowsLoading(false));
  };

  const setScore = (studentId: number, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, score: value } : r)),
    );
  };

  const setComment = (studentId: number, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, comment: value } : r)),
    );
  };

  const submitGrades = async () => {
    if (!entering) return;
    const grades: GradeEntry[] = rows
      .filter((r) => r.score !== null && r.score !== "")
      .map((r) => ({
        student_id: r.student_id,
        score: Number(r.score),
        comment: r.comment || null,
      }));
    setSaving(true);
    setRowsError("");
    try {
      await saveGrades(entering.id, grades);
      await load(page);
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item: Assessment) => {
    setSaving(true);
    try {
      await publishAssessment(item.id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async (item: Assessment) => {
    setSaving(true);
    try {
      await lockAssessment(item.id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const runSearch = () => {
    setQuery(search);
    setPage(1);
  };

  if (entering) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{entering.title}</h1>
            <p className="text-sm text-slate-500">
              {entering.class?.name} · {entering.subject?.name}
            </p>
          </div>
          <Button variant="outline" onClick={() => { setEntering(null); setRows([]); }}>
            {t("common.close")}
          </Button>
        </div>

        {rowsError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{rowsError}</p>
        )}

        <Card>
          <CardContent className="p-0">
            {rowsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">{t("grades.no_grades")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">{t("grades.students")}</th>
                      <th className="w-32 px-5 py-3">{t("grades.score")}</th>
                      <th className="px-5 py-3">{t("grades.comment")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">
                            {row.first_name} {row.last_name}
                          </div>
                          <div className="text-xs text-slate-500">{row.student_number}</div>
                        </td>
                        <td className="px-5 py-3">
                          <Input
                            type="number"
                            min={0}
                            max={Number(entering.max_score)}
                            step="0.25"
                            value={row.score ?? ""}
                            disabled={entering.is_published || entering.is_locked}
                            onChange={(event) => setScore(row.student_id, event.target.value)}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <Input
                            value={row.comment ?? ""}
                            disabled={entering.is_published || entering.is_locked}
                            onChange={(event) => setComment(row.student_id, event.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          {!entering.is_published && !entering.is_locked && (
            <Button onClick={submitGrades} isLoading={saving}>
              {t("grades.save_grades")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handlePublish(entering)}
            disabled={entering.is_published || entering.is_locked}
            isLoading={saving}
          >
            {t("grades.publish")}
          </Button>
          {(hasPermission("grades.update") || hasPermission("grades.delete")) && (
            <Button
              variant="outline"
              onClick={() => handleLock(entering)}
              disabled={entering.is_locked}
              isLoading={saving}
            >
              {t("grades.lock")}
            </Button>
          )}
          {entering.is_published && <Badge variant="success">{t("grades.published")}</Badge>}
          {entering.is_locked && <Badge variant="danger">{t("grades.locked")}</Badge>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("grades.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("grades.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            label={t("common.search")}
            placeholder={t("grades.search_placeholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
          />
        </div>
        <div className="w-52">
          <Select
            aria-label={t("grades.class")}
            value={classFilter}
            onChange={(event) => {
              setClassFilter(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={0}>{t("admin.all")}</option>
            {classes.map((clazz) => (
              <option key={clazz.id} value={clazz.id}>
                {clazz.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            aria-label={t("grades.subject")}
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
        <Button variant="outline" onClick={runSearch}>
          {t("common.search")}
        </Button>
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
                    <th className="px-5 py-3">{t("grades.title")}</th>
                    <th className="px-5 py-3">{t("grades.class")}</th>
                    <th className="px-5 py-3">{t("grades.subject")}</th>
                    <th className="px-5 py-3">{t("grades.type")}</th>
                    <th className="px-5 py-3">{t("grades.date")}</th>
                    <th className="px-5 py-3">{t("grades.max_score")}</th>
                    <th className="px-5 py-3">{t("grades.average")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{item.title}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.class?.name}</td>
                      <td className="px-5 py-3 text-slate-600">{item.subject?.name}</td>
                      <td className="px-5 py-3">
                        <Badge variant={typeVariant[item.type]}>
                          {t(`grades.type_${item.type}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.date ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{item.max_score}</td>
                      <td className="px-5 py-3">
                        {item.average != null ? (
                          <span className="font-medium text-slate-900">{item.average}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission("grades.update") && (
                            <Button variant="outline" size="sm" onClick={() => openEntry(item)}>
                              {t("grades.enter")}
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                {t("common.edit")}
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => setDeleting(item)}>
                                {t("common.delete")}
                              </Button>
                            </>
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
            totalLabel={t("grades.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("grades.edit") : t("grades.create")}
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("grades.class")}
              value={form.class_id}
              onChange={(event) => setForm({ ...form, class_id: Number(event.target.value) })}
            >
              <option value={0} disabled>
                {t("common.select")}
              </option>
              {classes.map((clazz) => (
                <option key={clazz.id} value={clazz.id}>
                  {clazz.name}
                </option>
              ))}
            </Select>
            <Select
              label={t("grades.subject")}
              value={form.subject_id}
              onChange={(event) => setForm({ ...form, subject_id: Number(event.target.value) })}
            >
              <option value={0} disabled>
                {t("common.select")}
              </option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label={t("grades.academic_year")}
            value={form.academic_year_id}
            onChange={(event) => setForm({ ...form, academic_year_id: Number(event.target.value) })}
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
          <Input
            label={t("grades.title")}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("grades.type")}
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as AssessmentType })}
            >
              {assessmentTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`grades.type_${type}`)}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              label={t("grades.date")}
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              min={1}
              max={100}
              step="0.5"
              label={t("grades.max_score")}
              value={form.max_score}
              onChange={(event) => setForm({ ...form, max_score: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={0.1}
              max={10}
              step="0.1"
              label={t("grades.weight")}
              value={form.weight}
              onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("grades.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}
