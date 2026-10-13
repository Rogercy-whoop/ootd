// Free AI photo analyses per browser. Each photo a visitor adds is analysed once by
// Gemini's vision model; after this many, the browser cannot add more. The count lives
// in localStorage, so it is a per-browser limit (clearing site data resets it).
export const FREE_PHOTO_ANALYSES = 5;

const STORAGE_KEY = 'photoAnalysesUsed';

// closetSize covers closets filled before this counter existed.
export function photoAnalysesUsed(closetSize = 0): number {
  let stored = 0;
  try {
    stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
  } catch {
    // Storage blocked (e.g. private mode): fall back to the closet size.
  }
  return Math.max(stored, closetSize);
}

export function photoAnalysesLeft(closetSize = 0): number {
  return Math.max(0, FREE_PHOTO_ANALYSES - photoAnalysesUsed(closetSize));
}

export function recordPhotoAnalysis(closetSize = 0): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(photoAnalysesUsed(closetSize) + 1));
  } catch {
    // Nothing to do if storage is blocked.
  }
}
