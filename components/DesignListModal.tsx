import React, { useEffect, useRef } from 'react';
import { X, Image } from 'lucide-react';
import { Design } from '../types';
import { COLOR_MAP } from '../constants';
import { decodeGrid } from '../utils/storage';

interface DesignListModalProps {
  isOpen: boolean;
  designs: Design[];
  currentDesignId: string | null;
  onClose: () => void;
  onLoad: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

const THUMB_SIZE = 120;
const EMPTY_CELL = 0;
const LONG_PRESS_MS = 650;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

const ThumbnailCanvas: React.FC<{ design: Design }> = ({ design }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cells = decodeGrid(design.gridB64);
    const side = Math.max(design.width, design.height);
    const cellSize = Math.max(1, Math.floor(THUMB_SIZE / side));
    const drawWidth = design.width * cellSize;
    const drawHeight = design.height * cellSize;
    const offsetX = Math.floor((THUMB_SIZE - drawWidth) / 2);
    const offsetY = Math.floor((THUMB_SIZE - drawHeight) / 2);

    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(offsetX, offsetY, drawWidth, drawHeight);

    for (let y = 0; y < design.height; y++) {
      for (let x = 0; x < design.width; x++) {
        const index = y * design.width + x;
        const colorId = cells[index];
        if (!colorId || colorId === EMPTY_CELL) continue;

        ctx.fillStyle = COLOR_MAP[colorId] || '#0F172A';
        ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, drawWidth - 1, drawHeight - 1);
  }, [design]);

  return (
    <canvas
      ref={canvasRef}
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      className="h-full w-full"
      aria-hidden
    />
  );
};

const DesignTile: React.FC<{
  design: Design;
  isCurrent: boolean;
  onOpen: (id: string) => void;
  onLongPressDelete: (id: string) => void;
}> = ({ design, isCurrent, onOpen, onLongPressDelete }) => {
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const movedRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    longPressTriggeredRef.current = false;
    movedRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      if (movedRef.current) return;
      longPressTriggeredRef.current = true;
      onLongPressDelete(design.id);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startPointRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) <= LONG_PRESS_MOVE_TOLERANCE_PX) return;

    movedRef.current = true;
    clearTimer();
  };

  const handlePointerUp = () => {
    clearTimer();
    startPointRef.current = null;
  };

  const handleClick = () => {
    if (longPressTriggeredRef.current || movedRef.current) {
      longPressTriggeredRef.current = false;
      movedRef.current = false;
      return;
    }
    onOpen(design.id);
  };

  return (
    <button
      key={design.id}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative rounded-xl border-2 p-1 bg-white transition-all active:scale-[0.99] ${
        isCurrent
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-blue-300'
      }`}
      aria-label={isCurrent ? 'Open picture (currently open)' : 'Open picture'}
    >
      {isCurrent && (
        <div className="absolute top-2 left-2 z-10 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-blue-600 text-white shadow">
          Open
        </div>
      )}

      <div className="rounded-lg overflow-hidden bg-slate-100 aspect-square">
        <ThumbnailCanvas design={design} />
      </div>
    </button>
  );
};

const DesignListModal: React.FC<DesignListModalProps> = ({
  isOpen,
  designs,
  currentDesignId,
  onClose,
  onLoad,
  onRequestDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-900">Gallery</h3>
            <p className="text-xs text-slate-500">
              Tip for grown-ups: press and hold a picture to delete it.
            </p>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close gallery"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {designs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Image size={48} className="mx-auto mb-3 opacity-20" />
              <p>No pictures yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {designs.map((design) => (
                <DesignTile
                  key={design.id}
                  design={design}
                  isCurrent={currentDesignId === design.id}
                  onOpen={(id) => {
                    onLoad(id);
                    onClose();
                  }}
                  onLongPressDelete={(id) => onRequestDelete(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignListModal;
