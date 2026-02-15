import { useState, useCallback, useRef, useEffect } from 'react';
import { BoardSize, CellPatch, HistoryAction, Tool, Design } from '../types';
import { DEFAULT_BOARD_SIZE, BOARD_SIZES } from '../constants';
import * as storage from '../utils/storage';

type PersistedSnapshot = {
  width: number;
  height: number;
  gridB64: string;
};

export const useEditor = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [cells, setCells] = useState<number[]>(
    () => new Array(DEFAULT_BOARD_SIZE.width * DEFAULT_BOARD_SIZE.height).fill(0)
  );

  const [history, setHistory] = useState<{ past: HistoryAction[]; future: HistoryAction[] }>({
    past: [],
    future: [],
  });

  const [activeTool, setActiveTool] = useState<Tool>('paint');
  const [activeColorId, setActiveColorId] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);

  // Persistence State
  const [currentDesignId, setCurrentDesignIdState] = useState<string | null>(null);
  const [designName, setDesignName] = useState<string>('My Design');
  const [isSaved, setIsSaved] = useState(true); // Tracks if current in-memory state matches saved state
  const [savedDesigns, setSavedDesigns] = useState(storage.getDesignIndex());

  const currentStrokeRef = useRef<Map<number, CellPatch>>(new Map());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDesignIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  const persistedSnapshotRef = useRef<PersistedSnapshot | null>(null);
  if (!persistedSnapshotRef.current) {
    const initialCells = new Array(DEFAULT_BOARD_SIZE.width * DEFAULT_BOARD_SIZE.height).fill(0);
    persistedSnapshotRef.current = {
      width: DEFAULT_BOARD_SIZE.width,
      height: DEFAULT_BOARD_SIZE.height,
      gridB64: storage.encodeGrid(initialCells),
    };
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
    setSavedDesigns(storage.getDesignIndex());
  }, []);

  const markPersistedSnapshot = useCallback((size: Pick<BoardSize, 'width' | 'height'>, nextCells: number[]) => {
    persistedSnapshotRef.current = {
      width: size.width,
      height: size.height,
      gridB64: storage.encodeGrid(nextCells),
    };
  }, []);

  const isStateDirty = useCallback((nextCells: number[], nextSize: BoardSize) => {
    const snapshot = persistedSnapshotRef.current;
    if (!snapshot) return true;
    if (snapshot.width !== nextSize.width || snapshot.height !== nextSize.height) return true;
    return snapshot.gridB64 !== storage.encodeGrid(nextCells);
  }, []);

  const resetToBlankDesign = useCallback((size: BoardSize = DEFAULT_BOARD_SIZE) => {
    const blankCells = new Array(size.width * size.height).fill(0);
    setBoardSize(size);
    setCells(blankCells);
    setHistory({ past: [], future: [] });
    setCurrentDesignId(null);
    setDesignName('My Design');
    markPersistedSnapshot(size, blankCells);
    setIsSaved(true);
    isDirtyRef.current = false;
  }, [markPersistedSnapshot, setCurrentDesignId]);

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
    const safeName = typeof design.name === 'string' && design.name.trim() ? design.name : 'My Design';

    markPersistedSnapshot(size, decodedCells);
    setBoardSize(size);
    setCells(decodedCells);
    setHistory({ past: [], future: [] });
    setCurrentDesignId(design.id);
    setDesignName(safeName);
    setIsSaved(true);
    isDirtyRef.current = false;

    return true;
  }, [clearAutosaveTimer, markPersistedSnapshot, setCurrentDesignId, validateLoadedDesign]);

  const saveCurrentDesign = useCallback((nameOverride?: string) => {
    const now = new Date().toISOString();
    const trimmedOverride = nameOverride?.trim();
    const nameToUse = trimmedOverride || designName;

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

    if (trimmedOverride) {
      setDesignName(trimmedOverride);
    }

    const gridB64 = storage.encodeGrid(cells);
    const design: Design = {
      id: idToUse,
      name: nameToUse,
      width: boardSize.width,
      height: boardSize.height,
      paletteVersion: 'v1',
      gridB64,
      createdAt,
      updatedAt: now,
    };

    storage.saveDesign(design);
    refreshDesignList();
    persistedSnapshotRef.current = {
      width: boardSize.width,
      height: boardSize.height,
      gridB64,
    };
    setIsSaved(true);
    isDirtyRef.current = false;

    return idToUse;
  }, [boardSize, cells, designName, refreshDesignList, setCurrentDesignId]);

  // Flush pending autosave before switching context
  const flushAutosave = useCallback(() => {
    clearAutosaveTimer();
    if (currentDesignIdRef.current && isDirtyRef.current) {
      saveCurrentDesign();
    }
  }, [clearAutosaveTimer, saveCurrentDesign]);

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
    flushAutosave();
    const design = storage.loadDesign(id);
    if (!design) return false;
    return loadDesignToState(design);
  }, [flushAutosave, loadDesignToState]);

  const createNewDesign = useCallback((size: BoardSize = DEFAULT_BOARD_SIZE) => {
    flushAutosave();
    resetToBlankDesign(size);
  }, [flushAutosave, resetToBlankDesign]);

  const deleteDesignById = useCallback((id: string) => {
    const deletingCurrent = id === currentDesignIdRef.current;

    if (deletingCurrent) {
      clearAutosaveTimer();
    }

    storage.deleteDesign(id);
    refreshDesignList();

    if (deletingCurrent) {
      // If deleting current, reset to empty without flushing stale autosave.
      resetToBlankDesign(boardSize);
    }
  }, [boardSize, clearAutosaveTimer, refreshDesignList, resetToBlankDesign]);

  const renameDesign = useCallback((id: string, newName: string) => {
    const design = storage.loadDesign(id);
    if (design) {
      design.name = newName;
      design.updatedAt = new Date().toISOString();
      storage.saveDesign(design);
      refreshDesignList();
      if (id === currentDesignIdRef.current) {
        setDesignName(newName);
      }
    }
  }, [refreshDesignList]);

  // Autosave + dirty state effect
  useEffect(() => {
    const dirty = isStateDirty(cells, boardSize);
    isDirtyRef.current = dirty;
    setIsSaved(!dirty);

    clearAutosaveTimer();
    if (!dirty || !currentDesignId) return;

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

  const startStroke = useCallback((index: number) => {
    if (index < 0 || index >= cells.length) return;
    setIsDrawing(true);
    currentStrokeRef.current.clear();
    const targetValue = activeTool === 'paint' ? activeColorId : 0;
    const currentValue = cells[index];
    if (currentValue !== targetValue) {
      const patch: CellPatch = { i: index, prev: currentValue, next: targetValue };
      currentStrokeRef.current.set(index, patch);
      setCells((prev) => {
        const nextCells = [...prev];
        nextCells[index] = targetValue;
        return nextCells;
      });
    }
  }, [cells, activeTool, activeColorId]);

  const continueStroke = useCallback((index: number) => {
    if (!isDrawing) return;
    if (index < 0 || index >= cells.length) return;
    const targetValue = activeTool === 'paint' ? activeColorId : 0;
    if (currentStrokeRef.current.has(index)) return;
    const currentValue = cells[index];
    if (currentValue !== targetValue) {
      const patch: CellPatch = { i: index, prev: currentValue, next: targetValue };
      currentStrokeRef.current.set(index, patch);
      setCells((prev) => {
        const nextCells = [...prev];
        nextCells[index] = targetValue;
        return nextCells;
      });
    }
  }, [isDrawing, cells, activeTool, activeColorId]);

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
    designName,
    isSaved,
    savedDesigns,
    saveCurrentDesign,
    loadDesignById,
    createNewDesign,
    deleteDesignById,
    renameDesign,
  };
};
