export type SightTier = 1 | 2 | 3;

export interface SavedContent {
  id: string;
  language: string;
  length: string;
  interests: string;
  content: string;
  createdAt: Date;
}

export interface Sight {
  id: number | string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distance?: number;
  imageUrl: string;
  yearBuilt?: number;
  briefDescription: string;
  fullDescription: string;
  briefDescriptionDE: string;
  fullDescriptionDE: string;
  rating?: number;
  placeId?: string;
  tier: SightTier;
  savedContent?: SavedContent[];
}