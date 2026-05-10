import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Edit2, Trash2, Plus, Save, X, GripVertical, Shield, User, Info } from 'lucide-react';
import { useConfirm } from './ConfirmationProvider';
import { Reorder } from 'motion/react';

const CreditAdmin: React.FC = () => {
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCredit, setEditingCredit] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const confirm = useConfirm();

    useEffect(() => {
        fetchCredits();
    }, []);

    const fetchCredits = async () => {
        try {
            const res = await api.get('/credits');
            setCredits(res.data);
        } catch (err) {
            toast.error('Failed to fetch credits');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        const loadToast = toast.loading('Saving credit...');
        try {
            if (editingCredit.id) {
                await api.put(`/superadmin/credits/${editingCredit.id}`, editingCredit);
            } else {
                await api.post('/superadmin/credits', editingCredit);
            }
            toast.success('Credit saved', { id: loadToast });
            setEditingCredit(null);
            fetchCredits();
        } catch (err) {
            toast.error('Failed to save credit', { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCredit = async (credit: any) => {
        const confirmed = await confirm({
            title: 'Delete Credit',
            message: `Are you sure you want to delete the credit for "${credit.name}"?`,
            confirmText: 'Delete Credit',
            variant: 'danger'
        });

        if (!confirmed) return;

        const loadToast = toast.loading('Deleting credit...');
        try {
            await api.delete(`/superadmin/credits/${credit.id}`);
            toast.success('Credit deleted', { id: loadToast });
            fetchCredits();
        } catch (err) {
            toast.error('Failed to delete credit', { id: loadToast });
        }
    };

    const handleReorder = async (newOrder: any[]) => {
        setCredits(newOrder);
        try {
            await api.put('/superadmin/credits/reorder', {
                ids: newOrder.map(c => c.id)
            });
        } catch (err) {
            toast.error('Failed to update order');
            fetchCredits();
        }
    };

    if (loading) return <div className="p-12 text-center text-muted animate-pulse font-black uppercase tracking-widest text-[10px]">Loading Credits Management...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                        <Shield className="text-accent" size={20} />
                        Project Credits
                    </h3>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Manage the list of project contributors.</p>
                </div>
                <button 
                    onClick={() => setEditingCredit({ name: '', role: '', description: '', order: credits.length })}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] transition shadow-lg shadow-accent/20"
                >
                    <Plus size={14} /> Add Contributor
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <Reorder.Group axis="y" values={credits} onReorder={handleReorder} className="divide-y divide-border">
                    {credits.map(credit => (
                        <Reorder.Item key={credit.id} value={credit} className="p-4 bg-card hover:bg-surface/50 transition-colors flex items-center gap-4 group">
                            <div className="cursor-grab active:cursor-grabbing text-muted opacity-20 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={18} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-text">{credit.name}</span>
                                    <span className="px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded font-black text-[7px] uppercase tracking-widest">{credit.role}</span>
                                </div>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-tight truncate max-w-xl">{credit.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setEditingCredit(credit)}
                                    className="p-2 bg-surface hover:bg-bg border border-border rounded-lg text-text transition-colors"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteCredit(credit)}
                                    className="p-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 rounded-lg text-danger transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </Reorder.Item>
                    ))}
                    {credits.length === 0 && (
                        <div className="p-12 text-center space-y-2">
                            <Info size={32} className="mx-auto text-muted/20" />
                            <p className="text-muted text-xs font-bold uppercase tracking-widest">No credits added yet.</p>
                        </div>
                    )}
                </Reorder.Group>
            </div>

            {editingCredit && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[700]">
                    <div className="bg-card p-8 rounded-2xl max-w-md w-full border border-border shadow-2xl">
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-6">
                            {editingCredit.id ? 'Edit' : 'Add'} Contributor
                        </h2>
                        <form onSubmit={handleSaveCredit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Name</label>
                                <input 
                                    value={editingCredit.name} 
                                    onChange={e => setEditingCredit({...editingCredit, name: e.target.value})} 
                                    className="w-full bg-surface border border-border p-3 rounded-xl text-sm" 
                                    required 
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Role</label>
                                <input 
                                    value={editingCredit.role} 
                                    onChange={e => setEditingCredit({...editingCredit, role: e.target.value})} 
                                    className="w-full bg-surface border border-border p-3 rounded-xl text-sm" 
                                    required 
                                    placeholder="e.g. Lead Developer"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Description</label>
                                <textarea 
                                    value={editingCredit.description || ''} 
                                    onChange={e => setEditingCredit({...editingCredit, description: e.target.value})} 
                                    className="w-full bg-surface border border-border p-3 rounded-xl text-sm min-h-[100px] resize-none" 
                                    placeholder="What did they contribute?"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setEditingCredit(null)} className="flex-1 px-4 py-3 bg-surface border border-border hover:bg-bg rounded-xl font-bold uppercase tracking-widest text-[10px] transition">Cancel</button>
                                <button type="submit" disabled={processing} className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition shadow-lg shadow-accent/20 disabled:opacity-50">
                                    <Save size={14} className="inline mr-2" />
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditAdmin;
