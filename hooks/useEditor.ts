import { useState, useCallback, useRef, useEffect } from 'react';
import { BoardSize, CellPatch, HistoryAction, Tool, Design } from '../types';
import { DEFAULT_BOARD_SIZE, BOARD_SIZES } from '../constants';
import * as storage from '../utils/storage';

export const useEditor = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(DEFAULT_BOARD_SIZE);
  const [cells, setCells] = useState<number[]>(
    new Array(DEFAULT_BOARD_SIZE.width * DEFAULT_BOARD_SIZE.height).fill(0)
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
  const [designName, setDesignName] = useState<string>("My Design");
  const [isSaved, setIsSaved] = useState(true); // Tracks if current in-memory state matches saved state
  const [savedDesigns, setSavedDesigns] = useState(storage.getDesignIndex());

  const currentStrokeRef = useRef<Map<number, CellPatch>>(new Map());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false); // Ref to track dirty state synchronously

  // --- Persistence Logic ---

  const refreshDesignList = useCallback(() => {
    setSavedDesigns(storage.getDesignIndex());
  }, []);

  // Initialize: Load last design on mount
  useEffect(() => {
    const lastId = storage.getCurrentDesignId();
    if (lastId) {
      const design = storage.loadDesign(lastId);
      if (design) {
        loadDesignToState(design);
      }
    }
  }, []); // Run once

  const loadDesignToState = (design: Design) => {
    const decodedCells = storage.decodeGrid(design.gridB64);
    // Find matching board size or custom
    const matchingSize = BOARD_SIZES.find(s => s.width === design.width && s.height === design.height) 
      || { label: `${design.width}x${design.height}`, width: design.width, height: design.height };

    setBoardSize(matchingSize);
    setCells(decodedCells);
    setHistory({ past: [], future: [] });
    setCurrentDesignIdState(design.id);
    setDesignName(design.name);
    setIsSaved(true);
    isDirtyRef.current = false;
    storage.setCurrentDesignId(design.id);
  };

  const saveCurrentDesign = useCallback((nameOverride?: string) => {
    const now = new Date().toISOString();
    const nameToUse = nameOverride || designName;
    
    let idToUse = currentDesignId;
    let createdAt = now;

    if (!idToUse) {
      idToUse = storage.generateId();
      setCurrentDesignIdState(idToUse);
      storage.setCurrentDesignId(idToUse);
    } else {
      // If updating, preserve creation time
      const existing = storage.loadDesign(idToUse);
      if (existing) createdAt = existing.createdAt;
    }

    if (nameOverride) {
      setDesignName(nameOverride);
    }

    const design: Design = {
      id: idToUse,
      name: nameToUse,
      width: boardSize.width,
      height: boardSize.height,
      paletteVersion: 'v1',
      gridB64: storage.encodeGrid(cells),
      createdAt,
      updatedAt: now,
    };

    storage.saveDesign(design);
    refreshDesignList();
    setIsSaved(true);
    isDirtyRef.current = false;
    
    return idToUse;
  }, [cells, boardSize, currentDesignId, designName, refreshDesignList]);

  // Flush pending autosave before switching context
  const flushAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (currentDesignId && isDirtyRef.current) {
      saveCurrentDesign();
    }
  }, [currentDesignId, saveCurrentDesign]);

  const loadDesignById = useCallback((id: string) => {
    flushAutosave();
    const design = storage.loadDesign(id);
    if (design) {
      loadDesignToState(design);
    }
  }, [flushAutosave]);

  const createNewDesign = useCallback((size: BoardSize = DEFAULT_BOARD_SIZE) => {
    flushAutosave();
    
    setBoardSize(size);
    setCells(new Array(size.width * size.height).fill(0));
    setHistory({ past: [], future: [] });
    setCurrentDesignIdState(null);
    setDesignName("My Design");
    storage.setCurrentDesignId(null);
    setIsSaved(true); 
    isDirtyRef.current = false;
  }, [flushAutosave]);

  const deleteDesignById = useCallback((id: string) => {
    storage.deleteDesign(id);
    refreshDesignList();
    if (id === currentDesignId) {
      // If deleting current, reset to empty
      createNewDesign();
    }
  }, [currentDesignId, refreshDesignList, createNewDesign]);

  const renameDesign = useCallback((id: string, newName: string) => {
    const design = storage.loadDesign(id);
    if (design) {
      design.name = newName;
      design.updatedAt = new Date().toISOString();
      storage.saveDesign(design);
      refreshDesignList();
      if (id === currentDesignId) {
        setDesignName(newName);
      }
    }
  }, [currentDesignId, refreshDesignList]);

  // Autosave Effect
  useEffect(() => {
    if (!currentDesignId) return;

    // We only want to trigger autosave if cells actually changed.
    // However, this effect runs on every cell change.
    // We mark as dirty.
    setIsSaved(false);
    isDirtyRef.current = true;
    
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      saveCurrentDesign();
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [cells, currentDesignId, saveCurrentDesign]);

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