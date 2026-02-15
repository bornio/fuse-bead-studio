import React, { useState, useEffect } from 'react';

interface NameInputDialogProps {
  isOpen: boolean;
  title?: string;
  initialValue?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const NameInputDialog: React.FC<NameInputDialogProps> = ({
  isOpen,
  title = "Name your design",
  initialValue = "My Design",
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(initialValue);

  // Reset name when opened
  useEffect(() => {
    if (isOpen) setName(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 mb-6 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter name..."
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NameInputDialog;