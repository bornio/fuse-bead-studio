import React from 'react';
import { Save, FolderOpen, FilePlus, Trash2, Flame, AlertTriangle } from 'lucide-react';
import { BoardSize } from '../types';
import { BOARD_SIZES } from '../constants';

interface TopBarProps {
  designName: string;
  isSaved: boolean;
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

const TopBar: React.FC<TopBarProps> = ({ 
  designName, 
  isSaved,
  currentSize,
  isFused,
  unstableCount,
  onToggleFused,
  onSizeChange,
  onNew, 
  onSave, 
  onOpenMyDesigns,
  onClear
}) => {
  const getSizeValue = (size: BoardSize) => `${size.width}x${size.height}`;
  const matchedPresetSize = BOARD_SIZES.find(
    (size) => size.width === currentSize.width && size.height === currentSize.height
  );
  const sizeOptions = matchedPresetSize ? BOARD_SIZES : [currentSize, ...BOARD_SIZES];

  return (
    <header className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 z-10 shadow-sm shrink-0 gap-2">
      
      {/* Left: Title & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden md:block font-bold text-slate-800 text-lg">Fuse Beads</div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-700 truncate max-w-[120px] sm:max-w-xs leading-tight">
            {designName}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight truncate">
            {isSaved ? 'Saved' : 'Unsaved...'}
          </span>
        </div>
      </div>

      {/* Center: Structural Warning (Only in Fused Mode) */}
      {isFused && unstableCount > 0 && (
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-medium items-center gap-2 border border-red-200 animate-pulse">
          <AlertTriangle size={14} />
          <span>{unstableCount} Weak Bead{unstableCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Middle/Right: Controls */}
      <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
        
        {/* Fused Toggle with Notification Dot */}
        <div className="relative">
          <button
            onClick={onToggleFused}
            className={`
              p-2 rounded-lg transition-all flex items-center gap-1
              ${isFused 
                ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-400' 
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
            `}
            title={isFused ? "Switch to Editor View" : "Preview Fused/Ironed View"}
          >
            <Flame size={20} className={isFused ? "fill-current" : ""} />
            <span className="sr-only">Fused View</span>
          </button>
          {isFused && unstableCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white">
              !
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        {/* Size Selector */}
        <select
          value={getSizeValue(currentSize)}
          onChange={(e) => {
            const size = sizeOptions.find((s) => getSizeValue(s) === e.target.value);
            if (size) onSizeChange(size);
          }}
          className="bg-slate-100 border border-slate-300 text-slate-900 text-xs sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-auto p-1.5 sm:p-2 font-medium max-w-[100px] sm:max-w-none"
          title="Change Board Size (Starts New)"
        >
          {sizeOptions.map((size) => (
            <option key={getSizeValue(size)} value={getSizeValue(size)}>
              {size.width}x{size.height}
            </option>
          ))}
        </select>

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        <button
          onClick={onNew}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
          title="New Design"
        >
          <FilePlus size={20} />
          <span className="sr-only">New</span>
        </button>

        <button
          onClick={onOpenMyDesigns}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:bg-slate-200"
          title="My Designs"
        >
          <FolderOpen size={20} />
          <span className="sr-only">Open</span>
        </button>

        <button
          onClick={onSave}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:bg-blue-100"
          title="Save Design"
        >
          <Save size={20} />
          <span className="sr-only">Save</span>
        </button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        <button
          onClick={onClear}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors active:bg-red-100"
          title="Clear Board"
        >
          <Trash2 size={20} />
          <span className="sr-only">Clear</span>
        </button>

      </div>
    </header>
  );
};

export default TopBar;
