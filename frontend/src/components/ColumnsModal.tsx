import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings2, Check, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import { Roster } from '../types';

interface ColumnsModalProps {
  roster: Roster;
  onClose: () => void;
  onSave: () => void;
}

export const ColumnsModal: React.FC<ColumnsModalProps> = ({ roster, onClose, onSave }) => {
  const [columns, setColumns] = useState<any[]>(roster.columns || [
      { id: 'rank', name: 'Rank', type: 'dropdown', options: [], checkboxes: ['Acting'] },
      { id: 'name', name: 'Name', type: 'text', checkboxes: ['LOA'] },
      { id: 'position', name: 'Position', type: 'text', checkboxes: [] },
      { id: 'callsign', name: 'Callsign', type: 'text', checkboxes: [] }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/rosters/${roster.id}`, { columns });
      onSave();
    } catch (err) {
      console.error('Failed to save columns', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addColumn = () => {
    setColumns([...columns, { 
      id: `col_${Date.now()}`, 
      name: 'New Column', 
      type: 'text', 
      options: [], 
      checkboxes: [] 
    }]);
    setEditingIndex(columns.length);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, key: string, value: any) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], [key]: value };
    setColumns(newCols);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
      <div className="bg-card p-6 rounded-lg max-w-2xl w-full border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-text">
            <Settings2 size={18} /> Manage Columns: {roster.name}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <Reorder.Group axis="y" values={columns} onReorder={setColumns} className="space-y-3">
            {columns.map((col, index) => (
              <Reorder.Item key={col.id} value={col} className="bg-surface border border-border rounded-lg p-4 group relative">
                {editingIndex === index ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Column Name</label>
                        <input 
                          value={col.name} 
                          onChange={(e) => updateColumn(index, 'name', e.target.value)}
                          className="w-full bg-bg border border-border p-2 rounded text-sm text-text focus:border-accent outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Column Type</label>
                        <select 
                          value={col.type} 
                          onChange={(e) => updateColumn(index, 'type', e.target.value)}
                          className="w-full bg-bg border border-border p-2 rounded text-sm text-text focus:border-accent outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="predefined_text">Predefined Text</option>
                          <option value="predefined_dropdown">Predefined Dropdown</option>
                        </select>
                      </div>
                    </div>

                    {(col.type === 'dropdown' || col.type === 'predefined_dropdown') && (
                      <div className="space-y-2 border-t border-border mt-4 pt-4">
                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest">Dropdown Options</label>
                        {(col.options || []).map((opt: any, optIdx: number) => (
                          <div key={optIdx} className="flex gap-2 items-center">
                            <input 
                              value={opt.label} 
                              onChange={(e) => {
                                const newOpts = [...(col.options || [])];
                                newOpts[optIdx].label = e.target.value;
                                updateColumn(index, 'options', newOpts);
                              }}
                              className="flex-1 bg-bg border border-border p-2 rounded text-sm text-text focus:border-accent outline-none" 
                              placeholder="Option Label"
                            />
                            <input 
                              type="color" 
                              value={opt.color || '#ffffff'} 
                              onChange={(e) => {
                                const newOpts = [...(col.options || [])];
                                newOpts[optIdx].color = e.target.value;
                                updateColumn(index, 'options', newOpts);
                              }}
                              className="w-8 h-8 rounded cursor-pointer p-0 bg-transparent border-0" 
                            />
                            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                              <input 
                                type="checkbox" 
                                checked={opt.bold || false} 
                                onChange={(e) => {
                                  const newOpts = [...(col.options || [])];
                                  newOpts[optIdx].bold = e.target.checked;
                                  updateColumn(index, 'options', newOpts);
                                }}
                              /> Bold
                            </label>
                            <button onClick={() => {
                              const newOpts = [...(col.options || [])];
                              newOpts.splice(optIdx, 1);
                              updateColumn(index, 'options', newOpts);
                            }} className="text-danger hover:text-danger/80 p-1"><Trash2 size={14} /></button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newOpts = [...(col.options || []), { label: '', color: '#ffffff', bold: false }];
                            updateColumn(index, 'options', newOpts);
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-accent hover:text-accent/80"
                        >
                          <Plus size={12} /> Add Option
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border mt-4 pt-4">
                      <label className="block text-[10px] text-muted font-bold uppercase tracking-widest">Checkboxes (e.g. Acting, Alt)</label>
                      <div className="flex flex-wrap gap-2">
                        {(col.checkboxes || []).map((cb: string, cbIdx: number) => (
                          <div key={cbIdx} className="flex items-center gap-1 bg-bg px-2 py-1 rounded border border-border">
                            <input 
                              value={cb}
                              onChange={(e) => {
                                const newCbs = [...(col.checkboxes || [])];
                                newCbs[cbIdx] = e.target.value;
                                updateColumn(index, 'checkboxes', newCbs);
                              }}
                              className="bg-transparent text-xs w-16 outline-none text-text"
                            />
                            <button onClick={() => {
                              const newCbs = [...(col.checkboxes || [])];
                              newCbs.splice(cbIdx, 1);
                              updateColumn(index, 'checkboxes', newCbs);
                            }} className="text-muted hover:text-danger"><X size={12} /></button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newCbs = [...(col.checkboxes || []), 'New'];
                            updateColumn(index, 'checkboxes', newCbs);
                          }}
                          className="flex items-center gap-1 bg-bg px-2 py-1 rounded border border-border border-dashed text-muted hover:text-text hover:border-accent text-xs"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border">
                      <button onClick={() => setEditingIndex(null)} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition flex items-center gap-1">
                        <Check size={14} /> Done Editing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="cursor-grab active:cursor-grabbing text-muted hover:text-text">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-text">{col.name}</div>
                      <div className="text-[10px] text-muted uppercase tracking-widest">{col.type.replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingIndex(index)} className="p-2 text-muted hover:text-accent rounded hover:bg-accent/10 transition-colors">
                        <Settings2 size={16} />
                      </button>
                      <button onClick={() => removeColumn(index)} className="p-2 text-muted hover:text-danger rounded hover:bg-danger/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
          <button 
            onClick={addColumn}
            className="w-full py-4 border-2 border-dashed border-border rounded-lg text-muted hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"
          >
            <Plus size={18} /> Add New Column
          </button>
        </div>

        <div className="flex gap-3 pt-6 border-t border-border mt-auto">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Columns'}
          </button>
        </div>
      </div>
    </div>
  );
};
