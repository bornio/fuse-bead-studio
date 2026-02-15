import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { COLOR_MAP } from '../constants';
import { findUnstableBeads } from '../utils/structure';
import { Tool } from '../types';

interface PegboardProps {
  width: number;
  height: number;
  cells: number[];
  isFused: boolean;
  onExitFused: () => void;
  activeTool: Tool;
  zoom: number;
  onStrokeStart: (index: number) => void;
  onStrokeMove: (index: number) => void;
  onStrokeEnd: () => void;
}

const GRID_LINE_COLOR = '#E5E7EB';
const PEG_COLOR = '#CBD5E1';
const BEAD_FALLBACK_COLOR = '#000000';
const EMPTY_CELL = 0;

const MIN_CELL_SIZE = 12;
const MAX_CELL_SIZE = 32;
const WRAPPER_PADDING = 16; // matches `p-4`

// Magnifier settings
const MAG_SIZE = 140;
const MAG_GRID = 5;
const MAG_CELL = 22;
const MAG_PADDING = Math.floor((MAG_SIZE - MAG_GRID * MAG_CELL) / 2);
const MAG_OFFSET_X = 26;
const MAG_OFFSET_Y = -MAG_SIZE - 26;
const MAG_MARGIN = 12;
const PREVIEW_TAP_MOVE_TOLERANCE_PX = 10;

type MagnifierState = {
  visible: boolean;
  index: number;
  clientX: number;
  clientY: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
  if ((ctx as any).roundRect) {
    (ctx as any).roundRect(x, y, width, height, radius);
    return;
  }
  ctx.rect(x, y, width, height);
};

const drawFusedView = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: number[],
  unstableIndices: Set<number>,
  cellSize: number
) => {
  const displayWidth = width * cellSize;
  const displayHeight = height * cellSize;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  const cornerRadius = Math.max(4, Math.round(cellSize * 0.25));
  const holeRadius = Math.max(1, Math.round(cellSize * 0.08));
  const innerInset = Math.max(2, Math.round(cellSize * 0.08));
  const crossInset = Math.max(4, Math.round(cellSize * 0.16));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const colorId = cells[index];
      if (colorId === EMPTY_CELL) continue;

      const colorHex = COLOR_MAP[colorId] || BEAD_FALLBACK_COLOR;
      const px = x * cellSize;
      const py = y * cellSize;

      ctx.fillStyle = colorHex;
      ctx.beginPath();
      drawRoundedRectPath(ctx, px, py, cellSize + 0.5, cellSize + 0.5, cornerRadius);
      ctx.fill();

      if (unstableIndices.has(index)) {
        const warningColor = getWarningColor(colorHex);
        ctx.strokeStyle = warningColor;
        ctx.lineWidth = Math.max(2, Math.round(cellSize * 0.1));
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = warningColor;
        ctx.lineWidth = Math.max(2, Math.round(cellSize * 0.08));
        ctx.moveTo(px + crossInset, py + crossInset);
        ctx.lineTo(px + cellSize - crossInset, py + cellSize - crossInset);
        ctx.moveTo(px + cellSize - crossInset, py + crossInset);
        ctx.lineTo(px + crossInset, py + cellSize - crossInset);
        ctx.stroke();
        continue;
      }

      // tiny "hole"
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(px + cellSize / 2, py + cellSize / 2, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // soft highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      drawRoundedRectPath(ctx, px + innerInset, py + innerInset, cellSize - innerInset * 2, cellSize - innerInset * 2, Math.max(3, cornerRadius - 2));
      ctx.fill();
    }
  }
};

const drawEditorView = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: number[],
  cellSize: number,
  hoverIndex: number | null
) => {
  const displayWidth = width * cellSize;
  const displayHeight = height * cellSize;

  // grid
  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x++) {
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, displayHeight);
  }
  for (let y = 0; y <= height; y++) {
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(displayWidth, y * cellSize);
  }
  ctx.stroke();

  const pegRadius = Math.max(2, Math.round(cellSize * 0.12));
  const beadRadius = Math.max(4, Math.round(cellSize * 0.42));
  const pegInnerRadius = Math.max(2, Math.round(cellSize * 0.14));
  const highlightDotRadius = Math.max(1, Math.round(cellSize * 0.08));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const colorId = cells[index];
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;

      if (colorId === EMPTY_CELL) {
        ctx.fillStyle = PEG_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, pegRadius, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.fillStyle = COLOR_MAP[colorId] || BEAD_FALLBACK_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, beadRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(cx, cy, pegInnerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx - Math.max(2, Math.round(cellSize * 0.12)), cy - Math.max(2, Math.round(cellSize * 0.12)), highlightDotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  // hover/target highlight (drawn last)
  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < cells.length) {
    const hx = (hoverIndex % width) * cellSize;
    const hy = Math.floor(hoverIndex / width) * cellSize;

    ctx.save();
    const outer = Math.max(2, Math.round(cellSize * 0.12));
    const inner = Math.max(1, Math.round(cellSize * 0.08));

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = outer;
    ctx.strokeRect(hx + outer / 2, hy + outer / 2, cellSize - outer, cellSize - outer);

    ctx.strokeStyle = 'rgba(15,23,42,0.95)';
    ctx.lineWidth = inner;
    ctx.strokeRect(hx + outer, hy + outer, cellSize - outer * 2, cellSize - outer * 2);

    ctx.restore();
  }
};

const Pegboard: React.FC<PegboardProps> = ({
  width,
  height,
  cells,
  isFused,
  onExitFused,
  activeTool,
  zoom,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);

  const activePointerIdRef = useRef<number | null>(null);
  const previewTapRef = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);

  const [wrapperSize, setWrapperSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [baseCellSize, setBaseCellSize] = useState<number>(24);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [magnifier, setMagnifier] = useState<MagnifierState>({
    visible: false,
    index: -1,
    clientX: 0,
    clientY: 0,
  });

  // compute a "fit" base cell size from the available area (child-friendly default)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      setWrapperSize({ w: rect.width, h: rect.height });

      const availableWidth = Math.max(0, rect.width - WRAPPER_PADDING * 2);
      const availableHeight = Math.max(0, rect.height - WRAPPER_PADDING * 2);

      const next = Math.floor(Math.min(availableWidth / width, availableHeight / height));
      setBaseCellSize(clamp(next || MIN_CELL_SIZE, MIN_CELL_SIZE, MAX_CELL_SIZE));
    };

    compute();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', compute);
      return () => window.removeEventListener('resize', compute);
    }

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const cellSize = useMemo(() => Math.max(1, Math.round(baseCellSize * zoom)), [baseCellSize, zoom]);
  const displayWidth = width * cellSize;
  const displayHeight = height * cellSize;

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
    const w = width * cellSize;
    const h = height * cellSize;

    const nextCanvasW = Math.floor(w * dpr);
    const nextCanvasH = Math.floor(h * dpr);

    if (canvas.width !== nextCanvasW || canvas.height !== nextCanvasH) {
      canvas.width = nextCanvasW;
      canvas.height = nextCanvasH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (isFused) {
      drawFusedView(ctx, width, height, cells, unstableIndices, cellSize);
      return;
    }

    drawEditorView(ctx, width, height, cells, cellSize, hoverIndex);
  }, [width, height, cells, isFused, unstableIndices, cellSize, hoverIndex]);

  useEffect(() => {
    draw();
  }, [draw]);

  // draw magnifier bubble
  useEffect(() => {
    if (!magnifier.visible || magnifier.index < 0) return;
    const canvas = magnifierCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, MAG_SIZE, MAG_SIZE);

    const centerX = magnifier.index % width;
    const centerY = Math.floor(magnifier.index / width);
    const half = Math.floor(MAG_GRID / 2);

    for (let gy = 0; gy < MAG_GRID; gy++) {
      for (let gx = 0; gx < MAG_GRID; gx++) {
        const nx = centerX + (gx - half);
        const ny = centerY + (gy - half);
        const px = MAG_PADDING + gx * MAG_CELL;
        const py = MAG_PADDING + gy * MAG_CELL;

        let fill = '#E2E8F0';
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          const colorId = cells[idx];
          fill = colorId === EMPTY_CELL ? '#F1F5F9' : (COLOR_MAP[colorId] || BEAD_FALLBACK_COLOR);
        }

        ctx.fillStyle = fill;
        ctx.fillRect(px, py, MAG_CELL, MAG_CELL);

        ctx.strokeStyle = 'rgba(15,23,42,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, MAG_CELL - 1, MAG_CELL - 1);
      }
    }

    const centerPx = MAG_PADDING + half * MAG_CELL;
    const centerPy = MAG_PADDING + half * MAG_CELL;

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeRect(centerPx + 1, centerPy + 1, MAG_CELL - 2, MAG_CELL - 2);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(15,23,42,0.95)';
    ctx.strokeRect(centerPx + 2, centerPy + 2, MAG_CELL - 4, MAG_CELL - 4);
  }, [magnifier.visible, magnifier.index, cells, width, height]);

  const getCellIndexFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (col >= 0 && col < width && row >= 0 && row < height) {
      return row * width + col;
    }
    return -1;
  };

  // Ensure we don't keep a stroke alive when entering preview
  useEffect(() => {
    if (!isFused) return;
    activePointerIdRef.current = null;
    previewTapRef.current = null;
    setHoverIndex(null);
    setMagnifier((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    onStrokeEnd();
  }, [isFused, onStrokeEnd]);

  // Ensure Move tool cannot leave stale overlays/strokes
  useEffect(() => {
    if (activeTool !== 'move') return;
    activePointerIdRef.current = null;
    previewTapRef.current = null;
    setHoverIndex(null);
    setMagnifier((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    onStrokeEnd();
  }, [activeTool, onStrokeEnd]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isFused) {
      previewTapRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      return;
    }

    // Move tool: let the scroll container handle panning.
    if (activeTool === 'move') return;

    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      setHoverIndex(index);
      setMagnifier({ visible: true, index, clientX: e.clientX, clientY: e.clientY });
      onStrokeStart(index);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isFused) {
      const previewTap = previewTapRef.current;
      if (!previewTap || previewTap.pointerId !== e.pointerId) return;

      const dx = e.clientX - previewTap.startX;
      const dy = e.clientY - previewTap.startY;
      if (Math.hypot(dx, dy) > PREVIEW_TAP_MOVE_TOLERANCE_PX) {
        previewTapRef.current = { ...previewTap, moved: true };
      }
      return;
    }

    if (activeTool === 'move') return;

    // iPad/Safari: do not depend on e.buttons; track the active pointer id + capture.
    if (activePointerIdRef.current !== e.pointerId) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const index = getCellIndexFromEvent(e);
    if (index !== -1) {
      setHoverIndex(index);
      setMagnifier({ visible: true, index, clientX: e.clientX, clientY: e.clientY });
      onStrokeMove(index);
      return;
    }

    setHoverIndex(null);
    setMagnifier((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isFused) {
      const previewTap = previewTapRef.current;
      previewTapRef.current = null;
      if (previewTap && previewTap.pointerId === e.pointerId && !previewTap.moved) {
        onExitFused();
      }
      return;
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (activePointerIdRef.current === e.pointerId) {
      activePointerIdRef.current = null;
    }
    setHoverIndex(null);
    setMagnifier((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    onStrokeEnd();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (isFused) {
      previewTapRef.current = null;
      return;
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (activePointerIdRef.current === e.pointerId) {
      activePointerIdRef.current = null;
    }
    setHoverIndex(null);
    setMagnifier((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    onStrokeEnd();
  };

  const touchClass = isFused || activeTool === 'move' ? 'touch-pan-x touch-pan-y' : 'touch-none';
  const shouldCenter =
    displayWidth <= Math.max(0, wrapperSize.w - WRAPPER_PADDING * 2) &&
    displayHeight <= Math.max(0, wrapperSize.h - WRAPPER_PADDING * 2);
  const alignmentClass = shouldCenter ? 'items-center justify-center' : 'items-start justify-start';

  const magnifierStyle = useMemo((): React.CSSProperties => {
    if (!magnifier.visible) return { display: 'none' };
    if (typeof window === 'undefined') return { display: 'none' };

    let left = magnifier.clientX + MAG_OFFSET_X;
    let top = magnifier.clientY + MAG_OFFSET_Y;

    left = clamp(left, MAG_MARGIN, window.innerWidth - MAG_SIZE - MAG_MARGIN);
    top = clamp(top, MAG_MARGIN, window.innerHeight - MAG_SIZE - MAG_MARGIN);

    return { left, top };
  }, [magnifier]);

  const canvasCursor =
    isFused ? 'cursor-default' : activeTool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair';

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFused) return;
    if (e.target !== e.currentTarget) return;
    onExitFused();
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex-1 overflow-auto flex ${alignmentClass} bg-slate-100 p-4 ${touchClass}`}
      onClick={handleWrapperClick}
    >
      <div
        className={`bg-white shadow-lg rounded-sm ${isFused ? 'border-none' : 'border border-slate-300'} relative transition-all duration-300`}
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: displayWidth, height: displayHeight, display: 'block' }}
          className={`${canvasCursor} ${touchClass}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label="Bead board"
        />
      </div>

      {magnifier.visible && !isFused && activeTool !== 'move' && (
        <div className="fixed z-50 pointer-events-none" style={magnifierStyle}>
          <div className="rounded-2xl shadow-xl border-2 border-white bg-white overflow-hidden">
            <canvas
              ref={magnifierCanvasRef}
              width={MAG_SIZE}
              height={MAG_SIZE}
              className="block"
              aria-hidden
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Pegboard;
