// ─────────────────────────────────────────────────────────────────────────────
//  ArtifactUtil.ts  –  Translation · TTS Audio · Supabase Upload
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../services/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LangCode =
  | "en"
  | "fil"
  | "ceb"
  | "ilo"
  | "hil"
  | "ja"
  | "es"
  | "ko";

export interface TranslationResult {
  name_en: string;
  name_fil: string;
  name_ceb: string;
  name_ilo: string;
  name_hil: string;
  name_ja: string;
  name_es: string;
  name_ko: string;
  description_en: string;
  description_fil: string;
  description_ceb: string;
  description_ilo: string;
  description_hil: string;
  description_ja: string;
  description_es: string;
  description_ko: string;
  historical_significance_en: string;
  historical_significance_fil: string;
  historical_significance_ceb: string;
  historical_significance_ilo: string;
  historical_significance_hil: string;
  historical_significance_ja: string;
  historical_significance_es: string;
  historical_significance_ko: string;
}

export interface AudioUploadResult {
  lang: string;
  url: string;
}

// ─── Language config ──────────────────────────────────────────────────────────
//
// googleCode: the BCP-47 code passed to Google Translate.
//   - ceb  → "ceb"  (Cebuano is supported by Google Translate)
//   - ilo  → "tl"   (no Ilocano in Google; falls back to Filipino)
//   - hil  → "tl"   (no Hiligaynon in Google; falls back to Filipino)
//
// ttsEngine: which backend handles audio generation.
//   - "azure"  → Supabase Edge Function (Azure Neural TTS)
//   - "gspeak" → local gSpeak backend server (Google TTS)

const LANG_CONFIG = [
  {
    code: "en" as const,
    label: "English",
    googleCode: "en",
    myMemoryCode: "en-US",
    dbDesc: "description_en",
    dbName: "name",
    dbHistSig: "historical_significance_en",
    dbAudio: "audio_en",
    ttsEngine: "azure" as const,
  },
  {
    code: "fil" as const,
    label: "Filipino",
    googleCode: "tl",
    myMemoryCode: "tl-PH",
    dbDesc: "description_fil",
    dbName: "name_fil",
    dbHistSig: "historical_significance_fil",
    dbAudio: "audio_fil",
    ttsEngine: "azure" as const,
  },
  {
    code: "ceb" as const,
    label: "Bisaya",
    googleCode: "ceb",
    myMemoryCode: "ceb-PH",
    dbDesc: "description_ceb",
    dbName: "name_ceb",
    dbHistSig: "historical_significance_ceb",
    dbAudio: "audio_ceb",
    ttsEngine: "gspeak" as const, // no Azure neural voice for Cebuano
  },
  {
    code: "ilo" as const,
    label: "Ilocano",
    googleCode: "tl", // Google has no Ilocano; translate via Filipino
    myMemoryCode: "ilo-PH",
    dbDesc: "description_ilo",
    dbName: "name_ilo",
    dbHistSig: "historical_significance_ilo",
    dbAudio: "audio_ilo",
    ttsEngine: "gspeak" as const, // no Azure neural voice for Ilocano
  },
  {
    code: "hil" as const,
    label: "Hiligaynon",
    googleCode: "tl", // Google has no Hiligaynon; translate via Filipino
    myMemoryCode: "hil-PH",
    dbDesc: "description_hil",
    dbName: "name_hil",
    dbHistSig: "historical_significance_hil",
    dbAudio: "audio_hil",
    ttsEngine: "gspeak" as const, // no Azure neural voice for Hiligaynon
  },
  {
    code: "ja" as const,
    label: "Japanese",
    googleCode: "ja",
    myMemoryCode: "ja-JP",
    dbDesc: "description_ja",
    dbName: "name_ja",
    dbHistSig: "historical_significance_ja",
    dbAudio: "audio_ja",
    ttsEngine: "azure" as const,
  },
  {
    code: "es" as const,
    label: "Spanish",
    googleCode: "es",
    myMemoryCode: "es-ES",
    dbDesc: "description_es",
    dbName: "name_es",
    dbHistSig: "historical_significance_es",
    dbAudio: "audio_es",
    ttsEngine: "azure" as const,
  },
  {
    code: "ko" as const,
    label: "Korean",
    googleCode: "ko",
    myMemoryCode: "ko-KR",
    dbDesc: "description_ko",
    dbName: "name_ko",
    dbHistSig: "historical_significance_ko",
    dbAudio: "audio_ko",
    ttsEngine: "azure" as const,
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 1 — translateAllLanguages
// ─────────────────────────────────────────────────────────────────────────────

export async function translateAllLanguages(
  sourceName: string,
  sourceDesc: string,
  onStep?: (msg: string) => void,
  email?: string,
  sourceHistSig?: string,
): Promise<TranslationResult> {
  if (!sourceName.trim()) {
    throw new Error(
      "Source name is empty. Please enter an English name first.",
    );
  }
  if (!sourceDesc.trim()) {
    throw new Error(
      "Source description is empty. Please enter an English description first.",
    );
  }

  // Split long text into sentence-boundary chunks so each API call stays
  // under the per-request limit.
  function chunkText(text: string, maxLen = 300): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace;
      }
      chunks.push(text.slice(start, end).trim());
      start = end;
    }
    return chunks;
  }

  // Primary: Google Translate (free public endpoint)
  async function translateWithGoogle(
    text: string,
    targetCode: string,
  ): Promise<string> {
    try {
      const url =
        `https://translate.googleapis.com/translate_a/single` +
        `?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);

      const data = await res.json();
      let translated = "";
      if (data?.[0]) {
        for (const part of data[0]) {
          if (part[0]) translated += part[0];
        }
      }
      return translated || text;
    } catch (err) {
      console.warn(`Google Translate failed for ${targetCode}:`, err);
      return text;
    }
  }

  // Fallback: MyMemory (free tier, 10 k words/day with email, 5 k without)
  async function translateWithMyMemory(
    text: string,
    targetCode: string,
  ): Promise<string> {
    try {
      const emailParam = email ? `&de=${encodeURIComponent(email)}` : "";
      const url =
        `https://api.mymemory.translated.net/get` +
        `?q=${encodeURIComponent(text)}&langpair=en|${targetCode}${emailParam}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

      const json = await res.json();
      if (json.responseStatus !== 200 && json.responseStatus !== "200") {
        throw new Error(json.responseDetails || "Translation failed");
      }

      let translated = (json.responseData?.translatedText as string) ?? text;
      translated = translated.replace(/\[[^\]]+\]$/, "").trim();
      return translated;
    } catch (err) {
      console.warn(`MyMemory failed for ${targetCode}:`, err);
      return text;
    }
  }

  async function translateFull(
    text: string,
    targetCode: string,
  ): Promise<string> {
    const chunks = chunkText(text);
    const parts = await Promise.all(
      chunks.map(async (chunk) => {
        let result = await translateWithGoogle(chunk, targetCode);
        // If Google returned the original text unchanged, try MyMemory.
        if (result === chunk) {
          result = await translateWithMyMemory(chunk, targetCode);
        }
        return result;
      }),
    );
    return parts.join(" ");
  }

  const result: TranslationResult = {
    name_en: sourceName,
    description_en: sourceDesc,
    historical_significance_en: sourceHistSig || "",
    name_fil: "",
    name_ceb: "",
    name_ilo: "",
    name_hil: "",
    name_ja: "",
    name_es: "",
    name_ko: "",
    description_fil: "",
    description_ceb: "",
    description_ilo: "",
    description_hil: "",
    description_ja: "",
    description_es: "",
    description_ko: "",
    historical_significance_fil: "",
    historical_significance_ceb: "",
    historical_significance_ilo: "",
    historical_significance_hil: "",
    historical_significance_ja: "",
    historical_significance_es: "",
    historical_significance_ko: "",
  };

  for (const lang of LANG_CONFIG.filter((l) => l.code !== "en")) {
    onStep?.(`Translating ${lang.label} name…`);
    try {
      const name = await translateFull(sourceName, lang.googleCode);
      (result as any)[lang.dbName] = name;
      console.log(`✅ ${lang.label} name:`, name);
    } catch (err: any) {
      console.error(`Failed to translate ${lang.label} name:`, err.message);
      (result as any)[lang.dbName] = sourceName;
    }

    onStep?.(`Translating ${lang.label} description…`);
    try {
      const desc = await translateFull(sourceDesc, lang.googleCode);
      (result as any)[lang.dbDesc] = desc;
      console.log(`✅ ${lang.label} description:`, desc.substring(0, 100));
    } catch (err: any) {
      console.error(
        `Failed to translate ${lang.label} description:`,
        err.message,
      );
      (result as any)[lang.dbDesc] = sourceDesc;
    }

    if (sourceHistSig?.trim()) {
      onStep?.(`Translating ${lang.label} historical significance…`);
      try {
        const histSig = await translateFull(sourceHistSig, lang.googleCode);
        (result as any)[lang.dbHistSig] = histSig;
        console.log(
          `✅ ${lang.label} historical significance:`,
          histSig.substring(0, 100),
        );
      } catch (err: any) {
        console.error(
          `Failed to translate ${lang.label} historical significance:`,
          err.message,
        );
        (result as any)[lang.dbHistSig] = sourceHistSig;
      }
    }
  }

  onStep?.("Translation complete ✓");
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 2 — saveAudioToSupabase
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAudioToSupabase(
  artifactId: string,
  audioBlob: Blob,
  langCode: LangCode,
  extension = "mp3",
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult> {
  const lang = LANG_CONFIG.find((l) => l.code === langCode);
  if (!lang) throw new Error(`Unknown language code: ${langCode}`);

  onStep?.(`Saving ${lang.label} audio reference…`);

  const audioMarker = `tts://${langCode}/${encodeURIComponent(artifactId)}`;
  const updateData: Record<string, string> = {};
  updateData[lang.dbAudio] = audioMarker;

  const { error: dbErr } = await supabase
    .from("artifacts")
    .update(updateData)
    .eq("id", artifactId);

  if (dbErr) {
    console.error("DB update error:", dbErr);
    throw new Error(`DB update failed for ${lang.label}: ${dbErr.message}`);
  }

  onStep?.(`${lang.label} audio reference saved ✓`);
  return { lang: langCode, url: audioMarker };
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 3 — generateAndSaveAllAudio
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAndSaveAllAudio(
  artifactId: string,
  descriptions: Partial<Record<LangCode, string>>,
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult[]> {
  const results: AudioUploadResult[] = [];

  for (const lang of LANG_CONFIG) {
    const text = descriptions[lang.code];
    if (!text?.trim()) continue;

    try {
      const audioMarker = `tts://${lang.code}/${encodeURIComponent(artifactId)}`;
      const updateData: Record<string, string> = {};
      updateData[lang.dbAudio] = audioMarker;

      await supabase.from("artifacts").update(updateData).eq("id", artifactId);

      results.push({ lang: lang.code, url: audioMarker });
      onStep?.(`✓ ${lang.label} audio ready`);
    } catch (err: any) {
      console.warn(
        `[generateAndSaveAllAudio] ${lang.label} skipped:`,
        err.message,
      );
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 4 — saveAudioDirect
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAudioDirect(
  artifactId: string,
  audioUrl: string,
  langCode: LangCode,
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult> {
  const lang = LANG_CONFIG.find((l) => l.code === langCode);
  if (!lang) throw new Error(`Unknown language code: ${langCode}`);

  onStep?.(`Saving ${lang.label} audio URL to database…`);

  const updateData: Record<string, string> = {};
  updateData[lang.dbAudio] = audioUrl;

  const { error: dbErr } = await supabase
    .from("artifacts")
    .update(updateData)
    .eq("id", artifactId);

  if (dbErr) {
    console.error("DB update error:", dbErr);
    throw new Error(`DB update failed for ${lang.label}: ${dbErr.message}`);
  }

  onStep?.(`${lang.label} audio URL saved ✓`);
  return { lang: langCode, url: audioUrl };
}
