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
    allSections?: any[];
}

export const CountManagerModal: React.FC<CountManagerModalProps> = ({ 
    target, 
    type, 
    shortname, 
    onClose, 
    onSave,
    columns,
    flags,
    allSections = []
}) => {
    const [counts, setCounts] = useState<any[]>(() => {
        const existing = target.counts || [];
        // Migrate legacy counts if needed
        return existing.map((c: any) => {
            if (!c.conditions) {
                return {
                    ...c,
                    conditions: [{
                        id: `cond_${Date.now()}_0`,
                        operator: '+',
                        type: c.type || 'rows',
                        scope: type === 'roster' ? 'roster' : 'section',
                        settings: c.settings || {}
                    }]
                };
            }
            return c;
        });
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    const maxColumns = type === 'roster' ? 3 : 1;

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
        const newCount = {
            id: `count_${Date.now()}`,
            name: 'New Count',
            variable_name: `count_${counts.length + 1}`,
            tag: '',
            secondary_count_id: null,
            column_idx: 0,
            color: '#3b82f6',
            conditions: [
                {
                    id: `cond_${Date.now()}_0`,
                    operator: '+',
                    type: 'rows',
                    scope: type === 'roster' ? 'roster' : 'section',
                    settings: {
                        target_col: '',
                        disregard_empty: true,
                        match_type: 'exists',
                        match_value: ''
                    }
                }
            ]
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

    const addCondition = (countIdx: number) => {
        const newCounts = [...counts];
        const count = newCounts[countIdx];
        count.conditions = [
            ...count.conditions,
            {
                id: `cond_${Date.now()}_${count.conditions.length}`,
                operator: 'AND',
                type: 'rows',
                scope: type === 'roster' ? 'roster' : 'section',
                settings: {
                    target_col: '',
                    disregard_empty: true,
                    match_type: 'exists',
                    match_value: ''
                }
            }
        ];
        setCounts(newCounts);
    };

    const updateCondition = (countIdx: number, condIdx: number, fields: any) => {
        const newCounts = [...counts];
        const count = newCounts[countIdx];
        count.conditions[condIdx] = { ...count.conditions[condIdx], ...fields };
        setCounts(newCounts);
    };

    const removeCondition = (countIdx: number, condIdx: number) => {
        const newCounts = [...counts];
        newCounts[countIdx].conditions = newCounts[countIdx].conditions.filter((_: any, i: number) => i !== condIdx);
        if (newCounts[countIdx].conditions.length === 0) {
            removeCount(countIdx);
        } else {
            setCounts(newCounts);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
            <div className="bg-card w-full max-w-5xl h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-border bg-surface/30 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                            <Calculator className="text-accent" size={24} />
                            Manage {type === 'roster' ? 'Roster' : 'Section'} Counts
                        </h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                            Setup dynamic personnel counters with complex formula logic
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
                            <p className="text-[9px] text-muted font-bold uppercase leading-relaxed">
                                {type === 'roster' 
                                    ? 'Roster counts can reference any section in the roster.' 
                                    : 'Section counts default to this section but can reference others.'}
                            </p>
                        </div>
                        <button 
                            onClick={addCount}
                            className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 border border-accent/20 shadow-sm"
                        >
                            <PlusCircle size={14} /> Add Counter
                        </button>
                    </div>

                    <div className="space-y-4">
                        {counts.map((count, idx) => (
                            <div key={count.id} className={`bg-card border rounded-2xl transition-all ${editingIdx === idx ? 'border-accent ring-1 ring-accent/20 shadow-xl' : 'border-border'}`}>
                                <div className="p-5 flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: count.color }} />
                                            <input 
                                                value={count.name}
                                                onChange={(e) => updateCount(idx, { name: e.target.value })}
                                                className="bg-transparent border-none p-0 font-black text-lg text-text focus:ring-0 uppercase tracking-tighter italic"
                                                placeholder="Counter Name"
                                            />
                                            <div className="flex items-center gap-1.5 ml-2">
                                                <div className="px-2 py-0.5 bg-surface border border-border rounded text-[8px] font-black uppercase text-muted tracking-widest">
                                                    {count.conditions?.length || 0} Conditions
                                                </div>
                                                {type === 'roster' && (
                                                    <div className="px-2 py-0.5 bg-accent/5 text-accent border border-accent/10 rounded text-[8px] font-black uppercase tracking-widest">
                                                        Col {count.column_idx + 1}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                            className={`p-2 rounded-xl transition-all ${editingIdx === idx ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:bg-surface border border-transparent hover:border-border'}`}
                                        >
                                            <Settings2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => removeCount(idx)}
                                            className="p-2 text-muted hover:text-danger hover:bg-danger/5 rounded-xl transition-all border border-transparent hover:border-danger/10"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {editingIdx === idx && (
                                    <div className="px-6 pb-8 border-t border-border/50 pt-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-12 gap-8">
                                            <div className="col-span-3 space-y-6">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-accent mb-3 flex items-center gap-2">
                                                        Display Style
                                                    </label>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Variable Name</label>
                                                            <input 
                                                                value={count.variable_name}
                                                                onChange={e => updateCount(idx, { variable_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                                                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-[10px] text-accent outline-none focus:border-accent font-mono"
                                                                placeholder="e.g. total_members"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Secondary Counter (Dual Mode)</label>
                                                            <select 
                                                                value={count.secondary_count_id || ''}
                                                                onChange={e => updateCount(idx, { secondary_count_id: e.target.value || null })}
                                                                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase"
                                                            >
                                                                <option value="">None (Single Count)</option>
                                                                {counts.filter(c => c.id !== count.id).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Primary Color</label>
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="color"
                                                                    value={count.color}
                                                                    onChange={e => updateCount(idx, { color: e.target.value })}
                                                                    className="h-9 w-12 bg-surface border border-border rounded-lg p-1 cursor-pointer"
                                                                />
                                                                <input 
                                                                    value={count.color}
                                                                    onChange={e => updateCount(idx, { color: e.target.value })}
                                                                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-[10px] text-text outline-none focus:border-accent font-mono uppercase"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between px-1 pt-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-muted uppercase tracking-widest">Hide from Display</span>
                                                                <span className="text-[7px] text-muted/50 font-bold uppercase">Variable will still be available</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => updateCount(idx, { is_hidden: !count.is_hidden })}
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${count.is_hidden ? 'bg-accent' : 'bg-muted/30'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${count.is_hidden ? 'right-0.5' : 'left-0.5'}`} />
                                                            </button>
                                                        </div>

                                                        {type === 'roster' && (
                                                            <div>
                                                                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Column Position</label>
                                                                <div className="flex gap-1">
                                                                    {[0, 1, 2].map(num => (
                                                                        <button 
                                                                            key={num}
                                                                            onClick={() => updateCount(idx, { column_idx: num })}
                                                                            className={`flex-1 py-1.5 rounded-lg border font-black text-[10px] transition-all ${count.column_idx === num ? 'bg-accent border-accent text-white shadow-sm' : 'bg-surface border-border text-muted hover:border-accent/30'}`}
                                                                        >
                                                                            {num + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-9 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                                                        <Sigma size={12} /> Calculation Formula
                                                    </label>
                                                    <button 
                                                        onClick={() => addCondition(idx)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-accent/20"
                                                    >
                                                        <Plus size={12} /> Add Condition
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {count.conditions.map((cond: any, cIdx: number) => (
                                                        <div key={cond.id} className="relative group/cond">
                                                            {cIdx > 0 && (
                                                                <div className="absolute -top-3 left-10 flex items-center gap-1 z-10">
                                                                    <div className="flex bg-card border border-border rounded-full p-0.5 shadow-sm">
                                                                        {['AND', 'OR', '+', '-'].map(op => (
                                                                            <button 
                                                                                key={op}
                                                                                onClick={() => updateCondition(idx, cIdx, { operator: op })}
                                                                                className={`px-2 py-0.5 rounded-full text-[8px] font-black transition-all ${cond.operator === op ? 'bg-accent text-white' : 'hover:bg-surface text-muted'}`}
                                                                            >
                                                                                {op}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <div className={`bg-surface/30 border border-border/50 rounded-xl p-4 flex flex-col gap-4 ${cIdx > 0 ? 'mt-4' : ''}`}>
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex flex-col gap-4 flex-1">
                                                                        <div className="grid grid-cols-3 gap-4">
                                                                            <div>
                                                                                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Scope</label>
                                                                                <select 
                                                                                    value={cond.scope || (type === 'roster' ? 'roster' : 'section')}
                                                                                    onChange={e => updateCondition(idx, cIdx, { scope: e.target.value })}
                                                                                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase"
                                                                                >
                                                                                    <option value="roster">Entire Roster</option>
                                                                                    <option value="section">Current Section (Incl. Children)</option>
                                                                                    <option value="specific_sections">Specific Sections</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Type</label>
                                                                                <select 
                                                                                    value={cond.type}
                                                                                    onChange={e => updateCondition(idx, cIdx, { type: e.target.value, settings: { ...cond.settings, checkbox_label: '' } })}
                                                                                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase"
                                                                                >
                                                                                    <option value="rows">Column Value</option>
                                                                                    <option value="flags">Flag Status</option>
                                                                                    <option value="checkboxes">Checkboxes</option>
                                                                                    <option value="tags">Right-side Tags</option>
                                                                                </select>
                                                                            </div>
                                                                            {cond.scope === 'specific_sections' && (
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Target Sections</label>
                                                                                    <div className="relative group/sections">
                                                                                        <div className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase truncate min-h-[28px]">
                                                                                            {(cond.section_ids || []).length > 0 
                                                                                                ? `${(cond.section_ids || []).length} Selected` 
                                                                                                : 'Select Sections...'}
                                                                                        </div>
                                                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-[50] p-2 hidden group-hover/sections:block max-h-48 overflow-y-auto">
                                                                                            {allSections.map(s => (
                                                                                                <button 
                                                                                                    key={s.id}
                                                                                                    onClick={() => {
                                                                                                        const current = cond.section_ids || [];
                                                                                                        const next = current.includes(s.id) ? current.filter((id: number) => id !== s.id) : [...current, s.id];
                                                                                                        updateCondition(idx, cIdx, { section_ids: next });
                                                                                                    }}
                                                                                                    className={`w-full text-left px-2 py-1.5 rounded text-[9px] font-bold uppercase flex items-center justify-between transition-colors ${cond.section_ids?.includes(s.id) ? 'bg-accent/10 text-accent' : 'hover:bg-surface text-muted'}`}
                                                                                                >
                                                                                                    {s.name}
                                                                                                    {cond.section_ids?.includes(s.id) && <Check size={10} />}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-6 pt-2 border-t border-border/20">
                                                                            {cond.type === 'rows' && (
                                                                                <>
                                                                                    <div className="space-y-3">
                                                                                        <div>
                                                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Column</label>
                                                                                            <select 
                                                                                                value={cond.settings.target_col}
                                                                                                onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, target_col: e.target.value } })}
                                                                                                className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px]"
                                                                                            >
                                                                                                <option value="">Any Column (Total Rows)</option>
                                                                                                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="flex items-center justify-between px-1">
                                                                                            <span className="text-[9px] font-bold text-muted uppercase">Ignore Empty</span>
                                                                                            <button 
                                                                                                onClick={() => updateCondition(idx, cIdx, { settings: { ...cond.settings, disregard_empty: !cond.settings.disregard_empty } })}
                                                                                                className={`w-7 h-3.5 rounded-full relative transition-colors ${cond.settings.disregard_empty ? 'bg-accent' : 'bg-muted/30'}`}
                                                                                            >
                                                                                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${cond.settings.disregard_empty ? 'right-0.5' : 'left-0.5'}`} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {cond.settings.target_col && (
                                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                            <div>
                                                                                                <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Match Type</label>
                                                                                                <select 
                                                                                                    value={cond.settings.match_type}
                                                                                                    onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, match_type: e.target.value } })}
                                                                                                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px]"
                                                                                                >
                                                                                                    <option value="exists">Exists</option>
                                                                                                    <option value="equals">=</option>
                                                                                                    <option value="not_equals">!=</option>
                                                                                                    <option value="contains">Contains</option>
                                                                                                    <option value="is_null">Is Empty</option>
                                                                                                </select>
                                                                                            </div>
                                                                                            {['equals', 'not_equals', 'contains'].includes(cond.settings.match_type) && (
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Value</label>
                                                                                                    <input 
                                                                                                        value={cond.settings.match_value}
                                                                                                        onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, match_value: e.target.value } })}
                                                                                                        className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none focus:border-accent"
                                                                                                        placeholder="..."
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}

                                                                            {cond.type === 'flags' && (
                                                                                <div className="col-span-2">
                                                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Target Flag</label>
                                                                                    <select 
                                                                                        value={cond.settings.flag_id || ''}
                                                                                        onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, flag_id: parseInt(e.target.value) } })}
                                                                                        className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px]"
                                                                                    >
                                                                                        <option value="">Select Flag...</option>
                                                                                        {flags.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                                    </select>
                                                                                </div>
                                                                            )}

                                                                            {(cond.type === 'checkboxes' || cond.type === 'tags') && (
                                                                                <>
                                                                                    <div>
                                                                                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">Column</label>
                                                                                        <select 
                                                                                            value={cond.settings.target_col}
                                                                                            onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, target_col: e.target.value } })}
                                                                                            className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px]"
                                                                                        >
                                                                                            <option value="">Select Column...</option>
                                                                                            {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                    {cond.settings.target_col && (
                                                                                        <div>
                                                                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted mb-1.5">{cond.type === 'checkboxes' ? 'Checkbox' : 'Tag'} Label</label>
                                                                                            <select 
                                                                                                value={cond.settings.checkbox_label}
                                                                                                onChange={e => updateCondition(idx, cIdx, { settings: { ...cond.settings, checkbox_label: e.target.value } })}
                                                                                                className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[10px]"
                                                                                            >
                                                                                                <option value="">Select Label...</option>
                                                                                                {(() => {
                                                                                                    const col = columns.find(c => c.id === cond.settings.target_col);
                                                                                                    const labels = cond.type === 'checkboxes' 
                                                                                                        ? (col?.checkboxes || []).map((cb: any) => typeof cb === 'string' ? cb : cb.label)
                                                                                                        : (col?.tags || []).map((t: any) => typeof t === 'string' ? t : t.label);
                                                                                                    return Array.from(new Set(labels)).map(l => <option key={String(l)} value={String(l)}>{String(l)}</option>);
                                                                                                })()}
                                                                                            </select>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => removeCondition(idx, cIdx)}
                                                                        className="p-1.5 text-muted hover:text-danger rounded-lg transition-colors opacity-0 group-hover/cond:opacity-100"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {counts.length === 0 && (
                            <div className="py-20 border border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-card/30">
                                <Calculator size={48} className="text-muted opacity-10" />
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black uppercase tracking-widest text-muted opacity-50">No counters configured</p>
                                    <p className="text-[9px] font-bold text-muted/30 uppercase max-w-xs leading-relaxed">
                                        Click "Add Counter" above to create dynamic personnel statistics for your roster.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-surface/30 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 bg-surface hover:bg-bg border border-border text-text rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:shadow-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
                    >
                        <Save size={14} />
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};
