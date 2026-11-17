import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Save, Check, Sun, Moon, Monitor, Languages } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmModal } from "../components/Modal";
import { useTheme } from "@/utils/theme";
import {
  ADMIN_LANGUAGES,
  setAdminLanguage,
  type AdminLangCode,
} from "../i18n";
import { cn } from "@/lib/utils";

// ─── Stored settings shape ────────────────────────────────────────────────────

type Settings = {
  museumName: string;
  timezone: string;
  notifications: boolean;
  compactDensity: boolean;
};

const SETTINGS_KEY = "ETurismoAdminSettings";

function loadSettings(): Settings {
  try {
    const v = localStorage.getItem(SETTINGS_KEY);
    if (v) return { ...defaultSettings(), ...JSON.parse(v) };
  } catch {
    // ignore
  }
  return defaultSettings();
}

function defaultSettings(): Settings {
  return {
    museumName: "ETurismo",
    timezone: "Asia/Manila",
    notifications: true,
    compactDensity: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState<Settings>(loadSettings);
  const [lang, setLang] = useState<AdminLangCode>(
    () => (i18n.language as AdminLangCode) ?? "en",
  );
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep local lang state in sync if the i18n language changes externally
  useEffect(() => {
    const onLangChange = (lng: string) => setLang(lng as AdminLangCode);
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
    } catch {
      // private browsing
    }
    // Apply selected language
    setAdminLanguage(lang);
    setShowModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  const handleLangChange = (code: AdminLangCode) => {
    setLang(code);
    // Apply immediately so the rest of the page re-renders in real time
    setAdminLanguage(code);
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
        actions={
          <Button onClick={() => setShowModal(true)} className="rounded-xl">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {t("settings.saveChanges")}
          </Button>
        }
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="rounded-xl border border-border bg-card p-1">
          <TabsTrigger value="general" className="rounded-lg text-xs data-[state=active]:bg-muted">
            {t("settings.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg text-xs data-[state=active]:bg-muted">
            {t("settings.tabs.preferences")}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg text-xs data-[state=active]:bg-muted">
            {t("settings.tabs.appearance")}
          </TabsTrigger>
        </TabsList>

        {/* ── General tab ───────────────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card className="rounded-2xl border-border bg-card p-6 space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("settings.general.museumName")}</Label>
                <Input
                  value={form.museumName}
                  onChange={(e) => setForm({ ...form, museumName: e.target.value })}
                  className="h-10 rounded-xl bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("settings.general.timezone")}</Label>
                <Input
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="h-10 rounded-xl bg-muted/40"
                />
              </div>
            </div>

            {/* ── Language picker ─────────────────────────────────────────── */}
            <div className="space-y-2.5 border-t border-border pt-5">
              <div className="flex items-center gap-2">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">
                  {t("settings.language.label")}
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.language.hint")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {ADMIN_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleLangChange(l.code as AdminLangCode)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition",
                      lang === l.code
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted/30 text-foreground hover:border-foreground/40 hover:bg-muted/60",
                    )}
                  >
                    <span className="text-xs font-semibold leading-tight">
                      {l.nativeLabel}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] leading-tight",
                        lang === l.code ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {l.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ── Preferences tab ───────────────────────────────────────────────── */}
        <TabsContent value="preferences">
          <Card className="rounded-2xl border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("settings.preferences.notifications")}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.preferences.notificationsDesc")}
                </p>
              </div>
              <Switch
                checked={form.notifications}
                onCheckedChange={(v) => setForm({ ...form, notifications: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-4">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("settings.preferences.compactDensity")}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.preferences.compactDensityDesc")}
                </p>
              </div>
              <Switch
                checked={form.compactDensity}
                onCheckedChange={(v) => setForm({ ...form, compactDensity: v })}
              />
            </div>
          </Card>
        </TabsContent>

        {/* ── Appearance tab ────────────────────────────────────────────────── */}
        <TabsContent value="appearance">
          <Card className="rounded-2xl border-border bg-card p-6">
            <div className="space-y-3">
              <Label className="text-xs font-semibold">
                {t("settings.appearance.title")}
              </Label>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    { value: "light",  Icon: Sun,     label: t("settings.appearance.light")  },
                    { value: "dark",   Icon: Moon,    label: t("settings.appearance.dark")   },
                    { value: "system", Icon: Monitor, label: t("settings.appearance.system") },
                  ] as const
                ).map(({ value, Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition",
                      theme === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted/30 text-foreground hover:border-foreground/40 hover:bg-muted/60",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Saved toast ───────────────────────────────────────────────────────── */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl border border-border bg-popover px-4 py-2.5 text-sm shadow-2xl"
        >
          <Check className="h-3.5 w-3.5" />
          {t("settings.saved")}
        </motion.div>
      )}

      {/* ── Confirm modal ─────────────────────────────────────────────────────── */}
      <ConfirmModal
        open={showModal}
        onOpenChange={setShowModal}
        title={t("settings.confirmTitle")}
        description={t("settings.confirmDesc", { name: form.museumName })}
        confirmLabel={t("settings.confirmLabel")}
        onConfirm={handleSave}
      />
    </div>
  );
}
