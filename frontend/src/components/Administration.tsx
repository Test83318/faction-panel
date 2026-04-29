import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from './Loading';
import { Shield, Settings, Trash2, Edit2, Check, X, Plus, Save, Info, Key, Users, UserMinus, ShieldAlert, Crown, UserCog, Copy, Link as LinkIcon, Clock } from 'lucide-react';

const Administration: React.FC<{ faction: any; user: any }> = ({ faction, user }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [roles, setRoles] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchingMembers, setFetchingMembers] = useState(false);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    
    // Member Management State
    const [showRankModal, setShowRankModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [memberRoleIds, setMemberRoleIds] = useState<number[]>([]);
    const [savingMemberRoles, setSavingMemberRoles] = useState(false);

    // Invites State
    const [invites, setInvites] = useState<any[]>([]);
    const [fetchingInvites, setFetchingInvites] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({ duration: '24h', max_uses: 0 });

    // Faction Details Form
    const [factionForm, setFactionForm] = useState({ 
        name: faction.name, 
        description: faction.description || '',
        color: faction.color,
        image_url: faction.image_url || '',
        visibility: faction.visibility || 'private'
    });

    const copyInviteLink = (code: string) => {
        const link = `${window.location.origin}/invite/${code}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied!');
    };
    const [savingDetails, setSavingDetails] = useState(false);

    // Role Edit State
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleForm, setRoleForm] = useState({ name: '', weight: 0, color: '#3b82f6' });

    const fetchData = async () => {
        try {
            const [rolesRes, configRes] = await Promise.all([
                api.get(`/factions/${faction.shortname}/roles`),
                api.get('/permissions/config')
            ]);
            setRoles(rolesRes.data);
            setConfig(configRes.data);
            if (!selectedRole && rolesRes.data.length > 0) setSelectedRole(rolesRes.data[0]);
            if (selectedRole) {
                const latest = rolesRes.data.find((r: any) => r.id === selectedRole.id);
                if (latest) setSelectedRole(latest);
            }
        } catch (err) {
            console.error('Failed to fetch admin data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [faction.shortname]);

    const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
            const res = await api.get(`/factions/${faction.shortname}/users`);
            setMembers(res.data);
        } catch (err) {
            toast.error('Failed to fetch members');
        } finally {
            setFetchingMembers(false);
        }
    };

    const fetchInvites = async () => {
        setFetchingInvites(true);
        try {
            const res = await api.get(`/factions/${faction.shortname}/invites`);
            setInvites(res.data);
        } catch (err) {
            toast.error('Failed to fetch invites');
        } finally {
            setFetchingInvites(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') fetchMembers();
        if (activeTab === 'invites') fetchInvites();
    }, [activeTab]);

    const handleRemoveMember = async (targetUser: any) => {
        toast((t) => (
            <div className="flex flex-col gap-1 text-left">
                <p className="font-bold">Remove "{targetUser.username}"?</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tighter">They will lose all access to this faction.</p>
                <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold uppercase transition">Cancel</button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            const loadToast = toast.loading('Removing member...');
                            try {
                                await api.delete(`/factions/${faction.id}/users/${targetUser.id}`);
                                setMembers(members.filter(m => m.id !== targetUser.id));
                                toast.success('Member removed successfully', { id: loadToast });
                            } catch (err: any) {
                                toast.error(err.response?.data?.message || 'Failed to remove member', { id: loadToast });
                            }
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-[9px] font-bold uppercase transition"
                    >
                        Remove
                    </button>
                </div>
            </div>
        ), { duration: 6000, position: 'top-center' });
    };

    const openRankModal = (targetUser: any) => {
        setEditingMember(targetUser);
        setMemberRoleIds(targetUser.roles.map((r: any) => r.id));
        setShowRankModal(true);
    };

    const saveMemberRoles = async () => {
        setSavingMemberRoles(true);
        try {
            await api.put(`/factions/${faction.id}/users/${editingMember.id}/roles`, { role_ids: memberRoleIds });
            toast.success('Ranks updated successfully');
            setShowRankModal(false);
            fetchMembers();
        } catch (err) {
            toast.error('Failed to update ranks');
        } finally {
            setSavingMemberRoles(false);
        }
    };

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingInvite(true);
        try {
            await api.post(`/factions/${faction.shortname}/invites`, inviteForm);
            toast.success('Invite code generated!');
            fetchInvites();
        } catch (err) {
            toast.error('Failed to create invite');
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleDeleteInvite = async (id: number) => {
        try {
            await api.delete(`/invites/${id}`);
            setInvites(invites.filter(i => i.id !== id));
            toast.success('Invite deleted');
        } catch (err) {
            toast.error('Failed to delete invite');
        }
    };

    const handlePermissionChange = (key: string, value: string) => {
        const updatedPermissions = selectedRole.permissions.map((p: any) => 
            p.permission_key === key ? { ...p, value } : p
        );
        setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
    };

    const savePermissions = async () => {
        setSaving(true);
        try {
            const permsToSave = selectedRole.permissions.map((p: any) => ({
                key: p.permission_key,
                value: p.value
            }));
            await api.put(`/roles/${selectedRole.id}/permissions`, { permissions: permsToSave });
            fetchData();
            toast.success('Permissions saved successfully');
        } catch (err) {
            toast.error('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleFactionUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingDetails(true);
        try {
            await api.put(`/factions/${faction.id}`, factionForm);
            toast.success('Faction details updated successfully!');
            setTimeout(() => window.location.reload(), 1000); // Give toast time to show
        } catch (err) {
            toast.error('Failed to update faction details');
        } finally {
            setSavingDetails(false);
        }
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, roleForm);
                toast.success('Rank updated successfully');
            } else {
                await api.post(`/factions/${faction.shortname}/roles`, roleForm);
                toast.success('Rank created successfully');
            }
            setShowRoleModal(false);
            setEditingRole(null);
            fetchData();
        } catch (err) {
            toast.error('Failed to save rank');
        }
    };

    const deleteRole = async (role: any) => {
        toast((t) => (
            <div className="flex flex-col gap-1">
                <p className="font-bold">Delete rank "{role.name}"?</p>
                <p className="text-[10px] opacity-80 uppercase tracking-tighter">This action cannot be undone.</p>
                <div className="flex gap-2 justify-end mt-2">
                    <button 
                        onClick={() => toast.dismiss(t.id)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold uppercase transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            const loadToast = toast.loading('Deleting rank...');
                            try {
                                await api.delete(`/roles/${role.id}`);
                                if (selectedRole?.id === role.id) setSelectedRole(null);
                                fetchData();
                                toast.success('Rank deleted successfully', { id: loadToast });
                            } catch (err: any) {
                                toast.error(err.response?.data?.message || 'Failed to delete rank', { id: loadToast });
                            }
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-[9px] font-bold uppercase transition"
                    >
                        Delete
                    </button>
                </div>
            </div>
        ), { duration: 6000, position: 'top-center' });
    };

    const openRoleModal = (role: any = null) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({ name: role.name, weight: role.weight, color: role.color });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', weight: roles.length > 0 ? Math.min(...roles.map(r => r.weight)) - 1 : 1, color: '#3b82f6' });
        }
        setShowRoleModal(true);
    };

    if (loading) return <Loading message="Loading Admin Panel..." fullScreen={false} />;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-text">
                    <Settings className="text-accent" />
                    Faction Administration
                </h2>
            </div>

            {/* Admin Tabs */}
            <div className="flex gap-1 border-b border-border mb-2 relative z-50 overflow-x-auto scrollbar-none">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'details' ? 'text-accent' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <Info size={14} />
                        Faction Details
                    </div>
                    {activeTab === 'details' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                </button>
                <button 
                    onClick={() => setActiveTab('roles')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'roles' ? 'text-accent' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <Key size={14} />
                        Ranks & Permissions
                    </div>
                    {activeTab === 'roles' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'users' ? 'text-accent' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={14} />
                        Users
                    </div>
                    {activeTab === 'users' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                </button>
                <button 
                    onClick={() => setActiveTab('invites')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'invites' ? 'text-accent' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <LinkIcon size={14} />
                        Invites
                    </div>
                    {activeTab === 'invites' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                    <motion.div 
                        key="details"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="bg-card border border-border rounded-lg p-6 w-full"
                    >
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <Info size={18} className="text-accent" />
                            General Information
                        </h3>
                        <form onSubmit={handleFactionUpdate} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Identity & Branding</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Name</label>
                                            <input 
                                                value={factionForm.name}
                                                onChange={e => setFactionForm({ ...factionForm, name: e.target.value })}
                                                className="w-full bg-surface border border-border p-3 rounded text-sm focus:border-accent outline-none transition text-text"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Short Name (URL Slug)</label>
                                            <input 
                                                value={faction.shortname}
                                                disabled
                                                className="w-full bg-surface/50 border border-border p-3 rounded text-sm text-muted cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Color</label>
                                            <div className="flex gap-3">
                                                <input 
                                                    type="color"
                                                    value={factionForm.color}
                                                    onChange={e => setFactionForm({ ...factionForm, color: e.target.value })}
                                                    className="w-12 h-11 bg-surface border border-border rounded p-1 cursor-pointer"
                                                />
                                                <input 
                                                    value={factionForm.color}
                                                    onChange={e => setFactionForm({ ...factionForm, color: e.target.value })}
                                                    className="flex-1 bg-surface border border-border p-3 rounded text-sm font-mono focus:border-accent outline-none transition text-text"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Description</label>
                                            <textarea 
                                                value={factionForm.description}
                                                onChange={e => setFactionForm({ ...factionForm, description: e.target.value })}
                                                rows={4}
                                                className="w-full bg-surface border border-border p-3 rounded text-sm focus:border-accent outline-none transition resize-none text-text"
                                                placeholder="Tell people about your organization..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Media & Visuals</div>
                                    <div>
                                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Image URL</label>
                                        <input 
                                            value={factionForm.image_url}
                                            onChange={e => setFactionForm({ ...factionForm, image_url: e.target.value })}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full bg-surface border border-border p-3 rounded text-sm focus:border-accent outline-none transition text-text"
                                        />
                                    </div>
                                    {factionForm.image_url && (
                                        <div className="mt-4">
                                            <div className="w-full h-24 bg-surface border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
                                                <img src={factionForm.image_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-border/50">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Access & Visibility Control</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[
                                        { id: 'public', name: 'Public', desc: 'Roster is viewable by anyone.', color: 'text-green-500' },
                                        { id: 'hidden', name: 'Hidden', desc: 'Public access, but not listed.', color: 'text-yellow-500' },
                                        { id: 'joinable', name: 'Joinable', desc: 'Visible. Open for anyone.', color: 'text-accent' },
                                        { id: 'invite-only', name: 'Invite-Only', desc: 'Visible. Requires link.', color: 'text-purple-500' },
                                        { id: 'private', name: 'Private', desc: 'Strictly members only.', color: 'text-red-500' }
                                    ].map(opt => (
                                        <label 
                                            key={opt.id}
                                            className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer group ${
                                                factionForm.visibility === opt.id 
                                                    ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' 
                                                    : 'bg-surface border-border hover:border-accent/50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${factionForm.visibility === opt.id ? 'text-accent' : 'text-muted'}`}>
                                                    {opt.name}
                                                </span>
                                                <input 
                                                    type="radio" 
                                                    name="visibility" 
                                                    value={opt.id}
                                                    checked={factionForm.visibility === opt.id}
                                                    onChange={e => setFactionForm({ ...factionForm, visibility: e.target.value })}
                                                    className="w-3.5 h-3.5 text-accent bg-bg border-border focus:ring-accent transition cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-[9px] text-muted leading-relaxed italic">
                                                {opt.desc}
                                            </p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={savingDetails}
                                    className="flex items-center gap-2 px-10 py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-accent/20"
                                >
                                    <Save size={16} />
                                    {savingDetails ? 'Saving Changes...' : 'Update Faction Settings'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {activeTab === 'roles' && (
                    <motion.div 
                        key="roles"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex flex-col lg:flex-row gap-6"
                    >
                        <div className="w-full lg:w-72 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2 px-2 flex items-center gap-2">
                                    <Shield size={12} />
                                    System Ranks
                                </div>
                                {roles.filter(r => ['Administrator', 'User', 'Public'].includes(r.name)).sort((a, b) => {
                                    const order = { 'Administrator': 0, 'User': 1, 'Public': 2 };
                                    return (order[a.name as keyof typeof order] ?? 99) - (order[b.name as keyof typeof order] ?? 99);
                                }).map(role => {
                                    const isPublicDisabled = role.name === 'Public' && !['public', 'hidden'].includes(factionForm.visibility);
                                    return (
                                        <div 
                                            key={role.id}
                                            className={`p-3 rounded-lg transition-all border cursor-pointer ${
                                                selectedRole?.id === role.id 
                                                    ? 'bg-accent/10 border-accent text-accent' 
                                                    : 'bg-card border-border text-muted hover:border-accent/50'
                                            } ${isPublicDisabled ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                            onClick={() => setSelectedRole(role)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                                <div className="font-bold text-sm">{role.name}</div>
                                            </div>
                                            <div className="text-[9px] opacity-60 uppercase tracking-widest">Immutable Rank</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 px-2 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Settings size={12} />
                                        Custom Ranks
                                    </div>
                                    <button onClick={() => openRoleModal()} className="p-1 hover:text-accent transition">
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {roles.filter(r => !['Administrator', 'User', 'Public'].includes(r.name)).map(role => (
                                    <div 
                                        key={role.id}
                                        className={`group relative p-3 rounded-lg transition-all border cursor-pointer ${
                                            selectedRole?.id === role.id 
                                                ? 'bg-accent/10 border-accent text-accent' 
                                                : 'bg-card border-border text-muted hover:border-accent/50'
                                        }`}
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                            <div className="font-bold text-sm">{role.name}</div>
                                        </div>
                                        <div className="text-[10px] opacity-60">Weight: {role.weight}</div>
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); openRoleModal(role); }} className="p-1 hover:text-text"><Edit2 size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteRole(role); }} className="p-1 hover:text-danger"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedRole ? (
                            <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col min-h-[500px]">
                                <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg uppercase tracking-tight">{selectedRole.name} Permissions</h3>
                                        <p className="text-[11px] text-muted">Configure access levels for this rank.</p>
                                    </div>
                                    {selectedRole.name !== 'Administrator' && (
                                        <button 
                                            onClick={savePermissions}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-[10px] uppercase tracking-widest transition"
                                        >
                                            <Save size={14} />
                                            {saving ? 'Saving...' : 'Save Permissions'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-8">
                                    {Object.entries(config).map(([catKey, category]: [string, any]) => (
                                        <div key={catKey}>
                                            <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] mb-4 border-b border-accent/20 pb-1">{category.name}</h4>
                                            <div className="space-y-2">
                                                {Object.entries(category.permissions).map(([permKey, perm]: [string, any]) => {
                                                    const currentVal = selectedRole.name === 'Administrator' ? 'YES' : (selectedRole.permissions.find((p: any) => p.permission_key === permKey)?.value || 'NO');
                                                    return (
                                                        <div key={permKey} className="flex items-center justify-between p-3 bg-surface rounded border border-border/50">
                                                            <div className="max-w-[60%]">
                                                                <div className="text-sm font-bold text-text">{perm.name}</div>
                                                                <div className="text-[10.5px] text-muted">{perm.description}</div>
                                                            </div>
                                                            <div className="flex gap-1 bg-bg p-1 rounded border border-border">
                                                                {['YES', 'NO', 'NEVER'].map(val => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => selectedRole.name !== 'Administrator' && handlePermissionChange(permKey, val)}
                                                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${currentVal === val ? val === 'YES' ? 'bg-green-600 text-white' : val === 'NEVER' ? 'bg-red-600 text-white' : 'bg-muted text-white' : 'text-muted hover:text-text'}`}
                                                                    >
                                                                        {val}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted uppercase text-xs tracking-widest bg-card border border-border border-dashed rounded-lg">Select a rank to manage permissions</div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div 
                        key="users"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2 text-text"><Users size={18} className="text-accent" /> Faction Members</h3>
                                <p className="text-[11px] text-muted">Manage user access and hierarchy.</p>
                            </div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{members.length} Total Members</div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[600px]">
                            {fetchingMembers ? <Loading message="Fetching Members..." fullScreen={false} /> : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="py-3 px-4 text-[10px] font-bold text-muted uppercase">User</th>
                                            <th className="py-3 px-4 text-[10px] font-bold text-muted uppercase">Ranks</th>
                                            <th className="py-3 px-4 text-[10px] font-bold text-muted uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map((member: any) => (
                                            <tr key={member.id} className="border-b border-border/50 hover:bg-surface transition-colors group">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold">{member.username.charAt(0).toUpperCase()}</div>
                                                        <div>
                                                            <div className="font-bold text-sm text-text flex items-center gap-2">
                                                                {member.username} 
                                                                {faction.faction_leader === member.id && <Crown size={12} className="text-yellow-500" />}
                                                                {member.is_superadmin && (
                                                                    <span 
                                                                        className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 shadow-[0_0_5px_rgba(255,215,0,0.2)]"
                                                                    >
                                                                        Superadmin
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-muted">ID: {member.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {member.roles.map((r: any) => (
                                                            <span 
                                                                key={r.id} 
                                                                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border"
                                                                style={{ 
                                                                    backgroundColor: `${r.color}15`, 
                                                                    color: r.color,
                                                                    borderColor: `${r.color}30`
                                                                }}
                                                            >
                                                                {r.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    {faction.faction_leader !== member.id && (
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openRankModal(member)} className="p-1.5 hover:bg-accent/20 hover:text-accent rounded"><UserCog size={16} /></button>
                                                            <button onClick={() => handleRemoveMember(member)} className="p-1.5 hover:bg-danger/20 hover:text-danger rounded"><UserMinus size={16} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'invites' && (
                    <motion.div 
                        key="invites"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        <div className="bg-card border border-border rounded-lg p-6 h-fit">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-text"><Plus size={18} className="text-accent" /> Create Invite</h3>
                            <form onSubmit={handleCreateInvite} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Expiration</label>
                                    <select value={inviteForm.duration} onChange={e => setInviteForm({ ...inviteForm, duration: e.target.value })} className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition">
                                        <option value="1h">1 Hour</option>
                                        <option value="3h">3 Hours</option>
                                        <option value="24h">24 Hours</option>
                                        <option value="48h">48 Hours</option>
                                        <option value="1w">1 Week</option>
                                        <option value="never">Never</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Max Uses</label>
                                    <input type="number" value={inviteForm.max_uses} onChange={e => setInviteForm({ ...inviteForm, max_uses: parseInt(e.target.value) })} className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" placeholder="0 for unlimited" />
                                    <p className="text-[9px] text-muted mt-1 italic">Set to 0 for unlimited uses.</p>
                                </div>
                                <button type="submit" disabled={creatingInvite} className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2"><LinkIcon size={14} /> {creatingInvite ? 'Generating...' : 'Generate Invite Link'}</button>
                            </form>
                        </div>

                        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-border bg-border/10"><h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2 text-text"><LinkIcon size={14} className="text-accent" /> Active Invitations</h3></div>
                            <div className="p-0 overflow-auto max-h-[600px]">
                                {fetchingInvites ? <Loading message="Fetching Invites..." fullScreen={false} /> : invites.length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-surface/30">
                                                <th className="py-3 px-4 text-[9px] font-black text-muted uppercase">Code</th>
                                                <th className="py-3 px-4 text-[9px] font-black text-muted uppercase">Uses</th>
                                                <th className="py-3 px-4 text-[9px] font-black text-muted uppercase">Expiration</th>
                                                <th className="py-3 px-4 text-[9px] font-black text-muted uppercase text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invites.map((invite) => (
                                                <tr key={invite.id} className="border-b border-border/50 hover:bg-surface transition-colors group">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-[10px] font-black bg-accent/5 text-accent px-2 py-1 rounded border border-accent/20">{invite.code}</code>
                                                            <button onClick={() => copyInviteLink(invite.code)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-accent transition"><Copy size={12} /></button>
                                                        </div>
                                                        <div className="text-[8px] text-muted uppercase mt-1">By {invite.creator.username}</div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="text-[10px] font-bold text-text">{invite.uses} / {invite.max_uses || '∞'}</div>
                                                        <div className="w-16 h-1 bg-border rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-accent" style={{ width: invite.max_uses ? `${(invite.uses / invite.max_uses) * 100}%` : '0%' }} />
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase"><Clock size={12} /> {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : 'Never'}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right"><button onClick={() => handleDeleteInvite(invite.id)} className="p-1.5 hover:bg-danger/10 text-muted hover:text-danger rounded transition"><Trash2 size={16} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-muted">
                                        <LinkIcon size={48} className="opacity-10 mb-4" />
                                        <p className="font-bold uppercase tracking-widest text-[10px]">No active invites</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Role Create/Edit Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
                    <div className="bg-card p-6 rounded-lg max-w-sm w-full border border-border shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-text">{editingRole ? <Edit2 size={18} /> : <Plus size={18} />} {editingRole ? 'Edit Rank' : 'Create New Rank'}</h2>
                        <form onSubmit={handleRoleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Rank Name</label>
                                <input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" required placeholder="e.g. Commander" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Weight</label>
                                <input type="number" value={roleForm.weight} onChange={e => setRoleForm({ ...roleForm, weight: parseInt(e.target.value) })} className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" required />
                            </div>
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Rank Color</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={roleForm.color} 
                                        onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} 
                                        className={`w-10 h-10 bg-surface border border-border rounded p-1 cursor-pointer ${['Administrator', 'User', 'Public'].includes(roleForm.name) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={['Administrator', 'User', 'Public'].includes(roleForm.name)}
                                    />
                                    <input 
                                        value={roleForm.color} 
                                        onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} 
                                        className={`flex-1 bg-surface border border-border p-2 rounded text-sm text-text focus:border-accent outline-none transition font-mono ${['Administrator', 'User', 'Public'].includes(roleForm.name) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={['Administrator', 'User', 'Public'].includes(roleForm.name)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition">Save Rank</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Member Rank Modal */}
            {showRankModal && editingMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
                    <div className="bg-card p-6 rounded-lg max-w-md w-full border border-border shadow-2xl">
                        <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-text"><UserCog size={20} className="text-accent" /> Manage Ranks</h2>
                        <p className="text-[11px] text-muted mb-6 uppercase tracking-widest font-bold">For <span className="text-text">{editingMember.username}</span></p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
                            {roles.filter(r => r.name !== 'Public').sort((a, b) => b.weight - a.weight).map(role => (
                                <label key={role.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${memberRoleIds.includes(role.id) ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-muted hover:border-accent/30'}`}>
                                    <div className="flex flex-col"><span className="font-bold text-sm">{role.name}</span><span className="text-[9px] opacity-60 uppercase">Weight: {role.weight}</span></div>
                                    <input type="checkbox" checked={memberRoleIds.includes(role.id)} onChange={(e) => { if (e.target.checked) { setMemberRoleIds([...memberRoleIds, role.id]); } else { setMemberRoleIds(memberRoleIds.filter(id => id !== role.id)); } }} className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-bg" />
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowRankModal(false)} className="flex-1 px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                            <button onClick={saveMemberRoles} disabled={savingMemberRoles} className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">{savingMemberRoles ? 'Saving...' : 'Update Ranks'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Administration;
