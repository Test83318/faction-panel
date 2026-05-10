import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Save, Calculator, Settings2, Info, GripVertical, Check, Target, Hash, Filter, PlusCircle, Sigma } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import toast from 'react-hot-toast';

interface CountManagerModalProps {
    target: any; // Roster or Section
    type: 'roster' | 'section';
    shortname: string;
    onClose: () => void;
    onSave: () => void;
    columns: any[];
    flags: any[];
}

export const CountManagerModal: React.FC<CountManagerModalProps> = ({ 
    target, 
    type, 
    shortname, 
    onClose, 
    onSave,
    columns,
    flags
}) => {
    const [counts, setCounts] = useState<any[]>(target.counts || []);
    const [isSaving, setIsSaving] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    const maxColumns = type === 'roster' ? 3 : 1;
    const maxCountsPerColumn = type === 'roster' ? 2 : 1;

    const handleSave = async () => {
        setIsSaving(true);
        const loadToast = toast.loading('Saving count configuration...');
        try {
            if (type === 'roster') {
                await api.put(`/rosters/${target.id}`, { counts });
            } else {
                await api.put(`/sections/${target.id}`, { counts });
            }
            toast.success('Counts updated', { id: loadToast });
            onSave();
        } catch (err) {
            toast.error('Failed to save counts', { id: loadToast });
        } finally {
            setIsSaving(false);
        }
    };

    const addCount = () => {
        const currentCols = new Set(counts.map(c => c.column_idx || 0));
        if (currentCols.size >= maxColumns && !currentCols.has(0)) {
            toast.error(`Max ${maxColumns} columns allowed`);
            return;
        }

        const newCount = {
            id: `count_${Date.now()}`,
            name: 'New Count',
            type: 'rows', // rows, flags, checkboxes, sum
            column_idx: 0,
            color: '#3b82f6',
            settings: {
                target_col: '',
                disregard_empty: true,
                match_type: 'exists', // exists, contains, equals
                match_value: '',
                flag_id: null,
                checkbox_label: '',
                sum_ids: []
            }
        };
        setCounts([...counts, newCount]);
        setEditingIdx(counts.length);
    };

    const updateCount = (idx: number, fields: any) => {
        const newCounts = [...counts];
        newCounts[idx] = { ...newCounts[idx], ...fields };
        setCounts(newCounts);
    };

    const removeCount = (idx: number) => {
        setCounts(counts.filter((_, i) => i !== idx));
        if (editingIdx === idx) setEditingIdx(null);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
            <div className="bg-card w-full max-w-4xl h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-border bg-surface/30 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                            <Calculator className="text-accent" size={24} />
                            Manage {type === 'roster' ? 'Roster' : 'Section'} Counts
                        </h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                            Setup dynamic personnel counters and statistics
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <X size={20} className="text-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-surface/5 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-widest text-text">Counter Configurations</h3>
                            <p className="text-[9px] text-muted font-bold uppercase">
                                {type === 'roster' 
                                    ? 'Roster counts take into account all root sections.' 
                                    : 'Section counts are limited to this section only.'}
                            </p>
                        </div>
                        <button 
                            onClick={addCount}
                            className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 border border-accent/20"
                        >
                            <Plus size={14} /> Add Counter
                        </button>
                    </div>

                    <div className="space-y-3">
                        {counts.map((count, idx) => (
                            <div key={count.id} className={`bg-card border rounded-xl transition-all ${editingIdx === idx ? 'border-accent ring-1 ring-accent/20 shadow-lg' : 'border-border'}`}>
                                <div className="p-4 flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: count.color }} />
                                            <input 
                                                value={count.name}
                                                onChange={(e) => updateCount(idx, { name: e.target.value })}
                                                className="bg-transparent border-none p-0 font-black text-sm text-text focus:ring-0 uppercase tracking-tight italic"
                                                placeholder="Counter Name"
                                            />
                                            <div className="px-2 py-0.5 bg-surface border border-border rounded text-[8px] font-black uppercase text-muted tracking-widest">
                                                {count.type}
                                            </div>
                                            {type === 'roster' && (
                                                <div className="px-2 py-0.5 bg-accent/5 text-accent border border-accent/10 rounded text-[8px] font-black uppercase tracking-widest">
                                                    Col {count.column_idx + 1}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                            className={`p-2 rounded-lg transition-colors ${editingIdx === idx ? 'bg-accent text-white' : 'text-muted hover:bg-surface'}`}
                                        >
                                            <Settings2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => removeCount(idx)}
                                            className="p-2 text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {editingIdx === idx && (
                                    <div className="px-6 pb-6 border-t border-border/50 pt-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                                                        <Target size={12} /> Calculation Type
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { id: 'rows', label: 'Row Count', icon: Hash },
                                                            { id: 'flags', label: 'Flag Count', icon: Filter },
                                                            { id: 'checkboxes', label: 'Checkbox', icon: Check },
                                                            { id: 'sum', label: 'Summation', icon: Sigma }
                                                        ].map(t => (
                                                            <button 
                                                                key={t.id}
                                                                onClick={() => updateCount(idx, { type: t.id })}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${count.type === t.id ? 'bg-accent border-accent text-white shadow-md shadow-accent/20' : 'bg-surface border-border text-muted hover:border-accent/30'}`}
                                                            >
                                                                <t.icon size={12} /> {t.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-accent mb-2">Display Color</label>
                                                    <div className="flex gap-3">
                                                        <input 
                                                            type="color"
                                                            value={count.color}
                                                            onChange={e => updateCount(idx, { color: e.target.value })}
                                                            className="h-10 w-14 bg-surface border border-border rounded-lg p-1 cursor-pointer"
                                                        />
                                                        <input 
                                                            value={count.color}
                                                            onChange={e => updateCount(idx, { color: e.target.value })}
                                                            className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text outline-none focus:border-accent font-mono uppercase"
                                                        />
                                                    </div>
                                                </div>

                                                {type === 'roster' && (
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-widest text-accent mb-2">Display Column (1-3)</label>
                                                        <div className="flex gap-2">
                                                            {[0, 1, 2].map(num => (
                                                                <button 
                                                                    key={num}
                                                                    onClick={() => updateCount(idx, { column_idx: num })}
                                                                    className={`flex-1 py-2 rounded-lg border font-black text-xs transition-all ${count.column_idx === num ? 'bg-accent border-accent text-white shadow-md' : 'bg-surface border-border text-muted'}`}
                                                                >
                                                                    {num + 1}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4 bg-surface/30 p-5 rounded-2xl border border-border/50">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted border-b border-border/50 pb-2 mb-4">Calculation Settings</h4>
                                                
                                                {count.type === 'rows' && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Target Column</label>
                                                            <select 
                                                                value={count.settings.target_col}
                                                                onChange={e => updateCount(idx, { settings: { ...count.settings, target_col: e.target.value } })}
                                                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                            >
                                                                <option value="">Any Column (Total Rows)</option>
                                                                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-muted uppercase">Disregard Empty Rows</span>
                                                            <button 
                                                                onClick={() => updateCount(idx, { settings: { ...count.settings, disregard_empty: !count.settings.disregard_empty } })}
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${count.settings.disregard_empty ? 'bg-accent' : 'bg-muted/30'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${count.settings.disregard_empty ? 'right-0.5' : 'left-0.5'}`} />
                                                            </button>
                                                        </div>
                                                        {count.settings.target_col && (
                                                            <div className="space-y-4 pt-2 border-t border-border/50">
                                                                <div>
                                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Match Type</label>
                                                                    <select 
                                                                        value={count.settings.match_type}
                                                                        onChange={e => updateCount(idx, { settings: { ...count.settings, match_type: e.target.value } })}
                                                                        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                                    >
                                                                        <option value="exists">Value Exists</option>
                                                                        <option value="equals">Exact Match</option>
                                                                        <option value="contains">Contains Text</option>
                                                                    </select>
                                                                </div>
                                                                {count.settings.match_type !== 'exists' && (
                                                                    <div>
                                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Match Value</label>
                                                                        <input 
                                                                            value={count.settings.match_value}
                                                                            onChange={e => updateCount(idx, { settings: { ...count.settings, match_value: e.target.value } })}
                                                                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                                            placeholder="e.g. Command"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {count.type === 'flags' && (
                                                    <div>
                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Target Flag</label>
                                                        <select 
                                                            value={count.settings.flag_id || ''}
                                                            onChange={e => updateCount(idx, { settings: { ...count.settings, flag_id: parseInt(e.target.value) } })}
                                                            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                        >
                                                            <option value="">Select Flag...</option>
                                                            {flags.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                {count.type === 'checkboxes' && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Column</label>
                                                            <select 
                                                                value={count.settings.target_col}
                                                                onChange={e => updateCount(idx, { settings: { ...count.settings, target_col: e.target.value } })}
                                                                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                            >
                                                                <option value="">Select Column...</option>
                                                                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        {count.settings.target_col && (
                                                            <div>
                                                                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Checkbox/Tag Label</label>
                                                                <select 
                                                                    value={count.settings.checkbox_label}
                                                                    onChange={e => updateCount(idx, { settings: { ...count.settings, checkbox_label: e.target.value } })}
                                                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs"
                                                                >
                                                                    <option value="">Select Label...</option>
                                                                    {(() => {
                                                                        const col = columns.find(c => c.id === count.settings.target_col);
                                                                        const labels = [
                                                                            ...(col?.checkboxes || []).map((cb: any) => typeof cb === 'string' ? cb : cb.label),
                                                                            ...(col?.tags || []).map((t: any) => typeof t === 'string' ? t : t.label)
                                                                        ];
                                                                        return Array.from(new Set(labels)).map(l => <option key={l} value={l}>{l}</option>);
                                                                    })()}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {count.type === 'sum' && (
                                                    <div>
                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-2">Sum Up Counters</label>
                                                        <div className="space-y-2">
                                                            {counts.filter((c, i) => i !== idx && c.type !== 'sum').map(c => (
                                                                <button 
                                                                    key={c.id}
                                                                    onClick={() => {
                                                                        const current = count.settings.sum_ids || [];
                                                                        const next = current.includes(c.id) ? current.filter((id: string) => id !== c.id) : [...current, c.id];
                                                                        updateCount(idx, { settings: { ...count.settings, sum_ids: next } });
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-2 rounded border text-[9px] font-bold uppercase transition-all ${count.settings.sum_ids?.includes(c.id) ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted'}`}
                                                                >
                                                                    <span>{c.name}</span>
                                                                    {count.settings.sum_ids?.includes(c.id) && <Check size={10} />}
                                                                </button>
                                                            ))}
                                                            {counts.filter(c => c.type !== 'sum').length <= 1 && (
                                                                <p className="text-[8px] text-muted italic">Create at least two other counters to use summation.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {counts.length === 0 && (
                            <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center space-y-2 bg-card/30">
                                <Info size={32} className="text-muted opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted">No counters configured</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-surface/30 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-surface hover:bg-bg border border-border text-text rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};
