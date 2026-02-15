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

type ConfirmationState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'neutral' | 'warning' | 'danger';
  onConfirm: () => void;
};

type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'neutral' | 'warning' | 'danger';
  onConfirm: () => void;
};

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
    clearBoard,
    
    // Persistence state
    currentDesignId,
    designName,
    isSaved,
    saveStatus,
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
  
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "neutral",
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

  const askForConfirmation = ({
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    tone = 'warning',
    onConfirm,
  }: ConfirmationOptions) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      onConfirm,
    });
  };

  // --- Handlers ---

  const handleSaveClick = () => {
    if (currentDesignId) {
      const savedId = saveCurrentDesign();
      if (savedId) {
        showToast("All changes saved");
      } else {
        showToast("Couldn't save. Storage may be full.");
      }
    } else {
      // First time save, prompt for name
      setIsNameInputOpen(true);
    }
  };

  const handleNameSubmit = (name: string) => {
    const savedId = saveCurrentDesign(name);
    if (!savedId) {
      showToast("Couldn't save. Storage may be full.");
      return;
    }
    setIsNameInputOpen(false);
    showToast("All changes saved");
  };

  const handleNewClick = () => {
    const hasContent = cells.some((c) => c !== 0);

    const proceed = () => {
      const created = createNewDesign(boardSize);
      if (!created) {
        showToast("Couldn't save. Storage may be full.");
        return;
      }
      setIsFused(false); // Reset view
      showToast("Started a new design");
      closeConfirmation();
    };

    if (!hasContent) {
      proceed();
      return;
    }

    if (!isSaved) {
      askForConfirmation({
        title: "Discard draft changes?",
        message: "Unsaved changes will be lost.",
        confirmLabel: "Discard Draft",
        tone: "warning",
        onConfirm: proceed,
      });
      return;
    }

    askForConfirmation({
      title: "Start a new design?",
      message: "You will switch to a blank board.",
      confirmLabel: "Start New",
      tone: "warning",
      onConfirm: proceed,
    });
  };

  const loadDesignWithSafetyChecks = (id: string) => {
    const loaded = loadDesignById(id);
    if (!loaded) {
      showToast("Couldn't open that design");
      return false;
    }
    setIsFused(false);
    return true;
  };

  const handleLoadDesignRequest = (id: string) => {
    if (id === currentDesignId) return;

    const proceed = () => {
      if (!loadDesignWithSafetyChecks(id)) return;
      closeConfirmation();
    };

    if (!isSaved) {
      askForConfirmation({
        title: "Discard draft changes?",
        message: "Unsaved changes will be lost if you open another design.",
        confirmLabel: "Discard Draft",
        tone: "warning",
        onConfirm: proceed,
      });
      return;
    }

    proceed();
  };

  const handleSizeChangeRequest = (newSize: BoardSize) => {
    if (newSize.width === boardSize.width && newSize.height === boardSize.height) return;

    const isEmpty = cells.every(c => c === 0);
    
    const proceed = () => {
      const created = createNewDesign(newSize);
      if (!created) {
        showToast("Couldn't save. Storage may be full.");
        return;
      }
      setIsFused(false); // Reset view
      closeConfirmation();
    };

    if (isEmpty) {
       proceed();
    } else {
       askForConfirmation({
         title: "Change board size?",
         message: "This will start a new board size.",
         confirmLabel: "Start New Size",
         tone: "warning",
         onConfirm: proceed,
       });
    }
  };

  const handleClearClick = () => {
    askForConfirmation({
      title: "Clear board?",
      message: "This can be undone with Undo.",
      confirmLabel: "Clear Board",
      tone: "danger",
      onConfirm: () => {
        clearBoard();
        closeConfirmation();
      },
    });
  };

  const handleDeleteDesignRequest = (id: string) => {
    const deleting = savedDesigns.find((design) => design.id === id);
    askForConfirmation({
      title: "Delete design?",
      message: deleting
        ? `"${deleting.name}" will be deleted forever.`
        : "This design will be deleted forever.",
      confirmLabel: "Delete Forever",
      tone: "danger",
      onConfirm: () => {
        deleteDesignById(id);
        closeConfirmation();
      },
    });
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <TopBar 
        designName={designName}
        saveStatus={saveStatus}
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
          onExitFused={() => setIsFused(false)}
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
        onDeleteRequest={handleDeleteDesignRequest}
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
        confirmLabel={confirmation.confirmLabel}
        cancelLabel={confirmation.cancelLabel}
        tone={confirmation.tone}
        onConfirm={confirmation.onConfirm}
        onCancel={closeConfirmation}
      />
    </div>
  );
}

export default App;
