"use client";

import { useAuth } from "@/lib/auth";
import { useI18n, AVAILABLE_LOCALES, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale, isRTL } = useI18n();

  const roleLabels: Record<string, string> = {
    admin_system: "Administrateur système",
    admin_establishment: "Administrateur d'établissement",
    teacher: "Enseignant",
    student: "Étudiant",
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
        <p className="text-xs text-slate-500">
          {user ? roleLabels[user.role] ?? user.role : ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="relative"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <select
            aria-label={t("settings.language")}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {AVAILABLE_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={() => logout()}>
          {t("common.logout")}
        </Button>
      </div>
    </header>
  );
}