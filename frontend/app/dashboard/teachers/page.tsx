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
  createTeacher,
  deleteTeacher,
  fetchSchools,
  fetchSubjects,
  fetchTeachers,
  updateTeacher,
  type TeacherPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { School, Subject, Teacher } from "@/lib/types";

const emptyForm: TeacherPayload = {
  school_id: 0,
  first_name: "",
  last_name: "",
  internal_identifier: "",
  email: "",
  phone: "",
  specialization: "",
  is_active: true,
  subject_ids: [],
};

export default function TeachersPage() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();

  const [items, setItems] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherPayload>(emptyForm);
  const [deleting, setDeleting] = useState<Teacher | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      try {
        const result = await fetchTeachers({
          page: targetPage,
          per_page: 15,
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
    [query],
  );

  const runSearch = () => {
    setQuery(search);
    setPage(1);
  };

  useEffect(() => {
    let ignore = false;
    fetchTeachers({
      page,
      per_page: 15,
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
  }, [page, query]);

  useEffect(() => {
    fetchSubjects({ per_page: 100 })
      .then((result) => setSubjects(result.data))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (user?.role === "admin_system") {
      fetchSchools({ per_page: 100 })
        .then((result) => setSchools(result.data))
        .catch(() => setSchools([]));
    }
  }, [user?.role]);

  const openCreate = () => {
    const hasSchool = schools.length > 0;
    setEditing(null);
    setForm({
      ...emptyForm,
      school_id: hasSchool ? (schools[0]?.id ?? 0) : (user?.school_id ?? 0),
    });
    setModalOpen(true);
  };

  const openEdit = (item: Teacher) => {
    setEditing(item);
    setForm({
      school_id: item.school_id,
      first_name: item.first_name,
      last_name: item.last_name,
      internal_identifier: item.internal_identifier ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      specialization: item.specialization ?? "",
      is_active: item.is_active,
      subject_ids: item.subjects?.map((s) => s.id) ?? [],
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateTeacher(editing.id, form);
      } else {
        await createTeacher(form);
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
      await deleteTeacher(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subjectId: number) => {
    const current = form.subject_ids ?? [];
    const updated = current.includes(subjectId)
      ? current.filter((id) => id !== subjectId)
      : [...current, subjectId];
    setForm({ ...form, subject_ids: updated });
  };

  const canManage =
    hasPermission("teachers.create") ||
    hasPermission("teachers.update") ||
    hasPermission("teachers.delete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("teachers.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("teachers.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Input
            label={t("common.search")}
            placeholder={t("teachers.search_placeholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
          />
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
                    <th className="px-5 py-3">{t("common.name")}</th>
                    <th className="px-5 py-3">{t("teachers.email")}</th>
                    <th className="px-5 py-3">{t("teachers.phone")}</th>
                    <th className="px-5 py-3">{t("teachers.specialization")}</th>
                    <th className="px-5 py-3">{t("teachers.subjects")}</th>
                    <th className="px-5 py-3">{t("common.status")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">
                          {item.first_name} {item.last_name}
                        </div>
                        {item.internal_identifier && (
                          <div className="text-xs text-slate-500">{item.internal_identifier}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.email ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{item.phone ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{item.specialization ?? "—"}</td>
                      <td className="px-5 py-3">
                        {item.subjects && item.subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.subjects.slice(0, 3).map((subject) => (
                              <Badge key={subject.id} variant="info">
                                {subject.name}
                              </Badge>
                            ))}
                            {item.subjects.length > 3 && (
                              <Badge variant="default">+{item.subjects.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{t("teachers.no_subjects")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={item.is_active ? "success" : "default"}>
                          {item.is_active ? t("admin.active") : t("admin.inactive")}
                        </Badge>
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
            totalLabel={t("teachers.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("teachers.edit") : t("teachers.create")}
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
          {user?.role === "admin_system" && (
            <Select
              label={t("admin.school")}
              value={form.school_id}
              onChange={(event) => setForm({ ...form, school_id: Number(event.target.value) })}
            >
              <option value={0} disabled>
                {t("common.select")}
              </option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("students.first_name")}
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
            <Input
              label={t("students.last_name")}
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("teachers.internal_identifier")}
              value={form.internal_identifier}
              onChange={(event) =>
                setForm({ ...form, internal_identifier: event.target.value })
              }
            />
            <Input
              label={t("teachers.specialization")}
              value={form.specialization}
              onChange={(event) =>
                setForm({ ...form, specialization: event.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="email"
              label={t("teachers.email")}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              label={t("teachers.phone")}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">{t("teachers.is_active")}</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {subjects.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("teachers.subjects")}
              </label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {subjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(form.subject_ids ?? []).includes(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {subject.name}
                    {subject.code && (
                      <span className="text-xs text-slate-400">({subject.code})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("teachers.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}
