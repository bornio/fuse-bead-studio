import React from 'react';
import { Save, FolderOpen, FilePlus, Trash2, Flame, AlertTriangle } from 'lucide-react';
import { BoardSize, SaveStatus } from '../types';
import { BOARD_SIZES } from '../constants';

interface TopBarProps {
  designName: string;
  saveStatus: SaveStatus;
  currentSize: BoardSize;
  isFused: boolean;
  unstableCount: number;
  onToggleFused: () => void;
  onSizeChange: (size: BoardSize) => void;
  onNew: () => void;
  onSave: () => void;
  onOpenMyDesigns: () => void;
  onClear: () => void;
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, className, icon }) => (
  <button
    onClick={onClick}
    className={`shrink-0 min-h-9 sm:min-h-10 rounded-xl px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-colors active:scale-[0.99] ${className}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const TopBar: React.FC<TopBarProps> = ({
  designName,
  saveStatus,
  currentSize,
  isFused,
  unstableCount,
  onToggleFused,
  onSizeChange,
  onNew,
  onSave,
  onOpenMyDesigns,
  onClear,
}) => {
  const getSizeValue = (size: BoardSize) => `${size.width}x${size.height}`;
  const matchedPresetSize = BOARD_SIZES.find(
    (size) => size.width === currentSize.width && size.height === currentSize.height
  );
  const sizeOptions = matchedPresetSize ? BOARD_SIZES : [currentSize, ...BOARD_SIZES];

  const saveStatusText = {
    saved: 'All changes saved',
    saving: 'Saving...',
    error: "Couldn't save",
  }[saveStatus];

  const saveStatusClass = {
    saved: 'text-emerald-700',
    saving: 'text-amber-700',
    error: 'text-red-700',
  }[saveStatus];

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm p-2 shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="shrink-0 min-h-9 sm:min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2 max-w-[82vw] sm:max-w-[90vw]">
          <span className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">Fuse Beads</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate max-w-[110px] sm:max-w-[240px]">
            {designName}
          </span>
          <span className="text-slate-300">•</span>
          <span className={`text-xs font-semibold whitespace-nowrap ${saveStatusClass}`}>{saveStatusText}</span>
        </div>

        {isFused && unstableCount > 0 && (
          <div className="shrink-0 min-h-10 rounded-xl border border-red-200 bg-red-50 px-3 flex items-center gap-2 text-red-800">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-xs font-semibold whitespace-nowrap">
              Needs support: {unstableCount} weak bead{unstableCount !== 1 ? 's' : ''}
            </span>
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
          icon={<Flame size={18} className={isFused ? 'fill-current' : ''} />}
        />

        <ActionButton
          label="New"
          onClick={onNew}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          icon={<FilePlus size={18} />}
        />
        <ActionButton
          label="Designs"
          onClick={onOpenMyDesigns}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          icon={<FolderOpen size={18} />}
        />
        <ActionButton
          label="Save"
          onClick={onSave}
          className="bg-blue-100 text-blue-700 hover:bg-blue-200"
          icon={<Save size={18} />}
        />
        <ActionButton
          label="Clear"
          onClick={onClear}
          className="bg-red-100 text-red-700 hover:bg-red-200"
          icon={<Trash2 size={18} />}
        />

        <div className="shrink-0 min-h-9 sm:min-h-10 rounded-xl border border-slate-300 bg-slate-50 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2">
          <label htmlFor="board-size-select" className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-600">
            Board
          </label>
          <select
            id="board-size-select"
            value={getSizeValue(currentSize)}
            onChange={(e) => {
              const size = sizeOptions.find((s) => getSizeValue(s) === e.target.value);
              if (size) onSizeChange(size);
            }}
            className="min-h-7 sm:min-h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Change board size"
          >
            {sizeOptions.map((size) => (
              <option key={getSizeValue(size)} value={getSizeValue(size)}>
                {size.width}x{size.height}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
