"use client";

import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("settings.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Configuration de l&apos;établissement, année scolaire et paramètres du système.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
