export interface ClothingItem {
  id: string;
  photoDataUri: string;
  category: string;
  subCategory: string;
  tags: string[];
  dominantColors: string[];
  hasPattern: boolean;
  patternDescription?: string;
}

export interface Inspiration {
  id: string;
  description: string;
  items: ClothingItem[];
}

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

export interface UserPreferences {
  gender?: Gender;
  stylePreferences?: string[];
  sizePreferences?: {
    tops?: string;
    bottoms?: string;
    shoes?: string;
  };
  colorPreferences?: string[];
  occasionPreferences?: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}
