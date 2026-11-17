/**
 * i18n setup for the ETurismo Admin panel.
 *
 * Uses i18next directly (no HTTP backend — translations are bundled as TS
 * modules so there is no extra network request and the compiler validates keys).
 *
 * Supported languages:
 *   en  – English  (default)
 *   fil – Filipino / Tagalog
 *
 * The chosen language is persisted in localStorage under "admin:lang".
 * Import this file once at the app entry point (main.tsx / App.tsx) so the
 * i18next instance is initialised before any component reads from it.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import fil from "./locales/fil";

export const ADMIN_LANGUAGES = [
  { code: "en",  label: "English",           nativeLabel: "English"  },
  { code: "fil", label: "Filipino (Tagalog)", nativeLabel: "Filipino" },
] as const;

export type AdminLangCode = (typeof ADMIN_LANGUAGES)[number]["code"];

const STORAGE_KEY = "admin:lang";

function savedLang(): AdminLangCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "fil") return v;
  } catch {
    // private browsing
  }
  return "en";
}

i18n
  .use(initReactI18next)
  .init({
    lng: savedLang(),
    fallbackLng: "en",
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    resources: {
      en:  { translation: en },
      fil: { translation: fil },
    },
  });

/** Persist and switch the active language. */
export function setAdminLanguage(code: AdminLangCode) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore
  }
  i18n.changeLanguage(code);
}

export { i18n };
export default i18n;
