import { Design, DesignIndexEntry } from '../types';

const KEYS = {
  INDEX: 'fusebeads:designIndex',
  CURRENT_ID: 'fusebeads:currentDesignId',
  DESIGN_PREFIX: 'fusebeads:design:',
};

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
    localStorage.setItem(`${KEYS.DESIGN_PREFIX}${design.id}`, JSON.stringify(design));

    // Update the index
    const index = getDesignIndex();
    const entryIndex = index.findIndex((e) => e.id === design.id);
    const entry: DesignIndexEntry = {
      id: design.id,
      name: design.name,
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
    
    saveDesignIndex(index);
  } catch (e) {
    console.error("Failed to save design", e);
    throw new Error("Storage full or unavailable");
  }
}

export function loadDesign(id: string): Design | null {
  try {
    const json = localStorage.getItem(`${KEYS.DESIGN_PREFIX}${id}`);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function deleteDesign(id: string) {
  try {
    localStorage.removeItem(`${KEYS.DESIGN_PREFIX}${id}`);
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
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}