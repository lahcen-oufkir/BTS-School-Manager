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
  createProgram,
  deleteProgram,
  fetchPrograms,
  fetchSchools,
  updateProgram,
  type ProgramPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Program, School } from "@/lib/types";

export default function ProgramsPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [items, setItems] = useState<Program[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState<ProgramPayload>({ school_id: 0, name: "", code: "", description: "" });
  const [deleting, setDeleting] = useState<Program | null>(null);

  const load = useCallback(async (targetPage: number) => {
    try {
      const result = await fetchPrograms({ page: targetPage, per_page: 15 });
      setItems(result.data);
      setTotal(result.total);
      setLastPage(result.last_page);
      setPage(result.current_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchPrograms({ page, per_page: 15 })
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
  }, [page]);

  useEffect(() => {
    fetchSchools({ per_page: 100 })
      .then((result) => setSchools(result.data))
      .catch(() => setSchools([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ school_id: schools[0]?.id ?? 0, name: "", code: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (item: Program) => {
    setEditing(item);
    setForm({
      school_id: item.school_id,
      name: item.name,
      code: item.code ?? "",
      description: item.description ?? "",
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateProgram(editing.id, form);
      } else {
        await createProgram(form);
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
      await deleteProgram(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canManage = user?.role === "admin_system" || user?.role === "admin_establishment";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.programs.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("admin.programs.create")}</Button>}
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
                    <th className="px-5 py-3">{t("admin.programs.code")}</th>
                    <th className="px-5 py-3">{t("admin.programs.name")}</th>
                    <th className="px-5 py-3">{t("admin.school")}</th>
                    <th className="px-5 py-3">{t("admin.programs.subjects_count")}</th>
                    <th className="px-5 py-3">{t("admin.programs.classes_count")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Badge variant="info">{item.code}</Badge>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-3 text-slate-600">{item.school?.name}</td>
                      <td className="px-5 py-3 text-slate-600">{item.subjects_count ?? 0}</td>
                      <td className="px-5 py-3 text-slate-600">{item.classes_count ?? 0}</td>
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
            totalLabel={t("admin.programs.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("admin.programs.edit") : t("admin.programs.create")}
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
            label={t("admin.school")}
            value={form.school_id}
            disabled={user?.role !== "admin_system"}
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
          <Input
            label={t("admin.programs.code")}
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
          <Input
            label={t("admin.programs.name")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label={t("admin.programs.description")}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.programs.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}