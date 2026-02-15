import React from 'react';
import { Tool } from '../types';
import { Paintbrush, Eraser, Undo, Redo } from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  onSetTool: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSetTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200">
      <div className="flex gap-2">
        <button
          onClick={() => onSetTool('paint')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            activeTool === 'paint' 
              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          aria-label="Paint Tool"
        >
          <Paintbrush size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Paint</span>
        </button>
        <button
          onClick={() => onSetTool('erase')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            activeTool === 'erase' 
              ? 'bg-red-100 text-red-700 ring-2 ring-red-500' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          aria-label="Erase Tool"
        >
          <Eraser size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Erase</span>
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-3 rounded-full text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-200 active:bg-slate-300 transition-colors"
          aria-label="Undo"
        >
          <Undo size={24} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-3 rounded-full text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-slate-200 active:bg-slate-300 transition-colors"
          aria-label="Redo"
        >
          <Redo size={24} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;