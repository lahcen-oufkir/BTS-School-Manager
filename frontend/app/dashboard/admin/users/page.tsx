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
  createUser,
  deleteUser,
  fetchSchools,
  fetchUsers,
  updateUser,
  type UserPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { School, User, UserRole } from "@/lib/types";

const ROLE_OPTIONS: UserRole[] = ["admin_system", "admin_establishment", "teacher", "student"];

export default function UsersPage() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();

  const [items, setItems] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserPayload & { password_confirmation?: string }>({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "teacher",
    school_id: 0,
    is_active: true,
  });
  const [deleting, setDeleting] = useState<User | null>(null);

  const isSystemAdmin = user?.role === "admin_system";
  const allowedRoles: UserRole[] = isSystemAdmin
    ? ROLE_OPTIONS
    : ["teacher", "student"];

  const load = useCallback(
    async (targetPage: number) => {
        try {
        const result = await fetchUsers({
          page: targetPage,
          per_page: 15,
          role: (roleFilter || undefined) as UserRole | undefined,
          search: search || undefined,
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
    [roleFilter, search],
  );

  useEffect(() => {
    let ignore = false;
    fetchUsers({
      page,
      per_page: 15,
      role: (roleFilter || undefined) as UserRole | undefined,
      search: search || undefined,
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
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchSchools({ per_page: 100 })
      .then((result) => setSchools(result.data))
      .catch(() => setSchools([]));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role: "teacher",
      school_id: schools[0]?.id ?? 0,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item: User) => {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      password: "",
      password_confirmation: "",
      role: item.role,
      school_id: item.school_id ?? 0,
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        school_id: form.school_id || null,
        is_active: form.is_active,
      } as Partial<UserPayload>;
      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }
      if (editing) {
        await updateUser(editing.id, payload);
      } else {
        await createUser(payload as UserPayload);
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
      await deleteUser(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canCreate = hasPermission("users.create");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.users.title")}</h1>
        {canCreate && <Button onClick={openCreate}>{t("admin.users.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Input
            label={t("common.search")}
            placeholder={t("admin.users.search_placeholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-56">
          <Select
            aria-label={t("admin.users.role")}
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("admin.all")}</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {t(`admin.roles.${role}`)}
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
                    <th className="px-5 py-3">{t("admin.users.name")}</th>
                    <th className="px-5 py-3">{t("common.email")}</th>
                    <th className="px-5 py-3">{t("admin.users.role")}</th>
                    <th className="px-5 py-3">{t("admin.school")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.is_active ? t("admin.active") : t("admin.inactive")}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.email}</td>
                      <td className="px-5 py-3">
                        <Badge variant={item.role === "admin_system" ? "danger" : "info"}>
                          {t(`admin.roles.${item.role}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.school?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            {t("common.edit")}
                          </Button>
                          {isSystemAdmin && item.id !== user?.id && (
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
            totalLabel={t("admin.users.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("admin.users.edit") : t("admin.users.create")}
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
            label={t("admin.users.name")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label={t("common.email")}
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <Select
            label={t("admin.users.role")}
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
          >
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {t(`admin.roles.${role}`)}
              </option>
            ))}
          </Select>
          <Select
            label={t("admin.school")}
            value={form.school_id ?? 0}
            disabled={!isSystemAdmin}
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
            label={t(editing ? "admin.users.new_password" : "common.password")}
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <Input
            label={t("admin.users.password_confirmation")}
            type="password"
            value={form.password_confirmation}
            onChange={(event) =>
              setForm({ ...form, password_confirmation: event.target.value })
            }
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
        title={t("admin.users.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}