import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings2, Check, X, Database, Flag } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import { Roster } from '../types';

interface ColumnsModalProps {
  target: { id: number; name: string; columns?: any[] };
  parentColumns?: any[];
  type: 'roster' | 'section';
  shortname: string;
  onClose: () => void;
  onSave: () => void;
}

export const ColumnsModal: React.FC<ColumnsModalProps> = ({ target, parentColumns, type, shortname, onClose, onSave }) => {
  const [columns, setColumns] = useState<any[]>(target.columns || parentColumns || [
      { id: 'rank', name: 'Rank', type: 'dropdown', options: [], checkboxes: ['Acting'] },
      { id: 'name', name: 'Name', type: 'text', checkboxes: ['LOA'] },
      { id: 'position', name: 'Position', type: 'text', checkboxes: [] },
      { id: 'callsign', name: 'Callsign', type: 'text', checkboxes: [] }
  ]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [recordDatabases, setRecordDatabases] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [useRosterColumns, setUseRosterColumns] = useState<boolean>(target.use_roster_columns !== undefined ? target.use_roster_columns : true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchDatasetsAndFlags = async () => {
        try {
            const [datasetsRes, flagsRes, recordsRes] = await Promise.all([
                api.get(`/factions/${shortname}/datasets`),
                api.get(`/factions/${shortname}/flags`),
                api.get(`/factions/${shortname}/records`)
            ]);
            setDatasets(datasetsRes.data);
            setFlags(flagsRes.data);
            setRecordDatabases(recordsRes.data.filter((db: any) => db.is_published));
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    };
    fetchDatasetsAndFlags();
  }, [shortname]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const endpoint = type === 'roster' ? `/rosters/${target.id}` : `/sections/${target.id}`;
      const payload = type === 'roster' ? { columns } : { columns, use_roster_columns: useRosterColumns };
      await api.put(endpoint, payload);
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
    setColumns(prev => {
        const newCols = [...prev];
        newCols[index] = { ...newCols[index], [key]: value };
        return newCols;
    });
  };

  const updateColumnFields = (index: number, fields: Record<string, any>) => {
    setColumns(prev => {
        const newCols = [...prev];
        newCols[index] = { ...newCols[index], ...fields };
        return newCols;
    });
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

        {type === 'section' && (
            <div className="mb-6 p-4 bg-surface border border-border rounded-xl flex items-center justify-between group/toggle">
                <div className="space-y-0.5">
                    <span className="text-sm font-bold text-text block uppercase tracking-tight italic">Parent Roster Columns</span>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">Inherit all columns and settings from the parent roster</span>
                </div>
                <button 
                    onClick={() => setUseRosterColumns(!useRosterColumns)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${useRosterColumns ? 'bg-accent' : 'bg-muted/20'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md ${useRosterColumns ? 'right-1' : 'left-1'}`} />
                </button>
            </div>
        )}

        <div className={`flex-1 overflow-y-auto pr-2 space-y-4 transition-opacity duration-300 ${type === 'section' && useRosterColumns ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
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
                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Column ID (System)</label>
                        <input 
                          value={col.id} 
                          onChange={(e) => updateColumn(index, 'id', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                          className="w-full bg-bg border border-border p-2 rounded text-sm text-text focus:border-accent outline-none font-mono" 
                          placeholder="column_id"
                        />
                      </div>
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
                          <option value="database_data">Database Data Column</option>
                        </select>
                      </div>

                    {col.type === 'database_data' && (
                        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 text-accent">
                                <Database size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Database Data Mapping</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] text-muted font-bold uppercase tracking-widest mb-1.5">Source Column</label>
                                    <select 
                                        value={col.source_column_id || ''} 
                                        onChange={(e) => {
                                            const sourceCol = columns.find(c => c.id === e.target.value);
                                            const dataset = datasets.find(d => d.id === sourceCol?.dataset_id);
                                            updateColumnFields(index, {
                                                source_column_id: e.target.value,
                                                linked_database_id: dataset?.record_database_id || null
                                            });
                                        }}
                                        className="w-full bg-surface border border-border p-2 rounded text-xs text-text focus:border-accent outline-none"
                                    >
                                        <option value="">Select Column...</option>
                                        {columns.filter(c => {
                                            const ds = datasets.find(d => d.id === c.dataset_id);
                                            return c.id !== col.id && ds?.record_database_id;
                                        }).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] text-muted font-bold uppercase tracking-widest mb-1.5">Field to Display</label>
                                    <select 
                                        disabled={!col.source_column_id}
                                        value={col.data_field_id || ''} 
                                        onChange={(e) => updateColumn(index, 'data_field_id', e.target.value)}
                                        className="w-full bg-surface border border-border p-2 rounded text-xs text-text focus:border-accent outline-none disabled:opacity-50"
                                    >
                                        <option value="">Select Field...</option>
                                        {recordDatabases.find(db => db.id === col.linked_database_id)?.database_structure.map((f: any) => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                        <option value="id">Record ID</option>
                                        <option value="created_at">Date Created</option>
                                    </select>
                                </div>
                            </div>

                            <p className="text-[9px] text-muted font-medium italic opacity-60">
                                This column will automatically display data from the database entry selected in the source column.
                            </p>
                        </div>
                    )}

                    {col.type !== 'database_data' && (
                        <div className="bg-bg/50 border border-border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-muted font-black uppercase tracking-widest flex items-center gap-2">
                                <Database size={12} className="text-accent" /> Bind to Global Dataset
                            </label>
                            {col.dataset_id && (
                                <button 
                                    onClick={() => {
                                        updateColumnFields(index, {
                                            dataset_id: null,
                                            database_field_id: null
                                        });
                                    }}
                                    className="text-[9px] font-black uppercase text-danger hover:underline"
                                >
                                    Unbind
                                </button>
                            )}
                        </div>
                        <select 
                            value={col.dataset_id || ''} 
                            onChange={(e) => {
                                const dsId = e.target.value ? Number(e.target.value) : null;
                                const ds = datasets.find(d => d.id === dsId);
                                
                                const updates: any = { dataset_id: dsId };
                                
                                // If it's a database-linked dataset, default the field
                                if (ds?.record_database_id) {
                                    const db = recordDatabases.find(d => d.id === ds.record_database_id);
                                    const firstFieldId = db?.database_structure?.[0]?.id;
                                    updates.database_field_id = firstFieldId || 'id';
                                } else {
                                    updates.database_field_id = null;
                                }
                                
                                updateColumnFields(index, updates);
                            }}
                            className="w-full bg-bg border border-border p-2 rounded text-xs text-text focus:border-accent outline-none"
                        >
                            <option value="">No Dataset Linked</option>
                            {datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.name} {d.record_database_id ? '(Database)' : ''}</option>
                            ))}
                        </select>
                        
                        {datasets.find(d => d.id === col.dataset_id)?.record_database_id && (
                            <div className="pt-2 border-t border-border/30">
                                <label className="block text-[8px] text-muted font-black uppercase tracking-[0.2em] mb-1">Database Reference Field</label>
                                <select 
                                    value={col.database_field_id || ''} 
                                    onChange={(e) => updateColumn(index, 'database_field_id', e.target.value)}
                                    className="w-full bg-bg border border-border p-1.5 rounded text-[10px] font-bold text-accent focus:border-accent outline-none"
                                >
                                    {recordDatabases.find(db => db.id === datasets.find(d => d.id === col.dataset_id)?.record_database_id)?.database_structure.map((f: any) => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                    <option value="id">Record ID</option>
                                </select>
                            </div>
                        )}

                        <p className="text-[9px] text-muted font-medium leading-relaxed italic opacity-60">
                            Linking a dataset will source options and autofill values from the selected global variable set.
                        </p>
                    </div>
                    )}

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
                        {(col.checkboxes || []).map((cb: any, cbIdx: number) => {
                          const label = typeof cb === 'string' ? cb : cb.label;
                          const color = typeof cb === 'string' ? null : cb.color;
                          const autoApply = typeof cb === 'string' ? null : cb.auto_apply;
                          
                          const linkedDataset = datasets.find(d => d.id === col.dataset_id);
                          const linkedDb = recordDatabases.find(db => db.id === linkedDataset?.record_database_id);
                          const dbStructure = linkedDb?.database_structure || [];

                          return (
                            <div key={cbIdx} className="flex flex-col gap-2 bg-bg p-2 rounded border border-border group/cb">
                              <div className="flex items-center gap-1.5">
                                <input 
                                    value={label}
                                    onChange={(e) => {
                                    const newCbs = [...(col.checkboxes || [])];
                                    if (typeof cb === 'string') {
                                        newCbs[cbIdx] = e.target.value;
                                    } else {
                                        newCbs[cbIdx] = { ...cb, label: e.target.value };
                                    }
                                    updateColumn(index, 'checkboxes', newCbs);
                                    }}
                                    className="bg-transparent text-xs w-16 outline-none text-text"
                                    placeholder="Label"
                                />
                                <div className="relative flex items-center">
                                    <input 
                                        type="color" 
                                        value={color || '#ffffff'} 
                                        onChange={(e) => {
                                            const newCbs = [...(col.checkboxes || [])];
                                            const newLabel = typeof cb === 'string' ? cb : cb.label;
                                            const existingAutoApply = typeof cb === 'string' ? null : cb.auto_apply;
                                            newCbs[cbIdx] = { label: newLabel, color: e.target.value, auto_apply: existingAutoApply };
                                            updateColumn(index, 'checkboxes', newCbs);
                                        }}
                                        className={`w-4 h-4 rounded-sm cursor-pointer p-0 bg-transparent border-none ${!color ? 'opacity-20' : ''}`} 
                                    />
                                    {color && (
                                        <button 
                                            onClick={() => {
                                                const newCbs = [...(col.checkboxes || [])];
                                                if (autoApply) {
                                                    newCbs[cbIdx] = { label: label, color: null, auto_apply: autoApply };
                                                } else {
                                                    newCbs[cbIdx] = label; 
                                                }
                                                updateColumn(index, 'checkboxes', newCbs);
                                            }}
                                            className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover/cb:opacity-100 transition-opacity"
                                        >
                                            <X size={6} />
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => {
                                    const newCbs = [...(col.checkboxes || [])];
                                    newCbs.splice(cbIdx, 1);
                                    updateColumn(index, 'checkboxes', newCbs);
                                }} className="text-muted hover:text-danger ml-auto"><X size={12} /></button>
                              </div>
                              
                              {linkedDb && (
                                  <div className="pt-1.5 border-t border-border/30 flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => {
                                                const newCbs = [...(col.checkboxes || [])];
                                                const newLabel = typeof cb === 'string' ? cb : cb.label;
                                                const newColor = typeof cb === 'string' ? null : cb.color;
                                                
                                                if (autoApply) {
                                                    if (!newColor) newCbs[cbIdx] = newLabel;
                                                    else newCbs[cbIdx] = { label: newLabel, color: newColor };
                                                } else {
                                                    newCbs[cbIdx] = { 
                                                        label: newLabel, 
                                                        color: newColor, 
                                                        auto_apply: { db_column: dbStructure[0]?.id || '', match_value: '' } 
                                                    };
                                                }
                                                updateColumn(index, 'checkboxes', newCbs);
                                            }}
                                            className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border transition-colors ${autoApply ? 'bg-accent border-accent text-white' : 'border-border text-muted hover:border-accent'}`}
                                          >
                                              Auto-Apply
                                          </button>
                                      </div>
                                      
                                      {autoApply && (
                                          <div className="flex flex-col gap-1">
                                              <select 
                                                value={autoApply.db_column}
                                                onChange={(e) => {
                                                    const newCbs = [...(col.checkboxes || [])];
                                                    newCbs[cbIdx] = { ...cb, auto_apply: { ...autoApply, db_column: e.target.value } };
                                                    updateColumn(index, 'checkboxes', newCbs);
                                                }}
                                                className="w-full bg-surface border border-border p-1 rounded text-[8px] font-bold text-text focus:border-accent outline-none"
                                              >
                                                  {dbStructure.map((f: any) => (
                                                      <option key={f.id} value={f.id}>{f.name}</option>
                                                  ))}
                                                  <option value="id">Record ID</option>
                                              </select>
                                              <input 
                                                value={autoApply.match_value}
                                                onChange={(e) => {
                                                    const newCbs = [...(col.checkboxes || [])];
                                                    newCbs[cbIdx] = { ...cb, auto_apply: { ...autoApply, match_value: e.target.value } };
                                                    updateColumn(index, 'checkboxes', newCbs);
                                                }}
                                                placeholder="Match Value..."
                                                className="w-full bg-surface border border-border p-1 rounded text-[8px] font-bold text-text focus:border-accent outline-none"
                                              />
                                          </div>
                                      )}
                                  </div>
                              )}
                            </div>
                          );
                        })}
                        <button 
                          onClick={() => {
                            const newCbs = [...(col.checkboxes || []), 'New'];
                            updateColumn(index, 'checkboxes', newCbs);
                          }}
                          className="flex items-center gap-1 bg-bg px-2 py-1 rounded border border-border border-dashed text-muted hover:text-text hover:border-accent text-xs h-fit"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border mt-4 pt-4">
                      <label className="block text-[10px] text-muted font-bold uppercase tracking-widest">Right-side Tags (e.g. Trainee, Lead)</label>
                      <div className="flex flex-wrap gap-2">
                        {(col.tags || []).map((tag: any, tagIdx: number) => {
                          const label = typeof tag === 'string' ? tag : tag.label;
                          const color = typeof tag === 'string' ? null : tag.color;
                          const autoApply = typeof tag === 'string' ? null : tag.auto_apply;

                          const linkedDataset = datasets.find(d => d.id === col.dataset_id);
                          const linkedDb = recordDatabases.find(db => db.id === linkedDataset?.record_database_id);
                          const dbStructure = linkedDb?.database_structure || [];
                          
                          return (
                            <div key={tagIdx} className="flex flex-col gap-2 bg-bg p-2 rounded border border-border group/tag">
                              <div className="flex items-center gap-1.5">
                                <input 
                                    value={label}
                                    onChange={(e) => {
                                    const newTags = [...(col.tags || [])];
                                    if (typeof tag === 'string') {
                                        newTags[tagIdx] = e.target.value;
                                    } else {
                                        newTags[tagIdx] = { ...tag, label: e.target.value };
                                    }
                                    updateColumn(index, 'tags', newTags);
                                    }}
                                    className="bg-transparent text-xs w-16 outline-none text-text"
                                    placeholder="Label"
                                />
                                <div className="relative flex items-center">
                                    <input 
                                        type="color" 
                                        value={color || '#ffffff'} 
                                        onChange={(e) => {
                                            const newTags = [...(col.tags || [])];
                                            const newLabel = typeof tag === 'string' ? tag : tag.label;
                                            const existingAutoApply = typeof tag === 'string' ? null : tag.auto_apply;
                                            newTags[tagIdx] = { label: newLabel, color: e.target.value, auto_apply: existingAutoApply };
                                            updateColumn(index, 'tags', newTags);
                                        }}
                                        className={`w-4 h-4 rounded-sm cursor-pointer p-0 bg-transparent border-none ${!color ? 'opacity-20' : ''}`} 
                                    />
                                    {color && (
                                        <button 
                                            onClick={() => {
                                                const newTags = [...(col.tags || [])];
                                                if (autoApply) {
                                                    newTags[tagIdx] = { label: label, color: null, auto_apply: autoApply };
                                                } else {
                                                    newTags[tagIdx] = label;
                                                }
                                                updateColumn(index, 'tags', newTags);
                                            }}
                                            className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                                        >
                                            <X size={6} />
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => {
                                    const newTags = [...(col.tags || [])];
                                    newTags.splice(tagIdx, 1);
                                    updateColumn(index, 'tags', newTags);
                                }} className="text-muted hover:text-danger ml-auto"><X size={12} /></button>
                              </div>

                              {linkedDb && (
                                  <div className="pt-1.5 border-t border-border/30 flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => {
                                                const newTags = [...(col.tags || [])];
                                                const newLabel = typeof tag === 'string' ? tag : tag.label;
                                                const newColor = typeof tag === 'string' ? null : tag.color;
                                                
                                                if (autoApply) {
                                                    if (!newColor) newTags[tagIdx] = newLabel;
                                                    else newTags[tagIdx] = { label: newLabel, color: newColor };
                                                } else {
                                                    newTags[tagIdx] = { 
                                                        label: newLabel, 
                                                        color: newColor, 
                                                        auto_apply: { db_column: dbStructure[0]?.id || '', match_value: '' } 
                                                    };
                                                }
                                                updateColumn(index, 'tags', newTags);
                                            }}
                                            className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border transition-colors ${autoApply ? 'bg-accent border-accent text-white' : 'border-border text-muted hover:border-accent'}`}
                                          >
                                              Auto-Apply
                                          </button>
                                      </div>
                                      
                                      {autoApply && (
                                          <div className="flex flex-col gap-1">
                                              <select 
                                                value={autoApply.db_column}
                                                onChange={(e) => {
                                                    const newTags = [...(col.tags || [])];
                                                    newTags[tagIdx] = { ...tag, auto_apply: { ...autoApply, db_column: e.target.value } };
                                                    updateColumn(index, 'tags', newTags);
                                                }}
                                                className="w-full bg-surface border border-border p-1 rounded text-[8px] font-bold text-text focus:border-accent outline-none"
                                              >
                                                  {dbStructure.map((f: any) => (
                                                      <option key={f.id} value={f.id}>{f.name}</option>
                                                  ))}
                                                  <option value="id">Record ID</option>
                                              </select>
                                              <input 
                                                value={autoApply.match_value}
                                                onChange={(e) => {
                                                    const newTags = [...(col.tags || [])];
                                                    newTags[tagIdx] = { ...tag, auto_apply: { ...autoApply, match_value: e.target.value } };
                                                    updateColumn(index, 'tags', newTags);
                                                }}
                                                placeholder="Match Value..."
                                                className="w-full bg-surface border border-border p-1 rounded text-[8px] font-bold text-text focus:border-accent outline-none"
                                              />
                                          </div>
                                      )}
                                  </div>
                              )}
                            </div>
                          );
                        })}
                        <button 
                          onClick={() => {
                            const newTags = [...(col.tags || []), { label: 'Trainee', color: '#ffaa00' }];
                            updateColumn(index, 'tags', newTags);
                          }}
                          className="flex items-center gap-1 bg-bg px-2 py-1 rounded border border-border border-dashed text-muted hover:text-text hover:border-accent text-xs h-fit"
                        >
                          <Plus size={12} /> Add Tag
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border mt-4 pt-4">
                      <label className="block text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                        <Flag size={10} className="text-accent" /> Enabled Flags
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {flags.map(f => {
                          const isEnabled = (col.flags || []).includes(f.id);
                          return (
                            <button 
                              key={f.id}
                              onClick={() => {
                                const newFlags = isEnabled 
                                  ? (col.flags || []).filter((id: number) => id !== f.id)
                                  : [...(col.flags || []), f.id];
                                updateColumn(index, 'flags', newFlags);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${isEnabled ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-muted hover:border-accent/30'}`}
                            >
                                <div className={`w-3 h-3 rounded flex items-center justify-center border ${isEnabled ? 'bg-accent border-accent text-white' : 'bg-card border-border'}`}>
                                    {isEnabled && <Check size={8} />}
                                </div>
                                {f.name}
                            </button>
                          );
                        })}
                        {flags.length === 0 && (
                          <div className="col-span-2 py-2 text-center text-[8px] font-bold uppercase text-muted/50 border border-dashed border-border rounded-lg">No flags defined in Flag Manager</div>
                        )}
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
