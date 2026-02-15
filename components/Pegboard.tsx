import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { COLOR_MAP } from '../constants';
import { findUnstableBeads } from '../utils/structure';

interface PegboardProps {
  width: number;
  height: number;
  cells: number[];
  isFused: boolean;
  onExitFused: () => void;
  onStrokeStart: (index: number) => void;
  onStrokeMove: (index: number) => void;
  onStrokeEnd: () => void;
}

const CELL_SIZE = 24;
const GRID_LINE_COLOR = '#E5E7EB';
const PEG_COLOR = '#CBD5E1';
const BEAD_FALLBACK_COLOR = '#000000';
const EMPTY_CELL = 0;
const PEG_RADIUS = 3;
const BEAD_RADIUS = 10;

const getWarningColor = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
};

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.rect(x, y, width, height);
};

const drawFusedView = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: number[],
  unstableIndices: Set<number>
) => {
  const displayWidth = width * CELL_SIZE;
  const displayHeight = height * CELL_SIZE;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const colorId = cells[index];
      if (colorId === EMPTY_CELL) continue;

      const colorHex = COLOR_MAP[colorId] || BEAD_FALLBACK_COLOR;
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      ctx.fillStyle = colorHex;
      ctx.beginPath();
      drawRoundedRectPath(ctx, px, py, CELL_SIZE + 0.5, CELL_SIZE + 0.5, 6);
      ctx.fill();

      if (unstableIndices.has(index)) {
        const warningColor = getWarningColor(colorHex);
        ctx.strokeStyle = warningColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = warningColor;
        ctx.lineWidth = 2;
        ctx.moveTo(px + 4, py + 4);
        ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 4);
        ctx.moveTo(px + CELL_SIZE - 4, py + 4);
        ctx.lineTo(px + 4, py + CELL_SIZE - 4);
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      drawRoundedRectPath(ctx, px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
      ctx.fill();
    }
  }
};

const drawEditorView = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: number[]
) => {
  const displayWidth = width * CELL_SIZE;
  const displayHeight = height * CELL_SIZE;

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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const colorId = cells[index];
      const cx = x * CELL_SIZE + CELL_SIZE / 2;
      const cy = y * CELL_SIZE + CELL_SIZE / 2;

      if (colorId === EMPTY_CELL) {
        ctx.fillStyle = PEG_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.fillStyle = COLOR_MAP[colorId] || BEAD_FALLBACK_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, BEAD_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(cx, cy, PEG_RADIUS + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }
};

const Pegboard: React.FC<PegboardProps> = ({
  width,
  height,
  cells,
  isFused,
  onExitFused,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const unstableIndices = useMemo(() => {
    if (!isFused) return new Set<number>();
    return findUnstableBeads(cells, width, height);
  }, [cells, width, height, isFused]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width * CELL_SIZE;
    const displayHeight = height * CELL_SIZE;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    if (isFused) {
      drawFusedView(ctx, width, height, cells, unstableIndices);
      return;
    }
    drawEditorView(ctx, width, height, cells);
  }, [width, height, cells, isFused, unstableIndices]);

  useEffect(() => {
    draw();
  }, [draw]);

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

  useEffect(() => {
    if (!isFused) return;
    onStrokeEnd();
  }, [isFused, onStrokeEnd]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isFused) {
      onExitFused();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      onStrokeStart(index);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isFused) return;
    if (e.buttons !== 1) return;
    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      onStrokeMove(index);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onStrokeEnd();
  };

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 p-4 touch-none">
      <div
        className={`bg-white shadow-lg rounded-sm ${isFused ? 'border-none' : 'border border-slate-300'} relative transition-all duration-300`}
        style={{ width: width * CELL_SIZE, height: height * CELL_SIZE }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: width * CELL_SIZE, height: height * CELL_SIZE, display: 'block' }}
          className={`${isFused ? 'cursor-default' : 'cursor-crosshair'} touch-none`}
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
