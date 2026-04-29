import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from './Loading';
import { Shield, Settings, Trash2, Edit2, Check, X, Plus, Save, Info, Key } from 'lucide-react';

const Administration: React.FC<{ faction: any; user: any }> = ({ faction, user }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [roles, setRoles] = useState<any[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    
    // Faction Details Form
    const [factionForm, setFactionForm] = useState({ 
        name: faction.name, 
        color: faction.color,
        image_url: faction.image_url || '',
        visibility: faction.visibility || 'private'
    });
    const [savingDetails, setSavingDetails] = useState(false);

    // Role Edit State
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleForm, setRoleForm] = useState({ name: '', weight: 0 });

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
            setRoleForm({ name: role.name, weight: role.weight });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', weight: roles.length > 0 ? Math.min(...roles.map(r => r.weight)) - 1 : 1 });
        }
        setShowRoleModal(true);
    };

    if (loading) return <Loading message="Loading Admin Panel..." fullScreen={false} />;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="text-blue-500" />
                    Faction Administration
                </h2>
            </div>

            {/* Admin Tabs */}
            <div className="flex gap-1 border-b border-border mb-2">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'details' ? 'text-blue-500' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <Info size={14} />
                        Faction Details
                    </div>
                    {activeTab === 'details' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                </button>
                <button 
                    onClick={() => setActiveTab('roles')}
                    className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'roles' ? 'text-blue-500' : 'text-muted hover:text-text'}`}
                >
                    <div className="flex items-center gap-2">
                        <Key size={14} />
                        Ranks & Permissions
                    </div>
                    {activeTab === 'roles' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
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
                            <Info size={18} className="text-blue-500" />
                            General Information
                        </h3>
                        <form onSubmit={handleFactionUpdate} className="space-y-8">
                            {/* Top Section: Identity & Media */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Identity Column */}
                                <div className="space-y-6">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Identity & Branding</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Name</label>
                                            <input 
                                                value={factionForm.name}
                                                onChange={e => setFactionForm({ ...factionForm, name: e.target.value })}
                                                className="w-full bg-gray-950 border border-border p-3 rounded text-sm focus:border-blue-500 outline-none transition"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Short Name (URL Slug)</label>
                                            <input 
                                                value={faction.shortname}
                                                disabled
                                                className="w-full bg-gray-950/50 border border-border p-3 rounded text-sm text-muted cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Color</label>
                                            <div className="flex gap-3">
                                                <input 
                                                    type="color"
                                                    value={factionForm.color}
                                                    onChange={e => setFactionForm({ ...factionForm, color: e.target.value })}
                                                    className="w-12 h-11 bg-gray-950 border border-border rounded p-1 cursor-pointer"
                                                />
                                                <input 
                                                    value={factionForm.color}
                                                    onChange={e => setFactionForm({ ...factionForm, color: e.target.value })}
                                                    className="flex-1 bg-gray-950 border border-border p-3 rounded text-sm font-mono focus:border-blue-500 outline-none transition"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Media Column */}
                                <div className="space-y-6">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Media & Visuals</div>
                                    <div>
                                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Image URL</label>
                                        <input 
                                            value={factionForm.image_url}
                                            onChange={e => setFactionForm({ ...factionForm, image_url: e.target.value })}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full bg-gray-950 border border-border p-3 rounded text-sm focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                    {factionForm.image_url && (
                                        <div className="mt-4">
                                            <div className="w-full h-24 bg-gray-950 border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
                                                <img src={factionForm.image_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Middle Section: Visibility (Full Width) */}
                            <div className="space-y-6 pt-4 border-t border-border/50">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Access & Visibility Control</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[
                                        { id: 'public', name: 'Public', desc: 'Roster is viewable by anyone. Access via Public rank.', color: 'text-green-500' },
                                        { id: 'hidden', name: 'Hidden', desc: 'Public access, but not listed in the directory.', color: 'text-yellow-500' },
                                        { id: 'joinable', name: 'Joinable', desc: 'Visible in directory. Open for anyone to join.', color: 'text-blue-500' },
                                        { id: 'invite-only', name: 'Invite-Only', desc: 'Visible, but membership requires an invitation.', color: 'text-purple-500' },
                                        { id: 'private', name: 'Private', desc: 'Strictly members only. Hidden from public view.', color: 'text-red-500' }
                                    ].map(opt => (
                                        <label 
                                            key={opt.id}
                                            className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer group ${
                                                factionForm.visibility === opt.id 
                                                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                                    : 'bg-gray-950 border-border hover:border-blue-500/50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${factionForm.visibility === opt.id ? 'text-blue-400' : 'text-muted'}`}>
                                                    {opt.name}
                                                </span>
                                                <input 
                                                    type="radio" 
                                                    name="visibility" 
                                                    value={opt.id}
                                                    checked={factionForm.visibility === opt.id}
                                                    onChange={e => setFactionForm({ ...factionForm, visibility: e.target.value })}
                                                    className="w-3.5 h-3.5 text-blue-600 bg-gray-900 border-gray-700 focus:ring-blue-500 transition cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-[9px] text-muted leading-relaxed italic">
                                                {opt.desc}
                                            </p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Section: Integrations */}
                            <div className="space-y-6 pt-4 border-t border-border/50">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Integrations & System Data</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">GTAW Faction ID</label>
                                        <input 
                                            value={faction.gtaw_faction_id || 'Not Linked'}
                                            disabled
                                            className="w-full bg-gray-950/50 border border-border p-3 rounded text-sm text-muted cursor-not-allowed font-mono"
                                        />
                                        <p className="text-[9px] text-muted mt-1 italic">Synchronization settings are managed by system administrators.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={savingDetails}
                                    className="flex items-center gap-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
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
                        className="flex gap-6"
                    >
                        {/* Roles Sidebar */}
                        <div className="w-64 flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 px-2 flex justify-between items-center">
                                Ranks / Roles
                                <button onClick={() => openRoleModal()} className="p-1 hover:text-blue-500 transition">
                                    <Plus size={14} />
                                </button>
                            </div>
                            {roles.map(role => {
                                const isProtected = ['Administrator', 'Global Moderator', 'User', 'Public'].includes(role.name);
                                const isPublicDisabled = role.name === 'Public' && ['private', 'invite-only', 'joinable'].includes(factionForm.visibility);
                                
                                return (
                                    <div 
                                        key={role.id}
                                        className={`group relative p-3 rounded-lg transition-all border cursor-pointer ${
                                            selectedRole?.id === role.id 
                                                ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                                                : 'bg-card border-border text-muted hover:border-blue-500/50'
                                        }`}
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-sm pr-12">{role.name}</div>
                                            {isPublicDisabled && (
                                                <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded border border-red-500/20 font-black uppercase tracking-tighter">Disabled</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] opacity-60">Weight: {role.weight}</div>
                                        
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openRoleModal(role); }}
                                                className="p-1 hover:text-white transition"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            {!isProtected && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteRole(role); }}
                                                    className="p-1 hover:text-red-500 transition"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Permissions Content */}
                        {selectedRole ? (
                            <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col min-h-[500px]">
                                <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg uppercase tracking-tight">{selectedRole.name} <span className="text-muted text-sm font-normal ml-2">Permissions</span></h3>
                                        <p className="text-[11px] text-muted">Configure access levels for this specific rank.</p>
                                    </div>
                                    <button 
                                        onClick={savePermissions}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] uppercase tracking-widest transition disabled:opacity-50"
                                    >
                                        <Save size={14} />
                                        {saving ? 'Saving...' : 'Save Permissions'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto p-4 space-y-8">
                                    {Object.entries(config).map(([catKey, category]: [string, any]) => (
                                        <div key={catKey}>
                                            <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mb-4 border-b border-blue-500/20 pb-1">
                                                {category.name}
                                            </h4>
                                            <div className="space-y-2">
                                                {Object.entries(category.permissions).map(([permKey, perm]: [string, any]) => {
                                                    const currentVal = selectedRole.permissions.find((p: any) => p.permission_key === permKey)?.value || 'NO';
                                                    return (
                                                        <div key={permKey} className="flex items-center justify-between p-3 bg-gray-900/20 rounded border border-border/30 hover:bg-gray-900/40 transition">
                                                            <div className="max-w-[60%]">
                                                                <div className="text-sm font-bold text-text mb-0.5">{perm.name}</div>
                                                                <div className="text-[10.5px] text-muted leading-tight">{perm.description}</div>
                                                            </div>
                                                            <div className="flex gap-1 bg-gray-950 p-1 rounded border border-border">
                                                                {['YES', 'NO', 'NEVER'].map(val => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => handlePermissionChange(permKey, val)}
                                                                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-tighter rounded transition-all ${
                                                                            currentVal === val
                                                                                ? val === 'YES' ? 'bg-green-600 text-white' : val === 'NEVER' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                                                                                : 'text-muted hover:text-text hover:bg-white/5'
                                                                        }`}
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
                            <div className="flex-1 flex items-center justify-center text-muted uppercase text-xs tracking-widest bg-card border border-border border-dashed rounded-lg">
                                Select a rank to manage permissions
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Role Create/Edit Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[600]">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full border border-gray-700">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            {editingRole ? <Edit2 size={18} /> : <Plus size={18} />}
                            {editingRole ? 'Edit Rank' : 'Create New Rank'}
                        </h2>
                        <form onSubmit={handleRoleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Rank Name</label>
                                <input 
                                    value={roleForm.name} 
                                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} 
                                    className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-sm focus:border-blue-500 outline-none transition" 
                                    required 
                                    placeholder="e.g. Commander"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Weight / Order</label>
                                <input 
                                    type="number" 
                                    value={roleForm.weight} 
                                    onChange={e => setRoleForm({ ...roleForm, weight: parseInt(e.target.value) })} 
                                    className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-sm focus:border-blue-500 outline-none transition" 
                                    required 
                                />
                                <p className="text-[9px] text-muted mt-1 italic">Higher weight means higher hierarchy.</p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded font-bold text-xs uppercase tracking-widest">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-bold text-xs uppercase tracking-widest">Save Rank</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Administration;
