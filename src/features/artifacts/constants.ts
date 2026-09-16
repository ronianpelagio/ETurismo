import type { Artifact } from './types';

export const ARTIFACT_CATEGORIES = [
  'Sacred Vessels',
  'Vestments',
  'Altar Furnishings',
  'Devotional Objects',
  'Sacramentals',
] as const;

export type ArtifactCategory = (typeof ARTIFACT_CATEGORIES)[number];
export type ArtifactTab = 'All' | ArtifactCategory;

export const ARTIFACT_TABS: ArtifactTab[] = ['All', ...ARTIFACT_CATEGORIES];

export const ARTIFACT_TAB_ICONS: Record<ArtifactTab, string> = {
  All: 'apps-outline',
  'Sacred Vessels': 'wine-outline',
  Vestments: 'shirt-outline',
  'Altar Furnishings': 'flame-outline',
  'Devotional Objects': 'heart-outline',
  Sacramentals: 'sparkles-outline',
};

export const ARTIFACT_CATEGORY_IMAGES: Record<string, string> = {
  Vestments: 'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels': 'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings': 'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  Sacramentals: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

export function getArtifactImage(artifact: Pick<Artifact, 'image_url' | 'category'>) {
  return artifact.image_url ?? ARTIFACT_CATEGORY_IMAGES[artifact.category];
}
