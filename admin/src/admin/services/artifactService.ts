import { supabase } from "./supabase";
import type { ArtifactLanguageCode } from "../features/artifacts/config";

const AUDIO_API_URL =
  (import.meta.env.VITE_AUDIO_API_URL as string | undefined) ||
  "https://eturismoadminn.up.railway.app";

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

export async function generateArtifactAudio(
  artifactId: string,
  text: string,
  language: ArtifactLanguageCode,
  voiceName?: string,
  speakingRate?: number,
): Promise<{ success: boolean; audioUrl: string; error?: string }> {
  const response = await fetch(`${AUDIO_API_URL}/generate-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      artifactId,
      text,
      lang: language,
      voiceName,
      speakingRate: speakingRate || 1,
    }),
  });
  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.error || "Failed to generate audio");
  }
  return response.json();
}

export async function upsertArtifactTranslation(
  artifactId: string,
  language: ArtifactLanguageCode,
  name: string,
  description: string,
  existingId?: string,
) {
  if (existingId) {
    return supabase
      .from("artifact_translations")
      .update({ name, description })
      .eq("id", existingId);
  }
  return supabase.from("artifact_translations").insert({
    artifact_id: artifactId,
    language_code: language,
    name,
    description,
  });
}
