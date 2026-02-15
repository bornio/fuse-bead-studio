import React from 'react';
import { FolderOpen, FilePlus, Trash2, Flame, AlertTriangle } from 'lucide-react';

interface TopBarProps {
  isFused: boolean;
  unstableCount: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onToggleFused: () => void;
  onNew: () => void;
  onOpenGallery: () => void;
  onClear: () => void;
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  ariaLabel?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, className, icon, ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel || label}
    className={`shrink-0 min-h-[44px] rounded-xl px-3 sm:px-4 flex items-center gap-2 text-sm font-semibold transition-colors active:scale-[0.99] ${className}`}
  >
    {icon}
    <span className="whitespace-nowrap">{label}</span>
  </button>
);

const ZoomButton: React.FC<{ label: string; onClick: () => void; ariaLabel: string }> = ({
  label,
  onClick,
  ariaLabel,
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="min-h-[44px] min-w-[44px] rounded-lg bg-white border border-slate-200 text-slate-800 text-xl font-bold leading-none active:scale-[0.99] hover:bg-slate-100 transition-colors"
  >
    {label}
  </button>
);

const TopBar: React.FC<TopBarProps> = ({
  isFused,
  unstableCount,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onToggleFused,
  onNew,
  onOpenGallery,
  onClear,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="shrink-0 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center">
          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">Fuse Beads</span>
        </div>

        <div className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <ZoomButton label="−" ariaLabel="Zoom out" onClick={onZoomOut} />
          <div className="min-h-[44px] min-w-[64px] px-2 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums text-slate-700">
            {zoomPercent}%
          </div>
          <ZoomButton label="+" ariaLabel="Zoom in" onClick={onZoomIn} />
          <button
            onClick={onZoomFit}
            aria-label="Fit to screen"
            className="min-h-[44px] px-3 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 active:scale-[0.99] transition-colors"
          >
            Fit
          </button>
        </div>

        {isFused && unstableCount > 0 && (
          <div className="shrink-0 min-h-[44px] rounded-xl border border-red-200 bg-red-50 px-3 flex items-center gap-2 text-red-800">
            <AlertTriangle size={18} className="shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                Needs help: {unstableCount} weak spot{unstableCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap opacity-90">
                Add beads next to the X.
              </span>
            </div>
          </div>
        )}

        <ActionButton
          label={isFused ? 'Back to edit' : 'Preview'}
          onClick={onToggleFused}
          className={
            isFused
              ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }
          icon={<Flame size={20} className={isFused ? 'fill-current' : ''} />}
        />

        <ActionButton
          label="New"
          onClick={onNew}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          icon={<FilePlus size={20} />}
        />
        <ActionButton
          label="Gallery"
          onClick={onOpenGallery}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          icon={<FolderOpen size={20} />}
        />
        <ActionButton
          label="Clear"
          onClick={onClear}
          className="bg-red-100 text-red-700 hover:bg-red-200"
          icon={<Trash2 size={20} />}
        />
      </div>
    </header>
  );
};

export default TopBar;
