import React from 'react';
import { FolderOpen, FilePlus, Trash2, Flame, AlertTriangle } from 'lucide-react';

interface TopBarProps {
  isFused: boolean;
  unstableCount: number;
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
  isFused,
  unstableCount,
  onToggleFused,
  onNew,
  onOpenGallery,
  onClear,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm p-2 shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="shrink-0 min-h-9 sm:min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3 flex items-center">
          <span className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">Fuse Beads</span>
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
          label="Gallery"
          onClick={onOpenGallery}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          icon={<FolderOpen size={18} />}
        />
        <ActionButton
          label="Clear"
          onClick={onClear}
          className="bg-red-100 text-red-700 hover:bg-red-200"
          icon={<Trash2 size={18} />}
        />
      </div>
    </header>
  );
};

export default TopBar;
