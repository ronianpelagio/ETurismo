import { supabase } from "./supabase";
import type { ArtifactLanguageCode } from "../features/artifacts/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    array[index] = bytes.charCodeAt(index);
  }
  return new Blob([array], { type: mime });
}

export async function uploadArtifactImage(
  artifactId: string,
  file: File,
): Promise<string> {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `artifacts/${artifactId}.${extension}`;
  const { error } = await supabase.storage
    .from("artifact-images")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from("artifact-images").getPublicUrl(path).data
    .publicUrl;
}

// ─── TTS routing ──────────────────────────────────────────────────────────────

// Languages with Azure neural voices served by the Supabase Edge Function.
const AZURE_SUPPORTED = new Set(["en", "fil", "ja", "es", "ko"]);

// Local Philippine-dialect languages route to the gSpeak backend server.
// ceb / ilo / hil have no dedicated Azure voices; the backend maps them to
// the Filipino (tl) Google TTS voice.
const BACKEND_URL =
  import.meta.env.VITE_AUDIO_API_URL || "http://localhost:5000";

// ─── generateArtifactAudio ────────────────────────────────────────────────────

export async function generateArtifactAudio(
  artifactId: string,
  text: string,
  language: ArtifactLanguageCode,
  voiceName?: string,
  speakingRate?: number,
): Promise<{ success: boolean; audioUrl: string; error?: string }> {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!artifactId || !uuidPattern.test(artifactId)) {
    throw new Error(
      `Invalid artifact ID: ${String(artifactId)}. Save the artifact before generating audio.`,
    );
  }

  if (!text.trim()) {
    throw new Error("Narration text cannot be empty.");
  }

  // ── Philippine dialect languages → local gSpeak backend ──────────────────
  if (!AZURE_SUPPORTED.has(language)) {
    console.log(`[gSpeak TTS] Language ${language} – routing to local backend`);
    const res = await fetch(`${BACKEND_URL}/generate-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactId,
        text,
        lang: language,
        voiceName: voiceName || undefined,
        speakingRate: speakingRate ?? 1,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        `Audio generation failed for ${language}: ${data.error || res.statusText}`,
      );
    }

    return { success: true, audioUrl: data.audioUrl };
  }

  // ── Azure TTS via Supabase Edge Function (en / fil / ja / es / ko) ────────
  console.log("[AZURE TTS] Artifact ID:", artifactId);
  console.log("[AZURE TTS] Language:", language);

  const { data, error } = await supabase.functions.invoke(
    "generate-artifact-audio",
    {
      body: {
        artifactId,
        language,
        voiceName: voiceName || undefined,
        speakingRate: speakingRate ?? 1,
      },
    },
  );

  if (error) {
    let message = error.message;

    if (error.context instanceof Response) {
      try {
        const payload = await error.context.json();
        message = payload.error || payload.message || message;
      } catch {
        // Preserve original error.
      }
    }

    throw new Error(`Azure audio generation failed: ${message}`);
  }

  if (!data?.success || !data?.audioUrl) {
    throw new Error(
      data?.error || "The Edge Function did not return an audio URL.",
    );
  }

  return { success: true, audioUrl: data.audioUrl };
}

// ─── upsertArtifactTranslation ────────────────────────────────────────────────

export async function upsertArtifactTranslation(
  artifactId: string,
  language: ArtifactLanguageCode,
  name: string,
  description: string,
  existingId?: string,
  historicalSignificance?: string,
) {
  const payload = {
    name,
    description,
    historical_significance: historicalSignificance ?? null,
  };
  if (existingId) {
    return supabase
      .from("artifact_translations")
      .update(payload)
      .eq("id", existingId);
  }
  return supabase.from("artifact_translations").insert({
    artifact_id: artifactId,
    language_code: language,
    ...payload,
  });
}
