import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { COLOR_MAP } from '../constants';
import { findUnstableBeads } from '../utils/structure';

interface PegboardProps {
  width: number;
  height: number;
  cells: number[];
  isFused: boolean;
  onStrokeStart: (index: number) => void;
  onStrokeMove: (index: number) => void;
  onStrokeEnd: () => void;
}

const Pegboard: React.FC<PegboardProps> = ({
  width,
  height,
  cells,
  isFused,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate unstable beads only when in Fused mode or when cells change
  const unstableIndices = useMemo(() => {
    if (!isFused) return new Set<number>();
    return findUnstableBeads(cells, width, height);
  }, [cells, width, height, isFused]);

  // Helper to get a high-contrast warning color (Inverted)
  const getWarningColor = (hex: string) => {
    // Remove hash if present
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Invert colors
    const ir = 255 - r;
    const ig = 255 - g;
    const ib = 255 - b;

    return `rgb(${ir}, ${ig}, ${ib})`;
  };

  // Constants for rendering
  const CELL_SIZE = 24; // Base cell size in pixels
  const GRID_LINE_COLOR = '#E5E7EB'; // slate-200
  const PEG_COLOR = '#CBD5E1'; // slate-300

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width * CELL_SIZE;
    const displayHeight = height * CELL_SIZE;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    
    // Clear
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // --- Fused Mode Rendering ---
    if (isFused) {
      // Draw plain white background (no grid)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Iterate beads
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const colorId = cells[i];
          
          if (colorId !== 0) {
            const isUnstable = unstableIndices.has(i);
            const colorHex = COLOR_MAP[colorId] || '#000000';
            
            // Coordinates
            const px = x * CELL_SIZE;
            const py = y * CELL_SIZE;
            
            // Draw "Squarcle"
            ctx.fillStyle = colorHex;
            ctx.beginPath();
            
            if (ctx.roundRect) {
              ctx.roundRect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5, 6);
            } else {
              ctx.rect(px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5);
            }
            ctx.fill();

            // Render Unstable Warning Overlay
            if (isUnstable) {
              const warningColor = getWarningColor(colorHex);

              // 1. Inverted Outline
              ctx.strokeStyle = warningColor;
              ctx.lineWidth = 2.5; // Slightly thicker
              ctx.stroke();

              // 2. Hatch Pattern (Warning Stripe) using inverted color
              ctx.beginPath();
              ctx.strokeStyle = warningColor;
              ctx.lineWidth = 2;
              
              // Draw cross hatch
              ctx.moveTo(px + 4, py + 4);
              ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 4);
              
              ctx.moveTo(px + CELL_SIZE - 4, py + 4);
              ctx.lineTo(px + 4, py + CELL_SIZE - 4);
              ctx.stroke();

            } else {
              // Only draw shine/dimple if stable (looks "finished")
              
              // Tiny dimple
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              ctx.beginPath();
              ctx.arc(px + CELL_SIZE/2, py + CELL_SIZE/2, 2, 0, Math.PI * 2);
              ctx.fill();

              // Waxy highlight
              ctx.fillStyle = 'rgba(255,255,255,0.15)';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
              } else {
                ctx.rect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
              }
              ctx.fill();
            }
          }
        }
      }
    } 
    // --- Standard Editor Rendering ---
    else {
      const PEG_RADIUS = 3;
      const BEAD_RADIUS = 10;

      // Draw Grid Lines
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, displayHeight);
      }
      for (let y = 0; y <= height; y++) {
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(displayWidth, y * CELL_SIZE);
      }
      ctx.stroke();

      // Draw Pegs and Beads
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const colorId = cells[i];
          const cx = x * CELL_SIZE + CELL_SIZE / 2;
          const cy = y * CELL_SIZE + CELL_SIZE / 2;

          if (colorId === 0) {
            // Draw empty peg
            ctx.fillStyle = PEG_COLOR;
            ctx.beginPath();
            ctx.arc(cx, cy, PEG_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Draw Bead
            const colorHex = COLOR_MAP[colorId] || '#000000';
            
            // Main bead body
            ctx.fillStyle = colorHex;
            ctx.beginPath();
            ctx.arc(cx, cy, BEAD_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Bead hole
            ctx.fillStyle = 'rgba(0,0,0,0.15)'; // inner shadow
            ctx.beginPath();
            ctx.arc(cx, cy, PEG_RADIUS + 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF'; // Highlight
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
  }, [width, height, cells, isFused, unstableIndices]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer Events
  const getCellIndexFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (col >= 0 && col < width && row >= 0 && row < height) {
      return row * width + col;
    }
    return -1;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      onStrokeStart(index);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      onStrokeMove(index);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    onStrokeEnd();
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 p-4 touch-none"
    >
      <div 
        className={`bg-white shadow-lg rounded-sm ${isFused ? 'border-none' : 'border border-slate-300'} relative transition-all duration-300`}
        style={{ width: width * CELL_SIZE, height: height * CELL_SIZE }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: width * CELL_SIZE, height: height * CELL_SIZE, display: 'block' }}
          className="cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
};

export default Pegboard;