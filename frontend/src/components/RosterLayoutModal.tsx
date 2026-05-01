import React, { useState, useEffect } from 'react';
import { X, Layout, GripVertical, Plus, Trash2, Columns, Settings, Save, ListTree } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import toast from 'react-hot-toast';

interface RosterLayoutModalProps {
    roster: any;
    onClose: () => void;
    onSave: () => void;
}

interface RosterRow {
    id: string;
    columns: number;
    section_ids: number[];
}

const RosterLayoutModal: React.FC<RosterLayoutModalProps> = ({ roster, onClose, onSave }) => {
    const allSections = roster.root_sections?.filter((s: any) => s.type !== 'master') || [];
    
    const [rows, setRows] = useState<RosterRow[]>(roster.layout_settings?.rows || []);
    const [unassignedSections, setUnassignedSections] = useState<any[]>([]);
    const [defaultPerRow, setDefaultPerRow] = useState(roster.default_sections_per_row || 2);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const assignedIds = (roster.layout_settings?.rows || []).flatMap((r: any) => r.section_ids);
        setUnassignedSections(allSections.filter(s => !assignedIds.includes(s.id)));
    }, []);

    const handleAddRow = () => {
        const newRow: RosterRow = {
            id: `row_${Date.now()}`,
            columns: 2,
            section_ids: []
        };
        setRows([...rows, newRow]);
    };

    const handleRemoveRow = (id: string) => {
        const row = rows.find(r => r.id === id);
        if (row) {
            const sectionsToReturn = allSections.filter(s => row.section_ids.includes(s.id));
            setUnassignedSections([...unassignedSections, ...sectionsToReturn]);
        }
        setRows(rows.filter(r => r.id !== id));
    };

    const handleUpdateRowColumns = (id: string, cols: number) => {
        setRows(rows.map(r => r.id === id ? { ...r, columns: cols } : r));
    };

    const handleReorderRows = (newOrder: RosterRow[]) => {
        setRows(newOrder);
    };

    const handleMoveToRow = (sectionId: number, rowId: string | null) => {
        const section = allSections.find(s => s.id === sectionId);
        if (!section) return;

        // Remove from all existing rows and unassigned pool
        let updatedRows = rows.map(r => ({
            ...r,
            section_ids: r.section_ids.filter(id => id !== sectionId)
        }));
        let updatedUnassigned = unassignedSections.filter(s => s.id !== sectionId);

        // Add to new row or back to unassigned pool
        if (rowId) {
            updatedRows = updatedRows.map(r => r.id === rowId ? {
                ...r,
                section_ids: [...r.section_ids, sectionId]
            } : r);
        } else {
            updatedUnassigned = [...updatedUnassigned, section];
        }

        setRows(updatedRows);
        setUnassignedSections(updatedUnassigned);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const loadToast = toast.loading('Saving layout...');

        const fullOrder = [
            ...rows.flatMap(r => r.section_ids),
            ...unassignedSections.map(s => s.id)
        ];

        try {
            await api.put(`/rosters/${roster.id}`, {
                default_sections_per_row: defaultPerRow,
                layout_settings: {
                    rows: rows.filter(r => r.section_ids.length > 0)
                },
                section_order: fullOrder
            });
            toast.success('Layout saved', { id: loadToast });
            onSave();
        } catch (err) {
            toast.error('Failed to save layout', { id: loadToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
            <div className="bg-card rounded-2xl max-w-4xl w-full border border-border shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface/30">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Layout className="text-accent" />
                            Manage Roster Rows & Layout
                        </h2>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1 text-center sm:text-left">Define specific row structures or use the global default</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-8">
                    {/* Global Defaults */}
                    <div className="bg-surface/30 border border-border rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-accent">
                                <Settings size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Global Default Layout</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(num => (
                                    <button 
                                        key={num}
                                        onClick={() => setDefaultPerRow(num)}
                                        className={`px-3 py-1.5 rounded-lg border font-black text-[10px] transition-all ${defaultPerRow === num ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-card border-border text-muted hover:border-accent/30'}`}
                                    >
                                        {num} COL
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-[9px] text-muted italic opacity-60">Any sections not assigned to a custom row below will automatically fill into rows of {defaultPerRow}.</p>
                    </div>

                    {/* Custom Rows */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-accent">
                                <ListTree size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Custom Row Definitions</span>
                            </div>
                            <button 
                                onClick={handleAddRow}
                                className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Plus size={14} /> Add Custom Row
                            </button>
                        </div>

                        <Reorder.Group axis="y" values={rows} onReorder={handleReorderRows} className="space-y-4">
                            {rows.map((row) => (
                                <Reorder.Item 
                                    key={row.id} 
                                    value={row}
                                    className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4 group hover:border-accent/20 transition-all"
                                >
                                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="cursor-grab active:cursor-grabbing text-muted hover:text-accent">
                                                <GripVertical size={16} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-text">Row Layout</span>
                                            <div className="flex gap-1 ml-4">
                                                {[1, 2, 3, 4].map(num => (
                                                    <button 
                                                        key={num}
                                                        onClick={() => handleUpdateRowColumns(row.id, num)}
                                                        className={`px-2 py-0.5 rounded border text-[9px] font-black transition-all ${row.columns === num ? 'bg-accent/20 border-accent text-accent' : 'bg-card border-border text-muted opacity-40 hover:opacity-100'}`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="text-muted hover:text-danger p-1.5 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {row.section_ids.map(sId => {
                                            const s = allSections.find(sec => sec.id === sId);
                                            if (!s) return null;
                                            return (
                                                <div key={s.id} className="bg-card border border-border p-2 rounded-lg flex items-center justify-between gap-2 group/item">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color || 'var(--accent)' }} />
                                                        <span className="text-[9px] font-bold uppercase tracking-tight truncate">{s.name}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleMoveToRow(s.id, null)}
                                                        className="text-muted hover:text-danger opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {row.section_ids.length === 0 && (
                                            <div className="col-span-full py-4 text-center border border-dashed border-border rounded-lg bg-bg/20">
                                                <p className="text-[9px] font-black text-muted uppercase tracking-widest opacity-30 italic">Drag sections here or use the dropdown to add</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {unassignedSections.length > 0 && (
                                        <div className="flex justify-end pt-2 border-t border-border/30">
                                            <select 
                                                className="bg-bg border border-border text-[9px] font-bold uppercase p-1 rounded-lg outline-none focus:border-accent"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleMoveToRow(Number(e.target.value), row.id);
                                                        e.target.value = "";
                                                    }
                                                }}
                                            >
                                                <option value="">Add Section to Row...</option>
                                                {unassignedSections.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {rows.length === 0 && (
                            <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-surface/10">
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-30 italic">No custom rows defined yet</p>
                            </div>
                        )}
                    </div>

                    {/* Unassigned Pool */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3 text-muted">
                                <Columns size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Global Pool (Unassigned Sections)</span>
                            </div>
                            <span className="text-[9px] text-muted font-bold uppercase tracking-tighter">Drag to reorder pool</span>
                        </div>
                        
                        <Reorder.Group axis="y" values={unassignedSections} onReorder={setUnassignedSections} className="space-y-2">
                            {unassignedSections.map((s) => (
                                <Reorder.Item 
                                    key={s.id} 
                                    value={s}
                                    className="bg-surface border border-border p-3 rounded-xl flex items-center gap-4 group cursor-grab active:cursor-grabbing hover:border-accent/30 transition-all"
                                >
                                    <div className="text-muted group-hover:text-accent transition-colors">
                                        <GripVertical size={16} />
                                    </div>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color || 'var(--accent)' }} />
                                    <div className="flex-1 overflow-hidden">
                                        <span className="text-[10px] font-black uppercase tracking-tight truncate block">{s.name}</span>
                                    </div>
                                    <select 
                                        className="bg-bg border border-border text-[8px] font-black uppercase p-1 rounded-lg outline-none focus:border-accent opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.value) handleMoveToRow(s.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        value=""
                                    >
                                        <option value="">Move to Row...</option>
                                        {rows.map((r, idx) => (
                                            <option key={r.id} value={r.id}>Row {idx + 1} ({r.columns} Col)</option>
                                        ))}
                                    </select>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {unassignedSections.length === 0 && rows.length > 0 && (
                            <div className="col-span-full py-6 text-center border border-dashed border-border rounded-xl bg-surface/5 opacity-40">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted">All sections assigned to custom rows</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-surface/30 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded-xl font-black text-[10px] uppercase tracking-widest transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={14} /> {isSaving ? 'Saving...' : 'Save Layout'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RosterLayoutModal;
