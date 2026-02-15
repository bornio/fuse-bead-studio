import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from './hooks/useEditor';
import Pegboard from './components/Pegboard';
import Palette from './components/Palette';
import Toolbar from './components/Toolbar';
import TopBar from './components/TopBar';
import DesignListModal from './components/DesignListModal';
import NameInputDialog from './components/NameInputDialog';
import ConfirmDialog from './components/ConfirmDialog';
import { BoardSize } from './types';
import { findUnstableBeads } from './utils/structure';

function App() {
  const {
    // Editor state
    boardSize,
    cells,
    activeTool,
    setActiveTool,
    activeColorId,
    setActiveColorId,
    
    // Editor actions
    startStroke,
    continueStroke,
    endStroke,
    undo,
    redo,
    canUndo,
    canRedo,
    resizeBoard, // Acts as new/reset in V1 context
    clearBoard,
    
    // Persistence state
    currentDesignId,
    designName,
    isSaved,
    savedDesigns,
    
    // Persistence actions
    saveCurrentDesign,
    loadDesignById,
    createNewDesign,
    deleteDesignById,
    renameDesign,
  } = useEditor();

  // Modal States
  const [isDesignsModalOpen, setIsDesignsModalOpen] = useState(false);
  const [isNameInputOpen, setIsNameInputOpen] = useState(false);
  
  // View State
  const [isFused, setIsFused] = useState(false);

  // Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Generic Confirmation State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Structural Analysis
  // We calculate this in App to pass the count to TopBar
  const unstableCount = useMemo(() => {
    if (!isFused) return 0;
    return findUnstableBeads(cells, boardSize.width, boardSize.height).size;
  }, [cells, boardSize, isFused]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const closeConfirmation = () => {
    setConfirmation((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Handlers ---

  const handleSaveClick = () => {
    if (currentDesignId) {
      // Already has an ID, force save (update timestamp/grid)
      saveCurrentDesign();
      showToast("Design saved!");
    } else {
      // First time save, prompt for name
      setIsNameInputOpen(true);
    }
  };

  const handleNameSubmit = (name: string) => {
    saveCurrentDesign(name);
    setIsNameInputOpen(false);
    showToast("Design saved!");
  };

  const handleNewClick = () => {
    const proceed = () => {
      createNewDesign(boardSize);
      setIsFused(false); // Reset view
      showToast("New design started");
      closeConfirmation();
    };

    // If current draft has no saved design ID, loading context will discard it.
    if (!currentDesignId && !isSaved) {
      setConfirmation({
        isOpen: true,
        title: "Start new design?",
        message: "Unsaved changes will be lost.",
        onConfirm: proceed,
      });
    } else {
      // If saved (has ID) or empty, createNewDesign auto-saves if needed (via flush) then resets
      proceed();
    }
  };

  const loadDesignWithSafetyChecks = (id: string) => {
    const loaded = loadDesignById(id);
    if (!loaded) {
      showToast("Could not load design. Data may be corrupted.");
      return;
    }
    setIsFused(false);
  };

  const handleLoadDesignRequest = (id: string) => {
    if (id === currentDesignId) return;

    const proceed = () => {
      loadDesignWithSafetyChecks(id);
      closeConfirmation();
    };

    // Switching away from an unsaved draft (no persistent ID) should always be explicit.
    if (!currentDesignId && !isSaved) {
      setConfirmation({
        isOpen: true,
        title: "Discard draft changes?",
        message: "Your current unsaved draft will be lost if you open another design.",
        onConfirm: proceed,
      });
      return;
    }

    proceed();
  };

  const handleSizeChangeRequest = (newSize: BoardSize) => {
    const isEmpty = cells.every(c => c === 0);
    
    const proceed = () => {
      resizeBoard(newSize);
      setIsFused(false); // Reset view
      closeConfirmation();
    };

    if (isEmpty) {
       proceed();
    } else {
       setConfirmation({
         isOpen: true,
         title: "Change board size?",
         message: "This will start a new design. Unsaved changes will be lost.",
         onConfirm: proceed,
       });
    }
  };

  const handleClearClick = () => {
    setConfirmation({
      isOpen: true,
      title: "Clear the board?",
      message: "Are you sure you want to clear the board? This can be undone.",
      onConfirm: () => {
        clearBoard();
        closeConfirmation();
      },
    });
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <TopBar 
        designName={designName}
        isSaved={isSaved}
        currentSize={boardSize}
        isFused={isFused}
        unstableCount={unstableCount}
        onToggleFused={() => setIsFused(!isFused)}
        onSizeChange={handleSizeChangeRequest}
        onNew={handleNewClick}
        onSave={handleSaveClick}
        onOpenMyDesigns={() => setIsDesignsModalOpen(true)}
        onClear={handleClearClick}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <Pegboard 
          width={boardSize.width}
          height={boardSize.height}
          cells={cells}
          isFused={isFused}
          onStrokeStart={startStroke}
          onStrokeMove={continueStroke}
          onStrokeEnd={endStroke}
        />
      </main>

      <div className="flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Toolbar 
          activeTool={activeTool}
          onSetTool={setActiveTool}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
        <Palette 
          activeColorId={activeColorId}
          onSelectColor={(id) => {
            setActiveColorId(id);
            if (activeTool === 'erase') {
              setActiveTool('paint');
            }
          }}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      
      <DesignListModal
        isOpen={isDesignsModalOpen}
        onClose={() => setIsDesignsModalOpen(false)}
        designs={savedDesigns}
        currentDesignId={currentDesignId}
        onLoad={handleLoadDesignRequest}
        onDelete={deleteDesignById}
        onRename={renameDesign}
      />

      <NameInputDialog
        isOpen={isNameInputOpen}
        initialValue={currentDesignId ? designName : "My Design"}
        onConfirm={handleNameSubmit}
        onCancel={() => setIsNameInputOpen(false)}
        title={currentDesignId ? "Rename Design" : "Name your design"}
      />

      <ConfirmDialog 
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={closeConfirmation}
      />
    </div>
  );
}

export default App;
