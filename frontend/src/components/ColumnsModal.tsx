import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings2, Check, X, Database } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import { Roster } from '../types';

interface ColumnsModalProps {
  target: { id: number; name: string; columns?: any[] };
  type: 'roster' | 'section';
  shortname: string;
  onClose: () => void;
  onSave: () => void;
}

export const ColumnsModal: React.FC<ColumnsModalProps> = ({ target, type, shortname, onClose, onSave }) => {
  const [columns, setColumns] = useState<any[]>(target.columns || [
      { id: 'rank', name: 'Rank', type: 'dropdown', options: [], checkboxes: ['Acting'] },
      { id: 'name', name: 'Name', type: 'text', checkboxes: ['LOA'] },
      { id: 'position', name: 'Position', type: 'text', checkboxes: [] },
      { id: 'callsign', name: 'Callsign', type: 'text', checkboxes: [] }
  ]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/datasets`);
            setDatasets(res.data);
        } catch (err) {
            console.error('Failed to fetch datasets', err);
        }
    };
    fetchDatasets();
  }, [shortname]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const endpoint = type === 'roster' ? `/rosters/${target.id}` : `/sections/${target.id}`;
      await api.put(endpoint, { columns });
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
            <Settings2 size={18} /> Manage Columns: {target.name}
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
                          <option value="hidden_text">Hidden Text</option>
                          <option value="hidden_dropdown">Hidden Dropdown</option>
                          <option value="predefined_text">Predefined Text</option>
                          <option value="predefined_dropdown">Predefined Dropdown</option>
                          <option value="predefined_hidden_text">Predefined Hidden Text</option>
                          <option value="predefined_hidden_dropdown">Predefined Hidden Dropdown</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-bg/50 border border-border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest flex items-center gap-2">
                                <Database size={12} className="text-accent" /> Bind to Global Dataset
                            </label>
                            {col.dataset_id && (
                                <button 
                                    onClick={() => updateColumn(index, 'dataset_id', null)}
                                    className="text-[9px] font-black uppercase text-danger hover:underline"
                                >
                                    Unbind
                                </button>
                            )}
                        </div>
                        <select 
                            value={col.dataset_id || ''} 
                            onChange={(e) => updateColumn(index, 'dataset_id', e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-bg border border-border p-2 rounded text-xs text-text focus:border-accent outline-none"
                        >
                            <option value="">No Dataset Linked</option>
                            {datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-muted font-medium leading-relaxed italic opacity-60">
                            Linking a dataset will source options and autofill values from the selected global variable set.
                        </p>
                    </div>

                    {(col.type === 'dropdown' || col.type === 'predefined_dropdown' || col.type === 'text' || col.type === 'predefined_text') && !col.dataset_id && (
                      <div className="space-y-2 border-t border-border mt-4 pt-4">
                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest">
                            {(col.type === 'text' || col.type === 'predefined_text') ? 'Suggestion Options' : 'Dropdown Options'}
                        </label>
                        {(col.options || []).map((opt: any, optIdx: number) => (
                          <div key={optIdx} className="flex gap-2 items-center">
                            <input 
                              value={opt.label} 
                              onChange={(e) => {
                                const newOpts = [...(col.options || [])];
                                newOpts[optIdx].label = e.target.value;
                                updateColumn(index, 'options', newOpts);
                              }}
                              className={`flex-1 bg-bg border border-border p-2 rounded text-sm text-text focus:border-accent outline-none ${opt.bold ? 'font-bold' : ''}`} 
                              style={{ color: opt.color || 'inherit' }}
                              placeholder="Option Label"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button 
                                    onClick={() => {
                                        const newOpts = [...(col.options || [])];
                                        newOpts[optIdx].bold = !newOpts[optIdx].bold;
                                        updateColumn(index, 'options', newOpts);
                                    }}
                                    className={`w-7 h-7 rounded border transition-all text-[10px] font-black uppercase ${opt.bold ? 'bg-accent border-accent text-white' : 'bg-bg border-border text-muted hover:border-accent/30'}`}
                                    title="Toggle Bold"
                                >
                                    B
                                </button>
                                <div className="relative group/manual-color flex items-center">
                                    <input 
                                        type="color" 
                                        value={opt.color || '#ffffff'} 
                                        onChange={(e) => {
                                            const newOpts = [...(col.options || [])];
                                            newOpts[optIdx].color = e.target.value;
                                            updateColumn(index, 'options', newOpts);
                                        }}
                                        className={`w-7 h-7 rounded cursor-pointer p-0 bg-bg border border-border ${!opt.color ? 'opacity-20' : ''}`} 
                                    />
                                    {opt.color && (
                                        <button 
                                            onClick={() => {
                                                const newOpts = [...(col.options || [])];
                                                newOpts[optIdx].color = null;
                                                updateColumn(index, 'options', newOpts);
                                            }}
                                            className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover/manual-color:opacity-100 transition-opacity"
                                            title="Remove Color"
                                        >
                                            <X size={8} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => {
                              const newOpts = [...(col.options || [])];
                              newOpts.splice(optIdx, 1);
                              updateColumn(index, 'options', newOpts);
                            }} className="text-danger hover:text-danger/80 p-1"><Trash2 size={14} /></button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newOpts = [...(col.options || []), { label: '', color: null, bold: false }];
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
