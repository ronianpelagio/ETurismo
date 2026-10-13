import { supabase } from "./supabase";
import type { ArtifactLanguageCode } from "../features/artifacts/config";


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
  // Diagnostic information
  console.log("[AZURE TTS] Artifact ID:", artifactId);
  console.log("[AZURE TTS] Language:", language);

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
        // Preserve the original error.
      }
    }

    throw new Error(`Azure audio generation failed: ${message}`);
  }

  if (!data?.success || !data?.audioUrl) {
    throw new Error(
      data?.error || "The Edge Function did not return an audio URL.",
    );
  }

  return {
    success: true,
    audioUrl: data.audioUrl,
  };
  
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
