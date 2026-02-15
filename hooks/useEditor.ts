import { useState, useCallback, useRef, useEffect } from 'react';
import { BoardSize, CellPatch, HistoryAction, Tool, Design } from '../types';
import { DEFAULT_BOARD_SIZE, BOARD_SIZES } from '../constants';
import * as storage from '../utils/storage';

type PersistedSnapshot = {
  width: number;
  height: number;
  gridB64: string;
};

const createBlankCells = (size: Pick<BoardSize, 'width' | 'height'>): number[] =>
  new Array(size.width * size.height).fill(0);

const createEmptyHistory = () => ({
  past: [] as HistoryAction[],
  future: [] as HistoryAction[],
});

const createSnapshot = (
  size: Pick<BoardSize, 'width' | 'height'>,
  nextCells: number[]
): PersistedSnapshot => ({
  width: size.width,
  height: size.height,
  gridB64: storage.encodeGrid(nextCells),
});

const isValidCellIndex = (index: number, cellCount: number) => index >= 0 && index < cellCount;

const getStrokeTargetValue = (tool: Tool, activeColorId: number): number | null => {
  if (tool === 'paint') return activeColorId;
  if (tool === 'erase') return 0;
  return null; // move tool (or any future non-paint tool)
};

export const useEditor = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [cells, setCells] = useState<number[]>(() => createBlankCells(DEFAULT_BOARD_SIZE));

  const [history, setHistory] = useState<{ past: HistoryAction[]; future: HistoryAction[] }>(
    createEmptyHistory
  );

  const [activeTool, setActiveTool] = useState<Tool>('paint');
  const [activeColorId, setActiveColorId] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);

  // Persistence State
  const [currentDesignId, setCurrentDesignIdState] = useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = useState(storage.getGalleryDesigns());

  const currentStrokeRef = useRef<Map<number, CellPatch>>(new Map());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDesignIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  const persistedSnapshotRef = useRef<PersistedSnapshot | null>(null);
  if (!persistedSnapshotRef.current) {
    const initialCells = createBlankCells(DEFAULT_BOARD_SIZE);
    persistedSnapshotRef.current = createSnapshot(DEFAULT_BOARD_SIZE, initialCells);
  }

  // --- Persistence Logic ---

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const setCurrentDesignId = useCallback((id: string | null) => {
    currentDesignIdRef.current = id;
    setCurrentDesignIdState(id);
    storage.setCurrentDesignId(id);
  }, []);

  const refreshDesignList = useCallback(() => {
    setSavedDesigns(storage.getGalleryDesigns());
  }, []);

  const markPersistedSnapshot = useCallback(
    (size: Pick<BoardSize, 'width' | 'height'>, nextCells: number[]) => {
      persistedSnapshotRef.current = createSnapshot(size, nextCells);
    },
    []
  );

  const isStateDirty = useCallback((nextCells: number[], nextSize: BoardSize) => {
    const snapshot = persistedSnapshotRef.current;
    if (!snapshot) return true;
    if (snapshot.width !== nextSize.width || snapshot.height !== nextSize.height) return true;
    return snapshot.gridB64 !== storage.encodeGrid(nextCells);
  }, []);

  const resetToBlankDesign = useCallback(
    (size: BoardSize = DEFAULT_BOARD_SIZE) => {
      const blankCells = createBlankCells(size);
      setBoardSize(size);
      setCells(blankCells);
      setHistory(createEmptyHistory());
      setCurrentDesignId(null);
      markPersistedSnapshot(size, blankCells);
      isDirtyRef.current = false;
    },
    [markPersistedSnapshot, setCurrentDesignId]
  );

  const validateLoadedDesign = useCallback((design: Design): { size: BoardSize; decodedCells: number[] } | null => {
    if (!Number.isInteger(design.width) || design.width <= 0) return null;
    if (!Number.isInteger(design.height) || design.height <= 0) return null;
    if (typeof design.gridB64 !== 'string') return null;

    const expectedCells = design.width * design.height;
    if (!Number.isSafeInteger(expectedCells) || expectedCells <= 0) return null;

    const decodedCells = storage.decodeGrid(design.gridB64);
    if (decodedCells.length !== expectedCells) return null;
    if (decodedCells.some((cell) => !Number.isInteger(cell) || cell < 0 || cell > 255)) return null;

    const size = BOARD_SIZES.find((s) => s.width === design.width && s.height === design.height)
      || { label: `${design.width}x${design.height}`, width: design.width, height: design.height };

    return { size, decodedCells };
  }, []);

  const loadDesignToState = useCallback((design: Design) => {
    const validated = validateLoadedDesign(design);
    if (!validated) {
      console.error('Failed to load design: invalid or corrupt data', design.id);
      return false;
    }

    clearAutosaveTimer();

    const { size, decodedCells } = validated;

    markPersistedSnapshot(size, decodedCells);
    setBoardSize(size);
    setCells(decodedCells);
    setHistory(createEmptyHistory());
    setCurrentDesignId(design.id);
    isDirtyRef.current = false;

    return true;
  }, [clearAutosaveTimer, markPersistedSnapshot, setCurrentDesignId, validateLoadedDesign]);

  const saveCurrentDesign = useCallback(() => {
    const now = new Date().toISOString();

    let idToUse = currentDesignIdRef.current;
    let createdAt = now;

    if (!idToUse) {
      idToUse = storage.generateId();
      setCurrentDesignId(idToUse);
    } else {
      // If updating, preserve creation time
      const existing = storage.loadDesign(idToUse);
      if (existing) createdAt = existing.createdAt;
    }

    const gridB64 = storage.encodeGrid(cells);
    const design: Design = {
      id: idToUse,
      width: boardSize.width,
      height: boardSize.height,
      paletteVersion: 'v1',
      gridB64,
      createdAt,
      updatedAt: now,
    };

    try {
      storage.saveDesign(design);
      refreshDesignList();
      markPersistedSnapshot(boardSize, cells);
      isDirtyRef.current = false;
      return idToUse;
    } catch (e) {
      console.error('Failed to persist design', e);
      return null;
    }
  }, [boardSize, cells, markPersistedSnapshot, refreshDesignList, setCurrentDesignId]);

  // Flush pending autosave before switching context
  const flushAutosave = useCallback(() => {
    clearAutosaveTimer();
    if (!isDirtyRef.current) return true;
    return Boolean(saveCurrentDesign());
  }, [clearAutosaveTimer, saveCurrentDesign]);

  const deleteDesignById = useCallback((id: string) => {
    // Avoid deleting the currently open design to prevent autosave from re-creating it.
    if (currentDesignIdRef.current === id) return false;
    storage.deleteDesign(id);
    refreshDesignList();
    return true;
  }, [refreshDesignList]);

  // Initialize: Load last design on mount
  useEffect(() => {
    const lastId = storage.getCurrentDesignId();
    if (!lastId) return;

    const design = storage.loadDesign(lastId);
    if (!design || !loadDesignToState(design)) {
      setCurrentDesignId(null);
    }
  }, [loadDesignToState, setCurrentDesignId]);

  const loadDesignById = useCallback((id: string) => {
    if (!flushAutosave()) return false;
    const design = storage.loadDesign(id);
    if (!design) return false;
    return loadDesignToState(design);
  }, [flushAutosave, loadDesignToState]);

  const createNewDesign = useCallback((size: BoardSize = DEFAULT_BOARD_SIZE) => {
    if (!flushAutosave()) return false;
    resetToBlankDesign(size);
    return true;
  }, [flushAutosave, resetToBlankDesign]);

  // Autosave + dirty state effect
  useEffect(() => {
    const dirty = isStateDirty(cells, boardSize);
    isDirtyRef.current = dirty;

    clearAutosaveTimer();
    if (!dirty) return;

    // Persist brand-new drafts immediately so the first edit survives refresh/navigation.
    if (!currentDesignId) {
      saveCurrentDesign();
      return;
    }

    const scheduledDesignId = currentDesignId;
    autosaveTimerRef.current = setTimeout(() => {
      if (currentDesignIdRef.current !== scheduledDesignId) return;
      if (!isDirtyRef.current) return;
      saveCurrentDesign();
    }, 1000);

    return () => {
      clearAutosaveTimer();
    };
  }, [boardSize, cells, currentDesignId, clearAutosaveTimer, isStateDirty, saveCurrentDesign]);

  // --- Editor Logic ---

  const applyPatches = useCallback((patches: CellPatch[], direction: 'forward' | 'backward') => {
    setCells((prevCells) => {
      const newCells = [...prevCells];
      patches.forEach((patch) => {
        newCells[patch.i] = direction === 'forward' ? patch.next : patch.prev;
      });
      return newCells;
    });
  }, []);

  const pushActionToHistory = useCallback((action: HistoryAction) => {
    setHistory((prev) => ({
      past: [...prev.past, action],
      future: [], 
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const lastAction = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      applyPatches(lastAction.patches, 'backward');

      return {
        past: newPast,
        future: [lastAction, ...prev.future],
      };
    });
  }, [applyPatches]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const nextAction = prev.future[0];
      const newFuture = prev.future.slice(1);

      applyPatches(nextAction.patches, 'forward');

      return {
        past: [...prev.past, nextAction],
        future: newFuture,
      };
    });
  }, [applyPatches]);

  const clearBoard = useCallback(() => {
    const patches: CellPatch[] = [];
    cells.forEach((val, i) => {
      if (val !== 0) {
        patches.push({ i, prev: val, next: 0 });
      }
    });

    if (patches.length > 0) {
      applyPatches(patches, 'forward');
      pushActionToHistory({ kind: 'clear', patches });
    }
  }, [cells, applyPatches, pushActionToHistory]);

  const resizeBoard = useCallback((newSize: BoardSize) => {
    // Treat resize as creating a new design with that size
    createNewDesign(newSize);
  }, [createNewDesign]);

  const patchStrokeCell = useCallback((index: number, targetValue: number | null) => {
    if (targetValue === null) return;
    if (currentStrokeRef.current.has(index)) return;

    const currentValue = cells[index];
    if (currentValue === targetValue) return;

    const patch: CellPatch = { i: index, prev: currentValue, next: targetValue };
    currentStrokeRef.current.set(index, patch);
    setCells((prev) => {
      const nextCells = [...prev];
      nextCells[index] = targetValue;
      return nextCells;
    });
  }, [cells]);

  const startStroke = useCallback((index: number) => {
    if (activeTool === 'move') return;
    if (!isValidCellIndex(index, cells.length)) return;
    setIsDrawing(true);
    currentStrokeRef.current.clear();
    patchStrokeCell(index, getStrokeTargetValue(activeTool, activeColorId));
  }, [activeTool, activeColorId, cells.length, patchStrokeCell]);

  const continueStroke = useCallback((index: number) => {
    if (activeTool === 'move') return;
    if (!isDrawing) return;
    if (!isValidCellIndex(index, cells.length)) return;
    patchStrokeCell(index, getStrokeTargetValue(activeTool, activeColorId));
  }, [activeTool, activeColorId, isDrawing, cells.length, patchStrokeCell]);

  const endStroke = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.size > 0) {
      const patches = Array.from(currentStrokeRef.current.values());
      pushActionToHistory({ kind: 'stroke', patches });
    }
    currentStrokeRef.current.clear();
  }, [isDrawing, pushActionToHistory]);

  return {
    // Editor State
    boardSize,
    cells,
    activeTool,
    setActiveTool,
    activeColorId,
    setActiveColorId,
    history,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,

    // Actions
    undo,
    redo,
    clearBoard,
    resizeBoard,
    startStroke,
    continueStroke,
    endStroke,

    // Persistence
    currentDesignId,
    savedDesigns,
    saveCurrentDesign,
    loadDesignById,
    createNewDesign,
    deleteDesignById,
  };
};
