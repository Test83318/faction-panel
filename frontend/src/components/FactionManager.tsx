import React, { useState, useEffect } from 'react';
import api from '../api';
import Loading from './Loading';
import toast from 'react-hot-toast';
import { Moon, Sun, Plus, Search, LogOut, Shield } from 'lucide-react';

interface FactionManagerProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
}

const FactionManager: React.FC<FactionManagerProps> = ({ isDark, toggleTheme, user, onLogout }) => {
    const [myFactions, setMyFactions] = useState<any[]>([]);
    const [allFactions, setAllFactions] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [shortname, setShortname] = useState('');
    const [color, setColor] = useState('#1e5fa8');

    const fetchData = async () => {
        try {
            const [myRes, allRes] = await Promise.all([
                api.get('/factions'),
                api.get('/factions/all')
            ]);
            setMyFactions(myRes.data);
            setAllFactions(allRes.data);
        } catch (err) {
            toast.error('Failed to fetch factions');
            console.error('Failed to fetch factions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        const loadToast = toast.loading('Creating Faction...');
        try {
            const response = await api.post('/factions', { 
                name, 
                shortname, 
                color,
                visibility: 'private',
                access: 'invite-only'
            });
            setName('');
            setShortname('');
            setShowCreate(false);
            toast.success('Faction created successfully', { id: loadToast });
            window.location.href = `/${response.data.shortname}/admin`;
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to create faction';
            toast.error(message, { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleJoin = async (shortname: string) => {
        if (processing) return;
        setProcessing(true);
        const loadToast = toast.loading('Joining Faction...');
        try {
            await api.post('/factions/join', { shortname });
            setShowJoin(false);
            toast.success('Joined successfully', { id: loadToast });
            fetchData();
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to join faction';
            toast.error(message, { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <Loading message="Loading Factions..." />;

    return (
        <div className="min-h-screen bg-bg text-text transition-colors duration-200">
            {/* Minimal Header for Faction Selection */}
            <header className="h-[var(--nav-h)] bg-surface border-b border-border flex items-center px-6 sticky top-0 z-[300]">
                <div className="flex items-center gap-2 text-accent font-black uppercase italic tracking-tighter text-lg">
                    <Shield size={20} fill="currentColor" fillOpacity={0.2} />
                    Faction Panel
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme}
                        className="p-1.5 text-muted hover:text-accent transition-colors"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className="h-4 w-[1px] bg-border mx-2" />
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{user?.username}</span>
                        <button onClick={onLogout} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-1">Your Organizations</h1>
                        <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Select a faction to manage operations</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowJoin(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:border-accent rounded font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            <Search size={14} />
                            Join Faction
                        </button>
                        <button 
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-accent/20"
                        >
                            <Plus size={14} />
                            Create Faction
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myFactions.length > 0 ? (
                        myFactions.map(faction => (
                            <div key={faction.id} className="group bg-card rounded-xl border border-border overflow-hidden hover:border-accent transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1"
                                 onClick={() => window.location.href = `/${faction.shortname}`}>
                                <div className="h-1.5" style={{ backgroundColor: faction.color }} />
                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-1 group-hover:text-accent transition-colors">{faction.name}</h3>
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-muted text-[9px] font-black uppercase tracking-[0.2em]">{faction.shortname}</p>
                                        <div className="w-8 h-8 rounded-lg bg-accent/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                            <Plus size={14} className="rotate-45" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted">
                            <Shield size={48} className="opacity-10 mb-4" />
                            <p className="font-bold uppercase tracking-widest text-xs">No factions found</p>
                            <p className="text-[10px] mt-1 italic">Join an existing organization or create your own</p>
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500]">
                        <div className="bg-card p-8 rounded-2xl max-w-md w-full border border-border shadow-2xl">
                            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-6">Create New Faction</h2>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Faction Name</label>
                                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-surface border border-border p-4 rounded-xl text-sm" required placeholder="e.g. Los Santos Sheriff's Department" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Shortname</label>
                                        <input 
                                            value={shortname} 
                                            onChange={e => setShortname(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ''))} 
                                            className="w-full bg-surface border border-border p-4 rounded-xl text-sm" 
                                            required 
                                            placeholder="e.g. lssd"
                                            pattern="[a-z0-9\-_]+"
                                            title="Lowercase letters, numbers, dashes and underscores only"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Color</label>
                                        <div className="flex gap-2">
                                            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-13 bg-surface border border-border rounded-xl p-1 cursor-pointer" />
                                            <input value={color} onChange={e => setColor(e.target.value)} className="flex-1 bg-surface border border-border p-4 rounded-xl font-mono text-[10px]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-4 bg-surface border border-border hover:bg-bg rounded-xl font-bold uppercase tracking-widest text-[10px] transition">Cancel</button>
                                    <button type="submit" disabled={processing} className="flex-1 px-4 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition shadow-lg shadow-accent/20 disabled:opacity-50">
                                        {processing ? 'Processing...' : 'Create Faction'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Join Modal */}
                {showJoin && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500]">
                        <div className="bg-card p-8 rounded-2xl max-w-md w-full border border-border shadow-2xl">
                            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-6">Join Faction</h2>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {allFactions.filter(f => !myFactions.find(mf => mf.shortname === f.shortname)).length > 0 ? (
                                    allFactions.filter(f => !myFactions.find(mf => mf.shortname === f.shortname)).map(faction => (
                                        <div key={faction.shortname} className="flex justify-between items-center p-4 bg-surface rounded-xl border border-border hover:border-accent transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: faction.color }} />
                                                <span className="font-bold text-sm uppercase tracking-tight">{faction.name}</span>
                                            </div>
                                            {faction.access === 'joinable' ? (
                                                <button 
                                                    onClick={() => handleJoin(faction.shortname)} 
                                                    disabled={processing}
                                                    className="text-[9px] bg-accent text-white px-4 py-1.5 rounded-lg font-black uppercase tracking-widest hover:bg-accent/90 transition-colors disabled:opacity-50"
                                                >
                                                    {processing ? '...' : 'Join'}
                                                </button>
                                            ) : (
                                                <span className="text-[9px] bg-muted/20 text-muted px-4 py-1.5 rounded-lg font-black uppercase tracking-widest border border-border/50">Invite Only</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-muted text-[10px] uppercase font-bold tracking-widest">No other factions available</p>
                                )}
                            </div>
                            <button onClick={() => setShowJoin(false)} className="w-full mt-8 px-4 py-4 bg-surface border border-border rounded-xl font-bold text-[10px] uppercase tracking-widest">Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FactionManager;
