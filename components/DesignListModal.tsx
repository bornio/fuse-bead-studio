import React, { useState } from 'react';
import { DesignIndexEntry } from '../types';
import { Trash2, Edit2, X, FileImage, Check } from 'lucide-react';

interface DesignListModalProps {
  isOpen: boolean;
  designs: DesignIndexEntry[];
  currentDesignId: string | null;
  onClose: () => void;
  onLoad: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const MAX_NAME_LENGTH = 40;

const DesignListModal: React.FC<DesignListModalProps> = ({
  isOpen,
  designs,
  currentDesignId,
  onClose,
  onLoad,
  onDeleteRequest,
  onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditError(null);
  };

  const startEditing = (design: DesignIndexEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(design.id);
    setEditName(design.name);
    setEditError(null);
  };

  const saveEdit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingId) return;

    const trimmed = editName.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NAME_LENGTH) {
      setEditError(`Name must be 1-${MAX_NAME_LENGTH} characters.`);
      return;
    }

    onRename(editingId, trimmed);
    cancelEditing();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteRequest(id);
  };

  const handleRowClick = (id: string) => {
    if (editingId) {
      cancelEditing();
      return;
    }
    onLoad(id);
    onClose();
  };

  const formatDate = (iso: string) => (
    new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">My Designs</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-2"
          onClick={() => {
            if (editingId) cancelEditing();
          }}
        >
          {designs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FileImage size={48} className="mx-auto mb-3 opacity-20" />
              <p>No designs yet.</p>
            </div>
          ) : (
            designs.map((design) => (
              <div
                key={design.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(design.id);
                }}
                className={`
                  group p-3 rounded-lg border transition-all cursor-pointer
                  ${currentDesignId === design.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}
                `}
              >
                {editingId === design.id ? (
                  <form onSubmit={saveEdit} className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 items-start">
                      <input
                        autoFocus
                        onFocus={(e) => e.currentTarget.select()}
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          if (editError) setEditError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <button
                        type="submit"
                        className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full"
                        aria-label="Save name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                        aria-label="Cancel rename"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold truncate ${currentDesignId === design.id ? 'text-blue-800' : 'text-slate-800'}`}>
                        {design.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{design.width} x {design.height}</span>
                        <span>•</span>
                        <span>{formatDate(design.updatedAt)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditing(design, e)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        aria-label="Rename"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(design.id, e)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignListModal;
