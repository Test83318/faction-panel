import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Database, GripVertical } from 'lucide-react';
import { Reorder } from 'motion/react';
import api from '../api';
import toast from 'react-hot-toast';

interface DatasetOption {
    id: string | number;
    value: string;
    color: string | null;
    is_bold: boolean;
    order: number;
}

interface Dataset {
    id: number;
    name: string;
    record_database_id: number | null;
    options: DatasetOption[];
}

interface RecordDatabase {
    id: number;
    name: string;
    is_published: boolean;
}

interface GlobalVariablesModalProps {
    shortname: string;
    onClose: () => void;
}

const GlobalVariablesModal: React.FC<GlobalVariablesModalProps> = ({ shortname, onClose }) => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [recordDatabases, setRecordDatabases] = useState<RecordDatabase[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState('');

    const fetchData = async () => {
        try {
            const [datasetsRes, recordsRes] = await Promise.all([
                api.get(`/factions/${shortname}/datasets`),
                api.get(`/factions/${shortname}/records`)
            ]);
            
            const normalizedDatasets = datasetsRes.data.map((d: any) => ({
                ...d,
                options: (d.options || []).map((o: any, idx: number) => ({
                    ...o,
                    id: o.id || `temp_${d.id}_${idx}_${o.value}`
                }))
            }));

            setDatasets(normalizedDatasets);
            setRecordDatabases(recordsRes.data.filter((db: any) => db.is_published));
            
            if (selectedDataset) {
                const updated = normalizedDatasets.find((d: any) => d.id === selectedDataset.id);
                if (updated) setSelectedDataset(updated);
            }
        } catch (err) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [shortname]);

    const handleCreateDataset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDatasetName.trim()) return;

        try {
            const res = await api.post(`/factions/${shortname}/datasets`, { name: newDatasetName });
            const newDs = { ...res.data, options: [] };
            setDatasets([...datasets, newDs]);
            setSelectedDataset(newDs);
            setNewDatasetName('');
            setIsCreating(false);
            toast.success('Dataset created');
        } catch (err) {
            toast.error('Failed to create dataset');
        }
    };

    const handleSaveDataset = async () => {
        if (!selectedDataset) return;
        setIsSaving(true);
        const loadToast = toast.loading('Saving dataset...');
        try {
            // Update order before saving
            const orderedOptions = selectedDataset.options.map((opt, idx) => ({ ...opt, order: idx }));
            await api.put(`/datasets/${selectedDataset.id}`, { ...selectedDataset, options: orderedOptions });
            toast.success('Dataset saved', { id: loadToast });
            fetchData();
        } catch (err) {
            toast.error('Failed to save dataset', { id: loadToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDataset = async (id: number) => {
        const dataset = datasets.find(d => d.id === id);
        if (!dataset) return;

        toast((t) => (
            <div className="flex flex-col gap-1 text-left">
                <p className="font-bold">Delete dataset "{dataset.name}"?</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tighter">This will affect all columns currently bound to this set.</p>
                <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            const loadToast = toast.loading('Deleting dataset...');
                            try {
                                await api.delete(`/datasets/${id}`);
                                setDatasets(datasets.filter(d => d.id !== id));
                                if (selectedDataset?.id === id) setSelectedDataset(null);
                                toast.success('Dataset deleted', { id: loadToast });
                            } catch (err) {
                                toast.error('Failed to delete dataset', { id: loadToast });
                            }
                        }}
                        className="px-2 py-1 bg-danger text-white hover:bg-danger/90 rounded text-[9px] font-bold uppercase transition shadow-lg shadow-danger/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        ), { duration: 6000, position: 'top-center' });
    };

    const addOption = () => {
        if (!selectedDataset) return;
        const newOption: DatasetOption = { 
            id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            value: '', 
            color: null, 
            is_bold: false, 
            order: selectedDataset.options.length 
        };
        setSelectedDataset({
            ...selectedDataset,
            options: [...selectedDataset.options, newOption]
        });
    };

    const updateOption = (id: string | number, field: keyof DatasetOption, value: any) => {
        if (!selectedDataset) return;
        const newOptions = selectedDataset.options.map(opt => 
            opt.id === id ? { ...opt, [field]: value } : opt
        );
        setSelectedDataset({ ...selectedDataset, options: newOptions });
    };

    const removeOption = (id: string | number) => {
        if (!selectedDataset) return;
        const newOptions = selectedDataset.options.filter(opt => opt.id !== id);
        setSelectedDataset({ ...selectedDataset, options: newOptions });
    };

    const handleReorderOptions = (newOptions: DatasetOption[]) => {
        if (!selectedDataset) return;
        setSelectedDataset({ ...selectedDataset, options: newOptions });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
            <div className="bg-card rounded-2xl max-w-4xl w-full border border-border shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-surface/30">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Database className="text-accent" />
                            Global Roster Variables
                        </h2>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Manage reusable datasets for roster columns</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left Panel: List of Datasets */}
                    <div className="w-1/3 border-r border-border flex flex-col bg-surface/10">
                        <div className="p-4 flex justify-between items-center border-b border-border bg-surface/30">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Datasets</span>
                            <button onClick={() => setIsCreating(true)} className="p-1.5 hover:bg-accent hover:text-white rounded transition-all text-muted">
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {isCreating && (
                                <form onSubmit={handleCreateDataset} className="p-2 bg-accent/5 border border-accent/20 rounded-xl mb-2">
                                    <input 
                                        autoFocus
                                        value={newDatasetName}
                                        onChange={e => setNewDatasetName(e.target.value)}
                                        placeholder="Name..."
                                        className="w-full bg-surface border border-border p-2 rounded text-[10px] font-bold uppercase tracking-widest outline-none focus:border-accent"
                                    />
                                    <div className="flex gap-1 mt-2">
                                        <button type="submit" className="flex-1 bg-accent text-white text-[8px] font-bold uppercase py-1 rounded">Create</button>
                                        <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-surface text-muted text-[8px] font-bold uppercase py-1 rounded">Cancel</button>
                                    </div>
                                </form>
                            )}
                            {datasets.map(d => (
                                <div 
                                    key={d.id}
                                    onClick={() => setSelectedDataset(d)}
                                    className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedDataset?.id === d.id ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted hover:border-accent/30'}`}
                                >
                                    <span className="font-bold text-xs uppercase tracking-tight">{d.name}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteDataset(d.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-danger transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {datasets.length === 0 && !loading && (
                                <div className="py-10 text-center text-[10px] text-muted uppercase tracking-widest font-bold opacity-40">No datasets defined</div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Dataset Options */}
                    <div className="flex-1 flex flex-col">
                        {selectedDataset ? (
                            <>
                                <div className="p-4 border-b border-border bg-surface/30 flex justify-between items-center">
                                    <div className="flex flex-col gap-1 flex-1 mr-4">
                                        <input 
                                            value={selectedDataset.name}
                                            onChange={e => setSelectedDataset({ ...selectedDataset, name: e.target.value })}
                                            className="bg-transparent border-none font-black uppercase tracking-tight text-lg outline-none focus:text-accent w-full"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Source:</span>
                                            <select 
                                                value={selectedDataset.record_database_id || ''}
                                                onChange={e => setSelectedDataset({ ...selectedDataset, record_database_id: e.target.value ? parseInt(e.target.value) : null })}
                                                className="bg-surface border border-border rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent outline-none focus:border-accent"
                                            >
                                                <option value="">Manual Options</option>
                                                {recordDatabases.map(db => (
                                                    <option key={db.id} value={db.id}>Database: {db.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!selectedDataset.record_database_id && (
                                            <button 
                                                onClick={addOption}
                                                className="px-3 py-1.5 bg-surface hover:bg-bg border border-border text-[10px] font-black uppercase tracking-widest rounded-lg transition"
                                            >
                                                Add Option
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleSaveDataset}
                                            disabled={isSaving}
                                            className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition shadow-lg shadow-accent/20 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Save size={12} /> {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {selectedDataset.record_database_id ? (
                                        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-accent/20 rounded-2xl bg-accent/5">
                                            <Database size={32} className="text-accent opacity-40 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Linked to Dynamic Database</p>
                                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">Options will be pulled automatically from database entries</p>
                                        </div>
                                    ) : (
                                        <Reorder.Group 
                                            axis="y" 
                                            values={selectedDataset.options} 
                                            onReorder={handleReorderOptions}
                                            className="space-y-2"
                                        >
                                            {selectedDataset.options.map((option) => (
                                                <Reorder.Item 
                                                    key={option.id} 
                                                    value={option}
                                                    className="flex items-center gap-3 p-2 bg-surface border border-border rounded-xl group"
                                                >
                                                    <div className="text-muted cursor-grab active:cursor-grabbing">
                                                        <GripVertical size={14} />
                                                    </div>
                                                    <input 
                                                        value={option.value}
                                                        onChange={e => updateOption(option.id, 'value', e.target.value)}
                                                        placeholder="Option value..."
                                                        className={`flex-1 bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-accent transition ${option.is_bold ? 'font-bold' : ''}`}
                                                        style={{ color: option.color || 'inherit' }}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => updateOption(option.id, 'is_bold', !option.is_bold)}
                                                            className={`w-8 h-8 rounded border transition-all text-[10px] font-black uppercase ${option.is_bold ? 'bg-accent border-accent text-white' : 'bg-card border-border text-muted hover:border-accent/30'}`}
                                                            title="Toggle Bold"
                                                        >
                                                            B
                                                        </button>
                                                        <div className="relative group/color flex items-center">
                                                            <input 
                                                                type="color"
                                                                value={option.color || '#3b82f6'}
                                                                onChange={e => updateOption(option.id, 'color', e.target.value)}
                                                                className={`w-8 h-8 bg-card border border-border rounded p-1 cursor-pointer ${!option.color ? 'opacity-20' : ''}`}
                                                            />
                                                            {option.color && (
                                                                <button 
                                                                    onClick={() => updateOption(option.id, 'color', null)}
                                                                    className="absolute -top-1 -right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover/color:opacity-100 transition-opacity"
                                                                    title="Remove Color"
                                                                >
                                                                    <X size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeOption(option.id)}
                                                        className="p-2 hover:bg-danger/10 text-muted hover:text-danger rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Reorder.Item>
                                            ))}
                                            {selectedDataset.options.length === 0 && (
                                                <div className="py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-surface/30">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-40">No options added yet</p>
                                                </div>
                                            )}
                                        </Reorder.Group>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted uppercase text-[10px] tracking-widest opacity-40 space-y-4">
                                <Database size={48} />
                                <span>Select a dataset to manage its variables</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalVariablesModal;
