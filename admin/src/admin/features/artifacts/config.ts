export const ARTIFACT_CATEGORIES = [
  "Sacred Vessels",
  "Vestments",
  "Altar Furnishings",
  "Devotional Objects",
  "Sacramentals",
] as const;

export const ARTIFACT_LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", mmLang: "en-US" },
  { code: "fil", label: "Filipino", flag: "🇵🇭", mmLang: "tl-PH" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", mmLang: "ja-JP" },
  { code: "es", label: "Spanish", flag: "🇪🇸", mmLang: "es-ES" },
  { code: "ko", label: "Korean", flag: "🇰🇷", mmLang: "ko-KR" },
] as const;

export type ArtifactLanguageCode = (typeof ARTIFACT_LANGUAGES)[number]["code"];
