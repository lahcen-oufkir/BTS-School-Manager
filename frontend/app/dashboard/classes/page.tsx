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
  createSchoolClass,
  deleteSchoolClass,
  fetchAcademicYears,
  fetchClasses,
  fetchPrograms,
  updateSchoolClass,
  type SchoolClassPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AcademicYear, Program, SchoolClass } from "@/lib/types";

export default function ClassesPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<SchoolClass[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [programFilter, setProgramFilter] = useState(0);
  const [yearFilter, setYearFilter] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<SchoolClassPayload>({
    program_id: 0,
    academic_year_id: 0,
    name: "",
    code: "",
    year_level: 1,
    is_active: true,
  });
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
        try {
        const result = await fetchClasses({
          page: targetPage,
          per_page: 15,
          program_id: programFilter || undefined,
          academic_year_id: yearFilter || undefined,
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
    [programFilter, yearFilter],
  );

  useEffect(() => {
    let ignore = false;
    fetchClasses({
      page,
      per_page: 15,
      program_id: programFilter || undefined,
      academic_year_id: yearFilter || undefined,
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
  }, [page, programFilter, yearFilter]);

  useEffect(() => {
    fetchPrograms({ per_page: 100 })
      .then((result) => setPrograms(result.data))
      .catch(() => setPrograms([]));
    fetchAcademicYears({ per_page: 100 })
      .then((result) => setYears(result.data))
      .catch(() => setYears([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      program_id: programs[0]?.id ?? 0,
      academic_year_id: years[0]?.id ?? 0,
      name: "",
      code: "",
      year_level: 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item: SchoolClass) => {
    setEditing(item);
    setForm({
      program_id: item.program_id,
      academic_year_id: item.academic_year_id,
      name: item.name,
      code: item.code ?? "",
      year_level: item.year_level ?? 1,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateSchoolClass(editing.id, form);
      } else {
        await createSchoolClass(form);
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
      await deleteSchoolClass(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canManage =
    hasPermission("classes.create") || hasPermission("classes.update") || hasPermission("classes.delete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("classes.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("classes.create")}</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            aria-label={t("admin.programs.title")}
            value={programFilter}
            onChange={(event) => {
              setProgramFilter(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={0}>{t("admin.all")}</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            aria-label={t("admin.academic_years.title")}
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={0}>{t("admin.all")}</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
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
                    <th className="px-5 py-3">{t("classes.name")}</th>
                    <th className="px-5 py-3">{t("admin.academic_years.title")}</th>
                    <th className="px-5 py-3">{t("classes.year_level")}</th>
                    <th className="px-5 py-3">{t("admin.students_count")}</th>
                    <th className="px-5 py-3">{t("common.status")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.program?.name}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.academic_year?.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {t("classes.year")} {item.year_level}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.students_count ?? 0}</td>
                      <td className="px-5 py-3">
                        {item.is_active ? (
                          <Badge variant="success">{t("admin.active")}</Badge>
                        ) : (
                          <Badge variant="warning">{t("admin.inactive")}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            {t("common.edit")}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setDeleting(item)}>
                            {t("common.delete")}
                          </Button>
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
            totalLabel={t("classes.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("classes.edit") : t("classes.create")}
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
            label={t("admin.programs.title")}
            value={form.program_id}
            onChange={(event) => setForm({ ...form, program_id: Number(event.target.value) })}
          >
            <option value={0} disabled>
              {t("common.select")}
            </option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </Select>
          <Select
            label={t("admin.academic_years.title")}
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
            label={t("classes.name")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("classes.code")}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
            <Input
              type="number"
              min={1}
              max={10}
              label={t("classes.year_level")}
              value={form.year_level}
              onChange={(event) => setForm({ ...form, year_level: Number(event.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            {t("admin.active")}
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("classes.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}