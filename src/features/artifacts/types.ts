export type ArtifactTranslation = {
  id?: string;
  language_code: string;
  name: string;
  description: string | null;
  audio_url: string | null;
};
export type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string | null;
  qr_value?: string | null;
  created_at: string;
  date?: string;
  image_url?: string;
  is_exhibition?: boolean;
  is_crown?: boolean;
  is_artwork?: boolean;
  description?: string;
  creator?: string;
  Historical_Significance?: string;
  translations?: ArtifactTranslation[];
  audio_url?: string;
};
