"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Modal } from "@/components/admin/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  fetchDocuments,
} from "@/lib/communication-api";
import { useI18n } from "@/lib/i18n";
import type { Document } from "@/lib/types";

export default function DocumentsPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<Document | null>(null);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(
    (categoryValue: string) => {
      fetchDocuments({ per_page: 100, category: categoryValue || undefined })
        .then((result) => setDocuments(result.data))
        .catch((err) => setError(err instanceof Error ? err.message : t("documents.load_error")))
        .finally(() => setLoading(false));
    },
    [t],
  );

  useEffect(() => {
    fetchDocuments({ per_page: 100 })
      .then((result) => {
        setDocuments(result.data);
        const set = new Set<string>();
        for (const doc of result.data) {
          if (doc.category) set.add(doc.category);
        }
        setCategories(Array.from(set));
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("documents.load_error")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (filterCategory === "") return;
    loadDocuments(filterCategory);
  }, [filterCategory, loadDocuments]);

  const openUpload = () => {
    setTitle("");
    setCategory("");
    setIsPrivate(true);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!title || !file) {
      setError(t("documents.form_required"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("category", category || "");
      form.append("is_private", String(isPrivate));
      form.append("file", file);
      await createDocument(form);
      setUploadOpen(false);
      const result = await fetchDocuments({ per_page: 100 });
      setDocuments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("documents.load_error"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteDocument(deleting.id);
      setDeleting(null);
      const result = await fetchDocuments({ per_page: 100 });
      setDocuments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("documents.load_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    setDownloadId(doc.id);
    setError("");
    try {
      await downloadDocument(doc.id, doc.file_name ?? `document-${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("documents.load_error"));
    } finally {
      setDownloadId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("documents.title")}</h1>
        {hasPermission("documents.create") && (
          <Button onClick={openUpload}>{t("documents.upload")}</Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select
            label={t("documents.category")}
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
          >
            <option value="">{t("admin.all")}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">{t("admin.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t("documents.title")}</th>
                    <th className="px-5 py-3">{t("documents.category")}</th>
                    <th className="px-5 py-3">{t("documents.file_name")}</th>
                    <th className="px-5 py-3">{t("documents.size")}</th>
                    <th className="px-5 py-3">{t("documents.visibility")}</th>
                    <th className="px-5 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{doc.title}</td>
                      <td className="px-5 py-3 text-slate-600">{doc.category ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{doc.file_name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{doc.size_human ?? "—"}</td>
                      <td className="px-5 py-3">
                        {doc.is_private ? (
                          <Badge variant="default">{t("documents.private")}</Badge>
                        ) : (
                          <Badge variant="info">{t("documents.shared")}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission("documents.view") && (
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={downloadId === doc.id}
                              onClick={() => handleDownload(doc)}
                            >
                              {t("documents.download")}
                            </Button>
                          )}
                          {hasPermission("documents.delete") && (
                            <Button variant="danger" size="sm" onClick={() => setDeleting(doc)}>
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
        </CardContent>
      </Card>

      <Modal
        open={uploadOpen}
        title={t("documents.upload")}
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitUpload} isLoading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("documents.title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            label={t("documents.category")}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <label className="block text-sm font-medium text-slate-700">
            {t("documents.file")}
            <input
              ref={fileInputRef}
              type="file"
              className="mt-1 block w-full text-sm text-slate-600"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            {t("documents.private")}
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("documents.delete")}
        message={t("admin.confirm_delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={saving}
      />
    </div>
  );
}