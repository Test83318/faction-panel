import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Key, Link as LinkIcon, LogOut, User as UserIcon, Check, Shield } from 'lucide-react';
import { Header } from './Header';
import { useConfirm } from './ConfirmationProvider';

interface AccountSettingsProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
}

const AccountSettings: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const confirm = useConfirm();
    
    // Password change state
    const [passwords, setPasswords] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    });

    const [gtawEnabled, setGtawEnabled] = useState(false);

    const fetchUser = async () => {
        try {
            const res = await api.get('/user');
            setUser(res.data);
            
            const statusRes = await api.get('/auth/registration-status');
            setGtawEnabled(statusRes.data.gtaw_oauth_enabled);
        } catch (err) {
            console.error('Failed to fetch user data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        const loadToast = toast.loading('Updating password...');
        try {
            await api.post('/user/change-password', passwords);
            toast.success('Password updated successfully', { id: loadToast });
            setPasswords({ current_password: '', password: '', password_confirmation: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update password', { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleUnlinkGtaw = async () => {
        if (!window.confirm('Are you sure you want to unlink your GTA:W account?')) return;
        
        setProcessing(true);
        const loadToast = toast.loading('Unlinking GTA:W...');
        try {
            await api.post('/user/unlink-gtaw');
            toast.success('GTA:W account unlinked', { id: loadToast });
            fetchUser();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to unlink GTA:W', { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleLinkGtaw = async () => {
        try {
            const res = await api.get('/auth/gtaw/redirect');
            window.location.href = res.data.url;
        } catch (err) {
            toast.error('Failed to initiate GTA:W link');
        }
    };

    const handleLeaveFaction = async (faction: any) => {
        if (!window.confirm(`Are you sure you want to leave ${faction.name}?`)) return;
        
        setProcessing(true);
        const loadToast = toast.loading(`Leaving ${faction.name}...`);
        try {
            await api.post(`/factions/${faction.id}/leave`);
            toast.success(`Successfully left ${faction.name}`, { id: loadToast });
            fetchUser();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to leave faction', { id: loadToast });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <Loading message="Loading Settings..." />;

    return (
        <div className="max-w-4xl mx-auto p-8">
                <div className="mb-12">
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest mb-4 hover:gap-3 transition-all"
                    >
                        <ArrowLeft size={14} />
                        Back to Selection
                    </button>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-1">Account Settings</h1>
                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Manage your profile and organization access</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Basic Info & Security */}
                    <div className="space-y-8">
                        {/* Profile Info */}
                        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-border/50">
                                <UserIcon size={16} className="text-accent" />
                                Profile Information
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Username</label>
                                    <div className="p-3 bg-surface border border-border rounded-xl text-sm font-bold">{user.username}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Status</label>
                                    <div className="flex items-center gap-2">
                                        {user.is_superadmin ? (
                                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-black text-[9px] uppercase tracking-widest">Superadmin</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded font-black text-[9px] uppercase tracking-widest">Standard User</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Password Change */}
                        {(!user.gtaw_id || user.password) && (
                            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-border/50">
                                    <Key size={16} className="text-accent" />
                                    Change Password
                                </h2>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    {user.password && (
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Current Password</label>
                                            <input 
                                                type="password"
                                                value={passwords.current_password}
                                                onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                                                className="w-full bg-surface border border-border p-3 rounded-xl text-sm outline-none focus:border-accent transition-all"
                                                required
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1">New Password</label>
                                        <input 
                                            type="password"
                                            value={passwords.password}
                                            onChange={e => setPasswords({ ...passwords, password: e.target.value })}
                                            className="w-full bg-surface border border-border p-3 rounded-xl text-sm outline-none focus:border-accent transition-all"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Confirm New Password</label>
                                        <input 
                                            type="password"
                                            value={passwords.password_confirmation}
                                            onChange={e => setPasswords({ ...passwords, password_confirmation: e.target.value })}
                                            className="w-full bg-surface border border-border p-3 rounded-xl text-sm outline-none focus:border-accent transition-all"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={processing}
                                        className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                                    >
                                        {processing ? 'Processing...' : 'Update Password'}
                                    </button>
                                </form>
                            </section>
                        )}
                    </div>

                    {/* Right Column: Factions & Integrations */}
                    <div className="space-y-8">
                        {/* GTA:W Integration */}
                        {gtawEnabled && (
                            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-border/50">
                                    <LinkIcon size={16} className="text-accent" />
                                    GTA:W Integration
                                </h2>
                                {user.gtaw_id ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Linked Account</span>
                                                <span className="font-bold">{user.gtaw_username}</span>
                                                <span className="text-[8px] text-muted">ID: {user.gtaw_id}</span>
                                            </div>
                                            <div className="p-2 bg-green-500/10 text-green-500 rounded-full">
                                                <Check size={16} />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleUnlinkGtaw}
                                            disabled={processing}
                                            className="w-full py-3 bg-surface border border-border hover:border-danger hover:text-danger rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                        >
                                            Unlink Account
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-muted mb-4">Link your GTA World account to enable seamless authentication and faction synchronization.</p>
                                        <button 
                                            onClick={handleLinkGtaw}
                                            disabled={processing}
                                            className="w-full py-3 bg-[#1e5fa8] hover:bg-[#1e5fa8]/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-[#1e5fa8]/20 disabled:opacity-50"
                                        >
                                            Link GTA:W Account
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Managed Factions */}
                        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-6 pb-4 border-b border-border/50">
                                <Shield size={16} className="text-accent" />
                                Managed Factions
                            </h2>
                            <div className="space-y-3">
                                {user.factions?.length > 0 ? (
                                    user.factions.map((faction: any) => (
                                        <div key={faction.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: faction.color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase">{faction.name}</span>
                                                    <span className="text-[9px] text-muted uppercase tracking-widest">{faction.shortname}</span>
                                                </div>
                                            </div>
                                            {faction.faction_leader === user.id ? (
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded">Leader</span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleLeaveFaction(faction)}
                                                    disabled={processing}
                                                    className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                    title="Leave Faction"
                                                >
                                                    <LogOut size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-4 text-muted text-[10px] uppercase font-bold tracking-widest">Not a member of any factions</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
    );
};

export default AccountSettings;
