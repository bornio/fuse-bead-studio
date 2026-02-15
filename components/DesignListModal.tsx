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
}

const THUMB_SIZE = 120;
const EMPTY_CELL = 0;

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

const DesignListModal: React.FC<DesignListModalProps> = ({
  isOpen,
  designs,
  currentDesignId,
  onClose,
  onLoad,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Gallery</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
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
                <button
                  key={design.id}
                  onClick={() => {
                    onLoad(design.id);
                    onClose();
                  }}
                  className={`rounded-xl border-2 p-1 bg-white transition-all ${
                    currentDesignId === design.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  aria-label="Open picture"
                >
                  <div className="rounded-lg overflow-hidden bg-slate-100 aspect-square">
                    <ThumbnailCanvas design={design} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignListModal;
