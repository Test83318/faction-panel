import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Check, ScrollText } from 'lucide-react';
import { useConfirm } from './ConfirmationProvider';

interface ChangelogEntry {
    id: number;
    version: string;
    title: string;
    body: string;
    released_at: string;
    order: number;
}

const ChangelogAdmin: React.FC = () => {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<ChangelogEntry> | null>(null);
    const [processing, setProcessing] = useState(false);
    const confirm = useConfirm();

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const res = await api.get('/changelog');
            setEntries(res.data);
        } catch {
            toast.error('Failed to load changelog');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        setProcessing(true);
        const loadToast = toast.loading('Saving...');
        try {
            if (editing.id) {
                await api.put(`/superadmin/changelog/${editing.id}`, editing);
            } else {
                await api.post('/superadmin/changelog', editing);
            }
            toast.success('Saved', { id: loadToast });
            setEditing(null);
            fetchEntries();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save', { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (entry: ChangelogEntry) => {
        const ok = await confirm({
            title: 'Delete Changelog Entry',
            message: `Delete "${entry.title}"?`,
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        const loadToast = toast.loading('Deleting...');
        try {
            await api.delete(`/superadmin/changelog/${entry.id}`);
            toast.success('Deleted', { id: loadToast });
            fetchEntries();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete', { id: loadToast });
        }
    };

    const startNew = () => setEditing({ version: '', title: '', body: '', released_at: new Date().toISOString().split('T')[0], order: 0 });

    if (loading) return <div className="text-muted text-xs p-4">Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                    <ScrollText className="text-accent" size={20} />
                    System Changelog
                </h3>
                <button
                    onClick={startNew}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition shadow-lg shadow-accent/20"
                >
                    <Plus size={14} /> New Entry
                </button>
            </div>

            {editing && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4">
                        {editing.id ? 'Edit Entry' : 'New Entry'}
                    </h4>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Version</label>
                                <input
                                    value={editing.version || ''}
                                    onChange={e => setEditing({ ...editing, version: e.target.value })}
                                    className="w-full bg-surface border border-border p-2.5 rounded-lg text-sm font-mono"
                                    placeholder="1.2.3"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Release Date</label>
                                <input
                                    type="date"
                                    value={editing.released_at || ''}
                                    onChange={e => setEditing({ ...editing, released_at: e.target.value })}
                                    className="w-full bg-surface border border-border p-2.5 rounded-lg text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Order</label>
                                <input
                                    type="number"
                                    value={editing.order ?? 0}
                                    onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-surface border border-border p-2.5 rounded-lg text-sm"
                                    min={0}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Title</label>
                            <input
                                value={editing.title || ''}
                                onChange={e => setEditing({ ...editing, title: e.target.value })}
                                className="w-full bg-surface border border-border p-2.5 rounded-lg text-sm"
                                placeholder="What's new in this release..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Body (Markdown)</label>
                            <textarea
                                value={editing.body || ''}
                                onChange={e => setEditing({ ...editing, body: e.target.value })}
                                className="w-full bg-surface border border-border p-2.5 rounded-lg text-sm font-mono resize-none"
                                rows={8}
                                placeholder="- Feature A&#10;- Bug fix B&#10;- Improvement C"
                                required
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-surface transition"
                            >
                                <X size={12} /> Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition disabled:opacity-50"
                            >
                                <Check size={12} /> {processing ? '...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {entries.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-12 text-muted text-center">
                    <ScrollText size={48} className="opacity-10 mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs">No changelog entries yet</p>
                    <p className="text-[10px] mt-1 italic">Create the first entry to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map(entry => (
                        <div key={entry.id} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-accent/10 text-accent rounded">
                                        v{entry.version}
                                    </span>
                                    <span className="font-bold text-sm">{entry.title}</span>
                                    <span className="text-[9px] text-muted font-bold uppercase tracking-widest ml-auto">
                                        {new Date(entry.released_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted line-clamp-2 whitespace-pre-line">{entry.body}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setEditing({ ...entry })}
                                    className="p-2 hover:bg-surface rounded-lg text-muted hover:text-text transition"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(entry)}
                                    className="p-2 hover:bg-danger/10 rounded-lg text-muted hover:text-danger transition"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChangelogAdmin;
