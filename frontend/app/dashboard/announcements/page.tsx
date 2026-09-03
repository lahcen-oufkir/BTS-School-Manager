"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchClasses, fetchPrograms } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  type AnnouncementPayload,
} from "@/lib/communication-api";
import { useI18n } from "@/lib/i18n";
import type { Announcement, AnnouncementAudience, Program, SchoolClass } from "@/lib/types";

const audiences: AnnouncementAudience[] = ["everyone", "teachers", "students", "class", "program"];

const emptyForm: AnnouncementPayload = {
  title: "",
  content: "",
  audience: "everyone",
  class_id: null,
  program_id: null,
  published_at: null,
  expires_at: null,
};

const audienceLabel = (audience: AnnouncementAudience, t: (k: string) => string) => {
  switch (audience) {
    case "everyone":
      return t("announcements.audience_everyone");
    case "teachers":
      return t("announcements.audience_teachers");
    case "students":
      return t("announcements.audience_students");
    case "class":
      return t("announcements.audience_class");
    case "program":
      return t("announcements.audience_program");
  }
};

export default function AnnouncementsPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementPayload>(emptyForm);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements({ per_page: 100 })
      .then((result) => setAnnouncements(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : t("announcements.load_error")))
      .finally(() => setLoading(false));
    fetchClasses({ per_page: 100 })
      .then((result) => setClasses(result.data))
      .catch(() => setClasses([]));
    fetchPrograms({ per_page: 100 })
      .then((result) => setPrograms(result.data))
      .catch(() => setPrograms([]));
  }, [t]);

  const sorted = useMemo(
    () =>
      [...announcements].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      ),
    [announcements],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      audience: announcement.audience,
      class_id: announcement.class_id ?? null,
      program_id: announcement.program_id ?? null,
      published_at: announcement.published_at ?? null,
      expires_at: announcement.expires_at ?? null,
      is_archived: announcement.is_archived,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title || !form.content) {
      setError(t("announcements.form_required"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        class_id: form.audience === "class" ? form.class_id : null,
        program_id: form.audience === "program" ? form.program_id : null,
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
      } else {
        await createAnnouncement(payload);
      }
      setModalOpen(false);
      const result = await fetchAnnouncements({ per_page: 100 });
      setAnnouncements(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("announcements.load_error"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteAnnouncement(deleting.id);
      setDeleting(null);
      const result = await fetchAnnouncements({ per_page: 100 });
      setAnnouncements(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("announcements.load_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("announcements.title")}</h1>
        {hasPermission("announcements.create") && (
          <Button onClick={openCreate}>{t("announcements.create")}</Button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <Card>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">{t("admin.empty")}</p>
          ) : (
            sorted.map((announcement) => (
              <article
                key={announcement.id}
                className={`rounded-lg border border-slate-200 p-4 ${announcement.is_published ? "bg-white" : "bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{announcement.title}</h2>
                      {announcement.is_published ? (
                        <Badge variant="success">{t("announcements.published")}</Badge>
                      ) : (
                        <Badge variant="default">{t("announcements.draft")}</Badge>
                      )}
                      <Badge variant="info">{audienceLabel(announcement.audience, t)}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{announcement.content}</p>
                    <p className="text-xs text-slate-400">
                      {announcement.author
                        ? `${announcement.author.name} · `
                        : ""}
                      {announcement.created_at
                        ? new Date(announcement.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                  {hasPermission("announcements.update") && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(announcement)}>
                        {t("common.edit")}
                      </Button>
                      {hasPermission("announcements.delete") && (
                        <Button variant="danger" size="sm" onClick={() => setDeleting(announcement)}>
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t("announcements.edit") : t("announcements.create")}
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
            label={t("announcements.title_label")}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <label className="block text-sm font-medium text-slate-700">
            {t("announcements.content_label")}
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={4}
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
            />
          </label>
          <Select
            label={t("announcements.audience")}
            value={form.audience}
            onChange={(event) =>
              setForm({ ...form, audience: event.target.value as AnnouncementAudience })
            }
          >
            {audiences.map((audience) => (
              <option key={audience} value={audience}>
                {audienceLabel(audience, t)}
              </option>
            ))}
          </Select>

          {form.audience === "class" && (
            <Select
              label={t("announcements.class")}
              value={form.class_id ?? 0}
              onChange={(event) =>
                setForm({ ...form, class_id: Number(event.target.value) || null })
              }
            >
              <option value={0}>{t("common.select")}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </Select>
          )}

          {form.audience === "program" && (
            <Select
              label={t("announcements.program")}
              value={form.program_id ?? 0}
              onChange={(event) =>
                setForm({ ...form, program_id: Number(event.target.value) || null })
              }
            >
              <option value={0}>{t("common.select")}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </Select>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.published_at !== null}
              onChange={(event) =>
                setForm({
                  ...form,
                  published_at: event.target.checked ? new Date().toISOString() : null,
                })
              }
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            {t("announcements.auto_publish")}
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("announcements.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}