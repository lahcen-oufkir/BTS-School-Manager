"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  createSchool,
  deleteSchool,
  fetchSchools,
  updateSchool,
  type SchoolPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { School } from "@/lib/types";

export default function SchoolsPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [items, setItems] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<SchoolPayload>({
    name: "",
    code: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    is_active: true,
  });
  const [deleting, setDeleting] = useState<School | null>(null);

  const load = useCallback(async (targetPage: number, searchTerm: string) => {
    try {
      const result = await fetchSchools({ page: targetPage, per_page: 15, search: searchTerm || undefined });
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
    fetchSchools({ page, per_page: 15, search: search || undefined })
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
  }, [page, search]);

  const isSystemAdmin = user?.role === "admin_system";

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", city: "", address: "", phone: "", email: "", website: "", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item: School) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code ?? "",
      city: item.city ?? "",
      address: item.address ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      website: item.website ?? "",
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateSchool(editing.id, form);
      } else {
        await createSchool(form);
      }
      setModalOpen(false);
      await load(page, search);
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
      await deleteSchool(deleting.id);
      setDeleting(null);
      await load(page, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.schools.title")}</h1>
        {isSystemAdmin && <Button onClick={openCreate}>{t("admin.schools.create")}</Button>}
      </div>

      {isSystemAdmin && (
        <div className="w-72">
          <Input
            label={t("common.search")}
            placeholder={t("admin.schools.search_placeholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      )}

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
                    <th className="px-5 py-3">{t("admin.schools.name")}</th>
                    <th className="px-5 py-3">{t("admin.schools.code")}</th>
                    <th className="px-5 py-3">{t("admin.schools.city")}</th>
                    <th className="px-5 py-3">{t("admin.students_count")}</th>
                    <th className="px-5 py-3">{t("admin.teachers_count")}</th>
                    <th className="px-5 py-3">{t("common.status")}</th>
                    {isSystemAdmin && (
                      <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-3">
                        {item.code && <Badge variant="info">{item.code}</Badge>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.city}</td>
                      <td className="px-5 py-3 text-slate-600">{item.students_count ?? 0}</td>
                      <td className="px-5 py-3 text-slate-600">{item.teachers_count ?? 0}</td>
                      <td className="px-5 py-3">
                        {item.is_active ? (
                          <Badge variant="success">{t("admin.active")}</Badge>
                        ) : (
                          <Badge variant="warning">{t("admin.inactive")}</Badge>
                        )}
                      </td>
                      {isSystemAdmin && (
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
                      )}
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
            totalLabel={t("admin.schools.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("admin.schools.edit") : t("admin.schools.create")}
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
          <Input
            label={t("admin.schools.name")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("admin.schools.code")}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
            <Input
              label={t("admin.schools.city")}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </div>
          <Input
            label={t("admin.schools.address")}
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("admin.schools.phone")}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Input
              label={t("admin.schools.email")}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <Input
            label={t("admin.schools.website")}
            value={form.website}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
          />
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
        title={t("admin.schools.delete")}
        message={t("admin.confirm_delete_school")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}