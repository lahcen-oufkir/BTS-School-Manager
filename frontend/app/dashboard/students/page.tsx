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
  createStudent,
  deleteStudent,
  fetchClasses,
  fetchSchools,
  fetchStudents,
  updateStudent,
  type StudentPayload,
} from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { School, SchoolClass, Student, StudentStatus } from "@/lib/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const statusVariant: Record<StudentStatus, BadgeVariant> = {
  active: "success",
  graduated: "info",
  transferred: "warning",
  withdrawn: "danger",
  suspended: "danger",
  inactive: "default",
};

const statuses: StudentStatus[] = [
  "active",
  "graduated",
  "transferred",
  "withdrawn",
  "suspended",
  "inactive",
];

const emptyForm: StudentPayload = {
  school_id: 0,
  first_name: "",
  last_name: "",
  student_number: "",
  cne: "",
  cin: "",
  birth_date: "",
  birth_place: "",
  gender: "male",
  address: "",
  city: "",
  phone: "",
  email: "",
  password: "",
  password_confirmation: "",
  status: "active",
  class_id: null,
  guardian: {
    first_name: "",
    last_name: "",
    relationship: "parent",
    phone: "",
    email: "",
  },
};

export default function StudentsPage() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();

  const [items, setItems] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "">("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentPayload>(emptyForm);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      try {
        const result = await fetchStudents({
          page: targetPage,
          per_page: 15,
          status: statusFilter || undefined,
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
    [statusFilter, query],
  );

  const runSearch = () => {
    setQuery(search);
    setPage(1);
  };

  useEffect(() => {
    let ignore = false;
    fetchStudents({
      page,
      per_page: 15,
      status: statusFilter || undefined,
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
  }, [page, statusFilter, query]);

  useEffect(() => {
    fetchClasses({ per_page: 100 })
      .then((result) => setClasses(result.data))
      .catch(() => setClasses([]));
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

  const openEdit = (item: Student) => {
    const guardian = item.guardians[0];
    setEditing(item);
    setForm({
      school_id: item.school_id,
      first_name: item.first_name,
      last_name: item.last_name,
      student_number: item.student_number ?? "",
      cne: item.cne ?? "",
      cin: item.cin ?? "",
      birth_date: item.birth_date ?? "",
      birth_place: item.birth_place ?? "",
      gender: item.gender ?? "male",
      address: item.address ?? "",
      city: item.city ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      password: "",
      password_confirmation: "",
      status: item.status,
      class_id: item.current_class?.id ?? null,
      guardian: guardian
        ? {
            first_name: guardian.first_name,
            last_name: guardian.last_name,
            relationship: guardian.relationship ?? "parent",
            phone: guardian.phone ?? "",
            email: guardian.email ?? "",
          }
        : null,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: StudentPayload = {
        ...form,
        guardian: form.guardian?.first_name ? form.guardian : null,
        class_id: form.class_id ?? null,
      };
      if (editing) {
        await updateStudent(editing.id, payload);
      } else {
        await createStudent(payload);
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
      await deleteStudent(deleting.id);
      setDeleting(null);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const canManage =
    hasPermission("students.create") ||
    hasPermission("students.update") ||
    hasPermission("students.delete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("students.title")}</h1>
        {canManage && <Button onClick={openCreate}>{t("students.create")}</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Input
            label={t("common.search")}
            placeholder={t("students.search_placeholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label={t("common.status")}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StudentStatus | "");
              setPage(1);
            }}
          >
            <option value="">{t("admin.all")}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`students.status_${status}`)}
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
                    <th className="px-5 py-3">{t("students.first_name")}</th>
                    <th className="px-5 py-3">{t("students.student_number")}</th>
                    <th className="px-5 py-3">{t("students.cne")}</th>
                    <th className="px-5 py-3">{t("students.class")}</th>
                    <th className="px-5 py-3">{t("students.guardian")}</th>
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
                        {item.city && (
                          <div className="text-xs text-slate-500">{item.city}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.student_number ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{item.cne ?? "—"}</td>
                      <td className="px-5 py-3">
                        {item.current_class ? (
                          <Badge variant="info">{item.current_class.name}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">{t("students.no_class")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {item.guardians[0]
                          ? `${item.guardians[0].first_name} ${item.guardians[0].last_name}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[item.status]}>
                          {t(`students.status_${item.status}`)}
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
            totalLabel={t("students.title")}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("students.edit") : t("students.create")}
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

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t("students.student_number")}
              value={form.student_number}
              onChange={(event) => setForm({ ...form, student_number: event.target.value })}
            />
            <Input
              label={t("students.cne")}
              value={form.cne}
              onChange={(event) => setForm({ ...form, cne: event.target.value })}
            />
            <Input
              label={t("students.cin")}
              value={form.cin}
              onChange={(event) => setForm({ ...form, cin: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label={t("students.birth_date")}
              value={form.birth_date}
              onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
            />
            <Input
              label={t("students.birth_place")}
              value={form.birth_place}
              onChange={(event) => setForm({ ...form, birth_place: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("students.gender")}
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value })}
            >
              <option value="male">{t("students.gender_male")}</option>
              <option value="female">{t("students.gender_female")}</option>
              <option value="other">{t("students.gender_other")}</option>
            </Select>
            <Select
              label={t("students.class")}
              value={form.class_id ?? 0}
              onChange={(event) =>
                setForm({ ...form, class_id: Number(event.target.value) || null })
              }
            >
              <option value={0}>{t("students.no_class")}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label={t("common.status")}
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as StudentStatus })
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`students.status_${status}`)}
              </option>
            ))}
          </Select>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="mb-1 text-sm font-semibold text-indigo-800">
              {t("students.login_account")}
            </p>
            <p className="mb-3 text-xs text-slate-500">
              {t("students.login_hint")}
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Input
                type="email"
                label={t("students.email")}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="password"
                  label={t("students.password")}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={editing ? t("students.password_edit_placeholder") : ""}
                />
                <Input
                  type="password"
                  label={t("students.password_confirmation")}
                  value={form.password_confirmation}
                  onChange={(event) =>
                    setForm({ ...form, password_confirmation: event.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("students.address")}
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
            <Input
              label={t("students.city")}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("students.phone")}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Input
              type="email"
              label={t("students.email")}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t("students.guardian")}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("students.guardian_first_name")}
                value={form.guardian?.first_name ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    guardian: { ...form.guardian, first_name: event.target.value },
                  })
                }
              />
              <Input
                label={t("students.guardian_last_name")}
                value={form.guardian?.last_name ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    guardian: { ...form.guardian, last_name: event.target.value },
                  })
                }
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Select
                label={t("students.guardian_relationship")}
                value={form.guardian?.relationship ?? "parent"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    guardian: { ...form.guardian, relationship: event.target.value },
                  })
                }
              >
                <option value="parent">{t("students.relationship_parent")}</option>
                <option value="tutor">{t("students.relationship_tutor")}</option>
                <option value="other">{t("students.relationship_other")}</option>
              </Select>
              <Input
                label={t("students.phone")}
                value={form.guardian?.phone ?? ""}
                onChange={(event) =>
                  setForm({ ...form, guardian: { ...form.guardian, phone: event.target.value } })
                }
              />
              <Input
                type="email"
                label={t("students.email")}
                value={form.guardian?.email ?? ""}
                onChange={(event) =>
                  setForm({ ...form, guardian: { ...form.guardian, email: event.target.value } })
                }
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("students.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}
