import React from 'react';
import { PALETTE } from '../constants';

interface PaletteProps {
  activeColorId: number;
  onSelectColor: (id: number) => void;
}

const Palette: React.FC<PaletteProps> = ({ activeColorId, onSelectColor }) => {
  return (
    <div className="flex overflow-x-auto gap-3 p-3 bg-white border-t border-slate-200 no-scrollbar">
      {PALETTE.map((color) => (
        <button
          key={color.id}
          onClick={() => onSelectColor(color.id)}
          className={`
            flex-shrink-0 w-11 h-11 rounded-full border-2 transition-transform active:scale-95
            ${activeColorId === color.id ? 'border-slate-800 scale-110 shadow-md' : 'border-slate-100'}
          `}
          style={{ backgroundColor: color.hex }}
          aria-label={`Select ${color.name}`}
        >
          {activeColorId === color.id && (
            <span className="sr-only">Selected</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default Palette;