"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/communication-api";
import { useI18n } from "@/lib/i18n";
import type { UserNotification } from "@/lib/types";

export default function NotificationsPage() {
  const { t } = useI18n();

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchNotifications({ per_page: 50 })
      .then((result) => setNotifications(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : t("notifications.load_error")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (notification: UserNotification) => {
    if (notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.load_error"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.load_error"));
    }
  };

  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t("notifications.title")}</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t("notifications.mark_all_read")}
          </Button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <Card>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">{t("admin.empty")}</p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleMarkRead(notification)}
                className={`block w-full rounded-lg border p-4 text-left transition-colors ${
                  notification.is_read
                    ? "border-slate-200 bg-slate-50"
                    : "border-indigo-200 bg-indigo-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!notification.is_read && <Badge variant="info">{t("notifications.new")}</Badge>}
                      <p className="font-medium text-slate-900">{notification.title}</p>
                    </div>
                    {notification.body && (
                      <p className="text-sm text-slate-600">{notification.body}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                  {notification.action_url && (
                    <Link
                      href={notification.action_url}
                      className="shrink-0 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      {t("notifications.view")}
                    </Link>
                  )}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}