import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import toast from 'react-hot-toast';
import { Moon, Sun, Plus, Search, LogOut, Shield, User, ChevronDown, Settings, ShieldAlert, Layers, Database } from 'lucide-react';

interface FactionManagerProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
}

const FactionManager: React.FC<FactionManagerProps> = ({ isDark, toggleTheme, user, onLogout }) => {
    const navigate = useNavigate();
    const [myFactions, setMyFactions] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Form states
    const [name, setName] = useState('');
    const [shortname, setShortname] = useState('');
    const [color, setColor] = useState('#1e5fa8');

    const createdFactionsCount = myFactions.filter(f => f.created_by === user?.id).length;
    const isLimitReached = createdFactionsCount >= (user?.max_factions || 1);

    const fetchData = async () => {
        try {
            const myRes = await api.get('/factions');
            setMyFactions(myRes.data);
        } catch (err) {
            toast.error('Failed to fetch factions');
            console.error('Failed to fetch factions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            navigate(`/${response.data.shortname}/admin`);
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to create faction';
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
                <div 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-accent font-black uppercase italic tracking-tighter text-lg cursor-pointer hover:opacity-80 transition-opacity"
                >
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
                    
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-3 hover:bg-border/30 p-1.5 rounded-lg transition-colors group"
                        >
                            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{user?.username}</span>
                            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-muted">
                                <User size={14} />
                            </div>
                            <ChevronDown size={14} className={`text-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl py-2 z-[400] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2 border-b border-border mb-2">
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Signed in as</p>
                                    <p className="text-xs font-black truncate">{user?.username}</p>
                                </div>

                                <button 
                                    onClick={() => {
                                        navigate('/account/settings');
                                        setShowDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface transition-colors"
                                >
                                    <Settings size={14} />
                                    Account Settings
                                </button>

                                {user?.is_superadmin && (
                                    <button 
                                        onClick={() => {
                                            navigate('/superadmin');
                                            setShowDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                                    >
                                        <ShieldAlert size={14} />
                                        Superadmin Panel
                                    </button>
                                )}

                                <div className="border-t border-border mt-2 pt-2">
                                    <button 
                                        onClick={() => {
                                            onLogout();
                                            setShowDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
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
                            onClick={() => navigate('/factions/catalog')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:border-accent rounded font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                            <Search size={14} />
                            Search for Faction
                        </button>
                        <button 
                            onClick={() => setShowCreate(true)}
                            disabled={isLimitReached}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                                isLimitReached 
                                    ? 'bg-border text-muted cursor-not-allowed shadow-none' 
                                    : 'bg-accent hover:bg-accent/90 text-white shadow-accent/20'
                            }`}
                        >
                            <Plus size={14} />
                            {isLimitReached ? 'Limit Reached' : 'Create Faction'}
                        </button>
                    </div>
                </div>

                {isLimitReached && (
                    <div className="mb-8 p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-accent" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest">Faction Limit Reached</p>
                                <p className="text-[10px] text-muted">You have reached your limit of {user?.max_factions} created factions.</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded font-black text-[9px] uppercase tracking-widest">
                            {user?.membership_tier?.name || 'Standard'}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myFactions.length > 0 ? (
                        myFactions.map(faction => (
                            <div key={faction.id} className="group bg-card rounded-xl border border-border overflow-hidden hover:border-accent transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col">
                                <Link to={`/${faction.shortname}`} className="block h-1.5" style={{ backgroundColor: faction.color }} />
                                
                                <div className="flex items-center gap-4 p-6 border-b border-border/50 bg-surface/30">
                                    <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                        {faction.image_url ? (
                                            <img src={faction.image_url} alt={faction.name} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Shield size={20} style={{ color: faction.color }} className="opacity-30" />
                                        )}
                                    </div>
                                    <Link to={`/${faction.shortname}`} className="block overflow-hidden">
                                        <h3 className="text-lg font-bold truncate group-hover:text-accent transition-colors">{faction.name}</h3>
                                        <p className="text-muted text-[9px] font-black uppercase tracking-[0.2em]">{faction.shortname}</p>
                                    </Link>
                                </div>

                                <div className="p-4 bg-card flex-1">
                                    <div className="flex gap-2">
                                        <Link 
                                            to={`/${faction.shortname}/roster`}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface hover:bg-accent/10 border border-border hover:border-accent/50 rounded-lg text-[8px] font-black uppercase tracking-widest text-muted hover:text-accent transition-all"
                                        >
                                            <Layers size={12} />
                                            Roster
                                        </Link>
                                        <Link 
                                            to={`/${faction.shortname}/records`}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface hover:bg-accent/10 border border-border hover:border-accent/50 rounded-lg text-[8px] font-black uppercase tracking-widest text-muted hover:text-accent transition-all"
                                        >
                                            <Database size={12} />
                                            Records
                                        </Link>
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
            </div>
        </div>
    );
};

export default FactionManager;
