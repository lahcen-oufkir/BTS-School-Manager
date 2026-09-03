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
  createSubject,
  deleteSubject,
  fetchPrograms,
  fetchSubjects,
  updateSubject,
  type SubjectPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Program, Subject } from "@/lib/types";

export default function SubjectsPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [items, setItems] = useState<Subject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [programFilter, setProgramFilter] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectPayload>({ program_id: 0, name: "", code: "", coefficient: 2 });
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
        try {
        const result = await fetchSubjects({
          page: targetPage,
          per_page: 15,
          program_id: programFilter || undefined,
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
    [programFilter],
  );

  useEffect(() => {
    let ignore = false;
    fetchSubjects({
      page,
      per_page: 15,
      program_id: programFilter || undefined,
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
  }, [page, programFilter]);

  useEffect(() => {
    fetchPrograms({ per_page: 100 })
      .then((result) => setPrograms(result.data))
      .catch(() => setPrograms([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ program_id: programs[0]?.id ?? 0, name: "", code: "", coefficient: 2 });
    setModalOpen(true);
  };

  const openEdit = (item: Subject) => {
    setEditing(item);
    setForm({
      program_id: item.program_id,
      name: item.name,
      code: item.code ?? "",
      coefficient: Number(item.coefficient),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateSubject(editing.id, form);
      } else {
        await createSubject(form);
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
      await deleteSubject(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canManage = hasPermission("subjects.create") || hasPermission("subjects.update") || hasPermission("subjects.delete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("subjects.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("subjects.create")}</Button>}
      </div>

      <div className="flex items-center gap-3">
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
                    <th className="px-5 py-3">{t("subjects.name")}</th>
                    <th className="px-5 py-3">{t("subjects.code")}</th>
                    <th className="px-5 py-3">{t("admin.programs.title")}</th>
                    <th className="px-5 py-3">{t("subjects.coefficient")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-3">
                        {item.code && <Badge variant="info">{item.code}</Badge>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.program?.name}</td>
                      <td className="px-5 py-3 text-slate-600">{item.coefficient}</td>
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
            totalLabel={t("subjects.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("subjects.edit") : t("subjects.create")}
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
          <Input
            label={t("subjects.name")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label={t("subjects.code")}
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
          <Input
            type="number"
            step="0.5"
            min={0.1}
            label={t("subjects.coefficient")}
            value={form.coefficient}
            onChange={(event) => setForm({ ...form, coefficient: Number(event.target.value) })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("subjects.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}