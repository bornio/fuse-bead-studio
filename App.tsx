import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from './hooks/useEditor';
import Pegboard from './components/Pegboard';
import Palette from './components/Palette';
import Toolbar from './components/Toolbar';
import TopBar from './components/TopBar';
import DesignListModal from './components/DesignListModal';
import ConfirmDialog from './components/ConfirmDialog';
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
    savedDesigns,
    loadDesignById,
    createNewDesign,
    deleteDesignById,
  } = useEditor();

  // Modal States
  const [isDesignsModalOpen, setIsDesignsModalOpen] = useState(false);

  // View State
  const [isFused, setIsFused] = useState(false);

  // Zoom State (Fit == 1.0)
  const [zoom, setZoom] = useState(1);

  // Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const STORAGE_ERROR_MESSAGE = 'No more space. Ask a grown-up to delete old pictures.';

  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'neutral',
    onConfirm: () => {},
  });

  // Structural Analysis (passed to TopBar)
  const unstableCount = useMemo(() => {
    if (!isFused) return 0;
    return findUnstableBeads(cells, boardSize.width, boardSize.height).size;
  }, [cells, boardSize, isFused]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2200);
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

  // Reset zoom when board size changes
  useEffect(() => {
    setZoom(1);
  }, [boardSize.width, boardSize.height]);

  // Gentle guidance when entering Preview
  useEffect(() => {
    if (!isFused) return;
    if (unstableCount > 0) {
      showToast('Look for X marks. Add beads next to them to make it stronger.');
    }
  }, [isFused, unstableCount]);

  const handleZoomIn = () => {
    setZoom((z) => clamp(Math.round((z + 0.25) * 100) / 100, 0.5, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => clamp(Math.round((z - 0.25) * 100) / 100, 0.5, 2.5));
  };

  const handleZoomFit = () => {
    setZoom(1);
  };

  // --- Handlers ---

  const handleNewClick = () => {
    const hasContent = cells.some((c) => c !== 0);

    const proceed = () => {
      const created = createNewDesign(boardSize);
      if (!created) {
        showToast(STORAGE_ERROR_MESSAGE);
        return;
      }
      setIsFused(false);
      setZoom(1);
      showToast('New picture started');
      closeConfirmation();
    };

    if (!hasContent) {
      proceed();
      return;
    }

    askForConfirmation({
      title: 'Start a new picture?',
      message: 'Your current picture is already saved.',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      tone: 'warning',
      onConfirm: proceed,
    });
  };

  const loadDesignWithSafetyChecks = (id: string) => {
    const loaded = loadDesignById(id);
    if (!loaded) {
      showToast("Couldn't open that picture");
      return false;
    }
    setIsFused(false);
    setZoom(1);
    return true;
  };

  const handleLoadDesignRequest = (id: string) => {
    if (id === currentDesignId) return;
    loadDesignWithSafetyChecks(id);
  };

  const handleClearClick = () => {
    askForConfirmation({
      title: 'Clear this picture?',
      message: 'You can undo if needed.',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      tone: 'danger',
      onConfirm: () => {
        clearBoard();
        closeConfirmation();
      },
    });
  };

  const handleRequestDeleteDesign = (id: string) => {
    if (id === currentDesignId) {
      showToast("Open a different picture first, then delete this one.");
      return;
    }

    askForConfirmation({
      title: 'Delete this picture?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: () => {
        const ok = deleteDesignById(id);
        if (!ok) {
          showToast("Couldn't delete that picture");
          closeConfirmation();
          return;
        }
        showToast('Deleted');
        closeConfirmation();
      },
    });
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <TopBar 
        isFused={isFused}
        unstableCount={unstableCount}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onToggleFused={() => setIsFused(!isFused)}
        onNew={handleNewClick}
        onOpenGallery={() => setIsDesignsModalOpen(true)}
        onClear={handleClearClick}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <Pegboard 
          width={boardSize.width}
          height={boardSize.height}
          cells={cells}
          isFused={isFused}
          onExitFused={() => setIsFused(false)}
          activeTool={activeTool}
          zoom={zoom}
          onStrokeStart={startStroke}
          onStrokeMove={continueStroke}
          onStrokeEnd={endStroke}
        />
      </main>

      <div className="flex-shrink-0 z-10 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
            if (activeTool !== 'paint') {
              setActiveTool('paint');
            }
          }}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
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
        onRequestDelete={handleRequestDeleteDesign}
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
