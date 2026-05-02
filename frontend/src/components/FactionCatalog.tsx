import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import toast from 'react-hot-toast';
import { Shield, Search, ArrowLeft, Plus, User, ChevronDown, Settings, LogOut, ShieldAlert, Crown } from 'lucide-react';

interface FactionCatalogProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
}

const FactionCatalog: React.FC<FactionCatalogProps> = ({ isDark, toggleTheme, user, onLogout }) => {
    const navigate = useNavigate();
    const [allFactions, setAllFactions] = useState<any[]>([]);
    const [myFactions, setMyFactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleJoin = async (shortname: string) => {
        if (processing) return;
        setProcessing(true);
        const loadToast = toast.loading('Joining Faction...');
        try {
            await api.post('/factions/join', { shortname });
            toast.success('Joined successfully', { id: loadToast });
            fetchData();
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to join faction';
            toast.error(message, { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const filteredFactions = allFactions.filter(f => 
        (f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         f.shortname.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !myFactions.find(mf => mf.shortname === f.shortname)
    );

    if (loading) return <Loading message="Loading Catalog..." />;

    return (
        <div className="min-h-screen bg-bg text-text transition-colors duration-200">
            {/* Minimal Header */}
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
                        <button 
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest mb-4 hover:gap-3 transition-all"
                        >
                            <ArrowLeft size={14} />
                            Back to Selection
                        </button>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-1">Faction Catalog</h1>
                        <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Discover and join organizations</p>
                    </div>
                    
                    <div className="w-full md:w-72 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input 
                            type="text"
                            placeholder="Search factions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface border border-border p-3 pl-12 rounded-xl text-sm focus:border-accent outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFactions.length > 0 ? (
                        filteredFactions.map(faction => (
                            <div key={faction.shortname} className="group bg-card rounded-xl border border-border overflow-hidden hover:border-accent transition-all shadow-sm flex flex-col">
                                <div className="h-1.5" style={{ backgroundColor: faction.color }} />
                                
                                {/* Large Logo Section */}
                                <div className="h-48 bg-surface relative overflow-hidden flex items-center justify-center p-8">
                                    <div 
                                        className="absolute inset-0 opacity-[0.03] z-0" 
                                        style={{ backgroundColor: faction.color }}
                                    />
                                    
                                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                                        {faction.image_url ? (
                                            <img 
                                                src={faction.image_url} 
                                                alt={faction.name} 
                                                className="max-w-[140px] max-h-[140px] object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" 
                                            />
                                        ) : (
                                            <Shield size={64} style={{ color: faction.color }} className="opacity-20" />
                                        )}
                                    </div>

                                    {/* Membership Badge overlay if needed (optional, keeping it clean) */}
                                </div>

                                <div className="p-6 flex-1 flex flex-col border-t border-border/50">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-1 group-hover:text-accent transition-colors">{faction.name}</h3>
                                        <p className="text-muted text-[9px] font-black uppercase tracking-[0.2em] mb-4">{faction.shortname}</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-6">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                                            faction.access === 'joinable' 
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                : 'bg-muted/10 text-muted border-border'
                                        }`}>
                                            {faction.access === 'joinable' ? 'Open Access' : 'Invite Only'}
                                        </span>
                                        
                                        {faction.access === 'joinable' ? (
                                            <button 
                                                onClick={() => handleJoin(faction.shortname)}
                                                disabled={processing}
                                                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                                            >
                                                <Plus size={12} />
                                                Join Faction
                                            </button>
                                        ) : (
                                            <button 
                                                disabled
                                                className="px-4 py-2 bg-surface border border-border text-muted rounded-lg font-bold text-[9px] uppercase tracking-widest opacity-50 cursor-not-allowed"
                                            >
                                                Invite Only
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted">
                            <Search size={48} className="opacity-10 mb-4" />
                            <p className="font-bold uppercase tracking-widest text-xs">No factions found</p>
                            <p className="text-[10px] mt-1 italic">Try adjusting your search terms</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FactionCatalog;
