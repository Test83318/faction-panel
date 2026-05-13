import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Plus, Trash2, Download, Upload, History, Check, X, ShieldAlert, AlertCircle, RefreshCw, FileJson } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';

const FactionSnapshots: React.FC = () => {
    const { shortname } = useParams<{ shortname: string }>();
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSnapshot, setNewSnapshot] = useState({ name: '', description: '' });
    const [permissions, setPermissions] = useState<string[]>([]);

    const fetchSnapshots = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/snapshots`);
            setSnapshots(res.data);
            
            // Fetch permissions for the faction context
            const factionRes = await api.get(`/factions/${shortname}`);
            setPermissions(factionRes.data.permissions || []);
        } catch (err) {
            toast.error('Failed to load snapshots');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, [shortname]);

    const canCreate = permissions.includes('create_snapshot') || permissions.includes('administrator');
    const canRestore = permissions.includes('restore_snapshot') || permissions.includes('administrator');
    const canDelete = permissions.includes('delete_snapshot') || permissions.includes('administrator');

    const handleCreate = async () => {
        if (!newSnapshot.name) return toast.error('Please enter a name');
        setCreating(true);
        const loadToast = toast.loading('Creating snapshot...');
        try {
            await api.post(`/factions/${shortname}/snapshots`, newSnapshot);
            toast.success('Snapshot created successfully', { id: loadToast });
            setShowCreateModal(false);
            setNewSnapshot({ name: '', description: '' });
            fetchSnapshots();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create snapshot', { id: loadToast });
        } finally {
            setCreating(false);
        }
    };

    const handleRestore = async (snapshot: any) => {
        if (!window.confirm(`WARNING: Restoring will WIPE all current rosters, roles, and groups. Members and audit logs will be preserved. Are you sure you want to restore "${snapshot.name}"?`)) return;
        
        setRestoring(snapshot.id);
        const loadToast = toast.loading('Restoring faction state...');
        try {
            await api.post(`/snapshots/${snapshot.id}/restore`);
            toast.success('Faction restored successfully', { id: loadToast });
            fetchSnapshots();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to restore snapshot', { id: loadToast });
        } finally {
            setRestoring(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this snapshot?')) return;
        try {
            await api.delete(`/snapshots/${id}`);
            toast.success('Snapshot deleted');
            fetchSnapshots();
        } catch (err) {
            toast.error('Failed to delete snapshot');
        }
    };

    const handleDownload = async (snapshot: any) => {
        const loadToast = toast.loading('Preparing download...');
        try {
            const response = await api.get(`/snapshots/${snapshot.id}/download`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `snapshot_${shortname}_${new Date(snapshot.created_at).toISOString().split('T')[0]}.json`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Download started', { id: loadToast });
        } catch (err) {
            toast.error('Failed to download snapshot', { id: loadToast });
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const loadToast = toast.loading('Uploading snapshot...');
        try {
            await api.post(`/factions/${shortname}/snapshots/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Snapshot uploaded successfully', { id: loadToast });
            fetchSnapshots();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload snapshot', { id: loadToast });
        } finally {
            e.target.value = '';
        }
    };

    if (loading) return <Loading message="Loading Snapshots..." />;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3">
                        <Camera className="text-accent" size={24} />
                        Faction Snapshots
                    </h1>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Manage backups and restore your faction state</p>
                </div>
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <>
                            <label className="px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded-xl font-bold text-xs uppercase tracking-widest transition cursor-pointer flex items-center gap-2">
                                <Upload size={14} />
                                Upload Snapshot
                                <input type="file" className="hidden" accept=".json" onChange={handleUpload} />
                            </label>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-accent/20"
                            >
                                <Plus size={14} />
                                Create Snapshot
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {snapshots.length === 0 ? (
                        <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
                            <Camera size={48} className="text-muted/20 mx-auto mb-4" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted">No snapshots found</h3>
                            <p className="text-xs text-muted/60 mt-1 uppercase tracking-tight">Create your first manual backup to secure your faction data</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {snapshots.map((s) => (
                                <div key={s.id} className={`bg-card border rounded-2xl p-5 transition-all group ${restoring === s.id ? 'border-accent animate-pulse' : 'border-border'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl ${s.type === 'auto' ? 'bg-blue-500/10 text-blue-500' : 'bg-accent/10 text-accent'}`}>
                                                {s.type === 'auto' ? <History size={20} /> : <Camera size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black uppercase tracking-tight italic text-sm">{s.name}</h3>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${s.type === 'auto' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-accent/10 border-accent/20 text-accent'}`}>
                                                        {s.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted font-medium mt-1">{s.description || 'No description provided'}</p>
                                                <div className="flex items-center gap-3 mt-3 text-[9px] font-bold uppercase tracking-widest text-muted">
                                                    <span className="flex items-center gap-1"><History size={10} /> {new Date(s.created_at).toLocaleString()}</span>
                                                    {s.creator && <span className="flex items-center gap-1"><Plus size={10} /> {s.creator.username}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleDownload(s)}
                                                className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-all"
                                                title="Download Snapshot"
                                            >
                                                <Download size={16} />
                                            </button>
                                            {canRestore && (
                                                <button 
                                                    onClick={() => handleRestore(s)}
                                                    disabled={restoring !== null}
                                                    className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                                    title="Restore Snapshot"
                                                >
                                                    <RefreshCw size={16} className={restoring === s.id ? 'animate-spin' : ''} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button 
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                    title="Delete Snapshot"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <section className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-4 flex items-center gap-2">
                            <ShieldAlert size={14} /> Backup Information
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-surface border border-border rounded-xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-text mb-1">Rotation Policy</h4>
                                <p className="text-[11px] text-muted font-bold uppercase tracking-tight leading-relaxed italic">
                                    Automatic snapshots are rotated daily. The system keeps a maximum of 7 automatic backups. Manual snapshots are kept indefinitely until deleted.
                                </p>
                            </div>
                            <div className="p-4 bg-surface border border-border rounded-xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-text mb-1">Included Data</h4>
                                <ul className="text-[9px] text-muted font-bold uppercase tracking-widest space-y-1.5 mt-2">
                                    <li className="flex items-center gap-2 text-accent"><Check size={10} /> Faction Configuration</li>
                                    <li className="flex items-center gap-2 text-accent"><Check size={10} /> All Rosters & Content</li>
                                    <li className="flex items-center gap-2 text-accent"><Check size={10} /> Roles & Permissions</li>
                                    <li className="flex items-center gap-2 text-accent"><Check size={10} /> Groups & Structures</li>
                                    <li className="flex items-center gap-2 text-danger"><X size={10} /> Faction Members</li>
                                    <li className="flex items-center gap-2 text-danger"><X size={10} /> Audit Logs</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="bg-danger/5 border border-danger/20 rounded-2xl p-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-danger mb-4 flex items-center gap-2">
                            <AlertCircle size={14} /> Danger Zone
                        </h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed mb-4">
                            Restoring a snapshot is destructive. It will overwrite your current configuration with the state captured in the backup.
                        </p>
                        <div className="p-4 bg-card border border-danger/10 rounded-xl">
                            <span className="text-[9px] font-black uppercase tracking-widest text-danger block mb-2">Restoring Checklist:</span>
                            <ul className="text-[8px] text-muted font-bold uppercase tracking-widest space-y-1">
                                <li>• Create a fresh backup first</li>
                                <li>• Verify the snapshot timestamp</li>
                                <li>• Ensure no one is currently editing</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]">
                    <div className="bg-card p-6 rounded-2xl max-w-md w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                                <Camera size={20} className="text-accent" /> Create Snapshot
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-text transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Snapshot Name</label>
                                <input 
                                    value={newSnapshot.name}
                                    onChange={(e) => setNewSnapshot({ ...newSnapshot, name: e.target.value })}
                                    className="w-full bg-surface border border-border p-3 rounded-xl text-sm text-text focus:border-accent outline-none font-bold placeholder:opacity-30"
                                    placeholder="e.g. Pre-Refactor Backup"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Description (Optional)</label>
                                <textarea 
                                    value={newSnapshot.description}
                                    onChange={(e) => setNewSnapshot({ ...newSnapshot, description: e.target.value })}
                                    className="w-full bg-surface border border-border p-3 rounded-xl text-sm text-text focus:border-accent outline-none font-medium h-24 resize-none placeholder:opacity-30"
                                    placeholder="What does this backup contain?"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded-xl font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                            <button 
                                onClick={handleCreate} 
                                disabled={creating || !newSnapshot.name}
                                className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-accent/20"
                            >
                                {creating ? 'Creating...' : 'Create Snapshot'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FactionSnapshots;
