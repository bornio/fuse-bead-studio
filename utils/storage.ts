import { Design, DesignIndexEntry } from '../types';

const KEYS = {
  INDEX: 'fusebeads:designIndex',
  CURRENT_ID: 'fusebeads:currentDesignId',
  DESIGN_PREFIX: 'fusebeads:design:',
};

export const MAX_DESIGNS = 30;

const designStorageKey = (id: string) => `${KEYS.DESIGN_PREFIX}${id}`;

// Grid Serialization
export function encodeGrid(cells: number[]): string {
  const bytes = new Uint8Array(cells);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function decodeGrid(b64: string): number[] {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return Array.from(bytes);
  } catch (e) {
    console.error("Failed to decode grid", e);
    return [];
  }
}

// Storage Helpers
export function getDesignIndex(): DesignIndexEntry[] {
  try {
    const json = localStorage.getItem(KEYS.INDEX);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

function saveDesignIndex(index: DesignIndexEntry[]) {
  localStorage.setItem(KEYS.INDEX, JSON.stringify(index));
}

export function saveDesign(design: Design) {
  try {
    // Save the full design record
    localStorage.setItem(designStorageKey(design.id), JSON.stringify(design));

    // Update the index
    const index = getDesignIndex();
    const entryIndex = index.findIndex((e) => e.id === design.id);
    const entry: DesignIndexEntry = {
      id: design.id,
      width: design.width,
      height: design.height,
      updatedAt: design.updatedAt,
    };

    if (entryIndex >= 0) {
      index[entryIndex] = entry;
    } else {
      index.push(entry);
    }
    
    // Sort by updated descending
    index.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Keep only most recent designs and clean up overflow records.
    const overflow = index.slice(MAX_DESIGNS);
    overflow.forEach((entry) => localStorage.removeItem(designStorageKey(entry.id)));
    saveDesignIndex(index.slice(0, MAX_DESIGNS));
  } catch (e) {
    console.error("Failed to save design", e);
    throw new Error("Storage full or unavailable");
  }
}

export function loadDesign(id: string): Design | null {
  try {
    const json = localStorage.getItem(designStorageKey(id));
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function getGalleryDesigns(): Design[] {
  const index = getDesignIndex();
  const designs: Design[] = [];

  index.forEach((entry) => {
    const design = loadDesign(entry.id);
    if (design) designs.push(design);
  });

  return designs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function deleteDesign(id: string) {
  try {
    localStorage.removeItem(designStorageKey(id));
    const index = getDesignIndex().filter((e) => e.id !== id);
    saveDesignIndex(index);
  } catch (e) {
    console.error("Failed to delete design", e);
  }
}

export function getCurrentDesignId(): string | null {
  return localStorage.getItem(KEYS.CURRENT_ID);
}

export function setCurrentDesignId(id: string | null) {
  if (id) {
    localStorage.setItem(KEYS.CURRENT_ID, id);
  } else {
    localStorage.removeItem(KEYS.CURRENT_ID);
  }
}

export function generateId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
