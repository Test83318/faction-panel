import React, { useState } from 'react';
import { X, Save, BarChart3, Layout } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { StatisticsModel } from '../types';

interface StatisticsModelModalProps {
    shortname: string;
    model?: StatisticsModel;
    onClose: () => void;
    onSave: () => void;
}

export const StatisticsModelModal: React.FC<StatisticsModelModalProps> = ({ 
    shortname, 
    model, 
    onClose, 
    onSave 
}) => {
    const [name, setName] = useState(model?.name || '');
    const [description, setDescription] = useState(model?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name) return toast.error('Name is required');
        setIsSaving(true);
        const loadToast = toast.loading('Saving dashboard...');
        try {
            const payload = {
                name,
                description
            };
            if (model) {
                await api.put(`/statistics/${model.id}`, payload);
            } else {
                await api.post(`/factions/${shortname}/statistics`, payload);
            }
            toast.success('Dashboard saved', { id: loadToast });
            onSave();
        } catch (err) {
            toast.error('Failed to save dashboard', { id: loadToast });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-border bg-surface/30 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                            <Layout className="text-accent" size={24} />
                            {model ? 'Edit' : 'Create'} Dashboard
                        </h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                            Set up a new analytical page
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <X size={20} className="text-muted" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-1.5">Dashboard Name</label>
                        <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text font-bold focus:border-accent outline-none transition"
                            placeholder="e.g. Executive Overview"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-1.5">Description (Optional)</label>
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text font-bold focus:border-accent outline-none transition min-h-[100px]"
                            placeholder="Describe what this dashboard monitors..."
                        />
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
                        {isSaving ? 'Saving...' : 'Save Dashboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};

