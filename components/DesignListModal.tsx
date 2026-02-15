import React, { useState } from 'react';
import { DesignIndexEntry } from '../types';
import { Trash2, Edit2, X, FileImage } from 'lucide-react';

interface DesignListModalProps {
  isOpen: boolean;
  designs: DesignIndexEntry[];
  currentDesignId: string | null;
  onClose: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const DesignListModal: React.FC<DesignListModalProps> = ({
  isOpen,
  designs,
  currentDesignId,
  onClose,
  onLoad,
  onDelete,
  onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEditing = (design: DesignIndexEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(design.id);
    setEditName(design.name);
  };

  const saveEdit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">My Designs</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {designs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FileImage size={48} className="mx-auto mb-3 opacity-20" />
              <p>No saved designs yet.</p>
            </div>
          ) : (
            designs.map((design) => (
              <div 
                key={design.id}
                onClick={() => {
                   if (!editingId && !deleteConfirmId) {
                     onLoad(design.id);
                     onClose();
                   }
                }}
                className={`
                  group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                  ${currentDesignId === design.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}
                `}
              >
                {editingId === design.id ? (
                  <form onSubmit={saveEdit} className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      autoFocus
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      onBlur={() => saveEdit()}
                    />
                  </form>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold truncate ${currentDesignId === design.id ? 'text-blue-800' : 'text-slate-800'}`}>
                      {design.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{design.width} × {design.height}</span>
                      <span>•</span>
                      <span>{formatDate(design.updatedAt)}</span>
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                   {!editingId && (
                     <>
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
                     </>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {deleteConfirmId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 rounded-xl backdrop-blur-[1px]">
          <div className="bg-white p-5 rounded-lg shadow-xl max-w-xs w-full animate-in fade-in zoom-in duration-150">
            <h4 className="font-bold text-slate-900 mb-2">Delete Design?</h4>
            <p className="text-sm text-slate-600 mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignListModal;