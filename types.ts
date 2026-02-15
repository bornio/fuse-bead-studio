export interface PaletteColor {
  id: number;
  name: string;
  hex: string;
}

export interface BoardSize {
  label: string;
  width: number;
  height: number;
}

export type Tool = 'paint' | 'erase' | 'move';

export interface CellPatch {
  i: number;
  prev: number;
  next: number;
}

export type ActionType = 'stroke' | 'tap' | 'clear';

export interface HistoryAction {
  kind: ActionType;
  patches: CellPatch[];
}

export interface EditorState {
  width: number;
  height: number;
  cells: number[];
  history: {
    past: HistoryAction[];
    future: HistoryAction[];
  };
}

export interface Design {
  id: string;
  width: number;
  height: number;
  paletteVersion: string;
  gridB64: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignIndexEntry {
  id: string;
  width: number;
  height: number;
  updatedAt: string;
}
