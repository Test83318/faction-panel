import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from './Loading';
import QuickSearchSettings from './QuickSearchSettings';
import { useConfirm } from './ConfirmationProvider';
import { Shield, Settings, Trash2, Edit2, Check, X, Plus, Save, Info, Key, Users, UserMinus, ShieldAlert, Crown, UserCog, Copy, Link as LinkIcon, Clock, Upload, LayoutGrid, Eye, Moon, Sun, Search } from 'lucide-react';

const Administration: React.FC<{ faction: any; user: any; permissions: string[] }> = ({ faction, user, permissions }) => {
    const hasPerm = (perm: string) => user?.is_superadmin || permissions.includes(perm);
    const confirm = useConfirm();
    const userHighestWeight = user?.is_superadmin || faction.faction_leader === user?.id 
        ? 999999 
        : Math.max(0, ...(faction.user_roles || user?.roles || [])
            .filter((r: any) => r.faction_id === faction.id)
            .map((r: any) => r.weight || 0));

    const availableTabs = [
        { id: 'details', perm: 'view_faction_details' },
        { id: 'roles', perm: 'view_permissions' },
        { id: 'users', perm: 'view_users' },
        { id: 'invites', perm: 'manage_invites' },
        { id: 'integrations', perm: 'manage_integrations' },
        { id: 'quick_search', perm: 'modify_global_quick_search' }
    ].filter(tab => hasPerm(tab.perm));

    const [activeTab, setActiveTab] = useState(availableTabs.length > 0 ? availableTabs[0].id : '');
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
    const [deleting, setDeleting] = useState(false);
    const [inviteForm, setInviteForm] = useState({ duration: '24h', max_uses: 0 });

    // Integrations State
    const [availableFactions, setAvailableFactions] = useState<any[]>([]);
    const [fetchingFactions, setFetchingFactions] = useState(false);
    const [integrating, setIntegrating] = useState(false);
    const [selectedGtawFactionId, setSelectedGtawFactionId] = useState<string>('');
    const [showIntegrationWarning, setShowIntegrationWarning] = useState(false);

    // Faction Details Form
    const [factionForm, setFactionForm] = useState({ 
        name: faction.name, 
        description: faction.description || '',
        color: faction.color,
        image_url: faction.image_url || '',
        header_image_dark: faction.header_image_dark || '',
        header_image_light: faction.header_image_light || '',
        favicon: faction.favicon || '',
        header_link_to_faction: faction.header_link_to_faction || false,
        hide_panel_header: faction.hide_panel_header || false,
        custom_footer_text: faction.custom_footer_text || '',
        header_bg_color: faction.header_bg_color || '',
        header_gradient_enabled: faction.header_gradient_enabled || false,
        header_gradient_color: faction.header_gradient_color || '',
        header_gradient_direction: faction.header_gradient_direction || 'to-r',
        visibility: faction.visibility || 'private',
        access: faction.access || 'invite-only'
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
    const [roleForm, setRoleForm] = useState({ name: '', weight: 0, color: '#3b82f6', type: 'secondary' });
    const [savingRank, setSavingRank] = useState(false);

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

    const fetchAvailableFactions = async () => {
        setFetchingFactions(true);
        try {
            const res = await api.get(`/factions/${faction.shortname}/integrations/gtaw/available`);
            setAvailableFactions(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to fetch available factions from GTA:W');
        } finally {
            setFetchingFactions(false);
        }
    };

    const handleSetupIntegration = async () => {
        if (!selectedGtawFactionId) return;
        setIntegrating(true);
        try {
            await api.post(`/factions/${faction.shortname}/integrations/gtaw/setup`, {
                gtaw_faction_id: selectedGtawFactionId
            });
            toast.success('Integration setup successful! Performing initial sync...');
            await api.post(`/factions/${faction.shortname}/integrations/gtaw/sync`);
            toast.success('Initial sync complete!');
            window.location.reload();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to setup integration');
        } finally {
            setIntegrating(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [faction.shortname]);

    useEffect(() => {
        if (activeTab === 'users' && members.length === 0) fetchMembers();
        if (activeTab === 'invites' && invites.length === 0) fetchInvites();
        if (activeTab === 'integrations' && availableFactions.length === 0 && !faction.gtaw_faction_id) {
            fetchAvailableFactions();
        }
    }, [activeTab]);

    const handleRemoveMember = async (targetUser: any) => {
        const confirmed = await confirm({
            title: 'Remove Member',
            message: `Are you sure you want to remove "${targetUser.username}"? They will lose all access to this faction.`,
            confirmText: 'Remove Member',
            variant: 'danger'
        });

        if (!confirmed) return;
        
        setDeleting(true);
        const loadToast = toast.loading('Removing member...');
        try {
            await api.delete(`/factions/${faction.id}/users/${targetUser.id}`);
            setMembers(members.filter(m => m.id !== targetUser.id));
            toast.success('Member removed successfully', { id: loadToast });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to remove member', { id: loadToast });
        } finally {
            setDeleting(false);
        }
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
        const confirmed = await confirm({
            title: 'Delete Invite',
            message: 'Are you sure you want to delete this invite? The code will no longer work.',
            confirmText: 'Delete Invite',
            variant: 'danger'
        });

        if (!confirmed) return;
        
        setDeleting(true);
        const loadToast = toast.loading('Deleting invite...');
        try {
            await api.delete(`/invites/${id}`);
            setInvites(invites.filter(i => i.id !== id));
            toast.success('Invite deleted', { id: loadToast });
        } catch (err) {
            toast.error('Failed to delete invite', { id: loadToast });
        } finally {
            setDeleting(false);
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'header_dark' | 'header_light' | 'favicon') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const loadToast = toast.loading(`Uploading ${type.replace('_', ' ')}...`);
        try {
            const res = await api.post(`/factions/${faction.shortname}/upload-branding`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const url = res.data.url;
            setFactionForm(prev => {
                const updated = { ...prev };
                if (type === 'icon') updated.image_url = url;
                else if (type === 'header_dark') updated.header_image_dark = url;
                else if (type === 'header_light') updated.header_image_light = url;
                else if (type === 'favicon') updated.favicon = url;
                return updated;
            });

            toast.success(`${type.replace('_', ' ')} uploaded and saved successfully`, { id: loadToast });
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to upload ${type.replace('_', ' ')}`, { id: loadToast });
        }
    };

    const handleRemoveBranding = async (type: 'icon' | 'header_dark' | 'header_light' | 'favicon') => {
        const confirmed = await confirm({
            title: `Remove ${type.replace('_', ' ')}`,
            message: `Are you sure you want to remove the ${type.replace('_', ' ')}?`,
            confirmText: 'Remove Branding',
            variant: 'danger'
        });

        if (!confirmed) return;

        const loadToast = toast.loading(`Removing ${type.replace('_', ' ')}...`);
        try {
            const payload: any = {};
            if (type === 'icon') payload.image_url = null;
            else if (type === 'header_dark') payload.header_image_dark = null;
            else if (type === 'header_light') payload.header_image_light = null;
            else if (type === 'favicon') payload.favicon = null;

            await api.put(`/factions/${faction.id}`, payload);

            setFactionForm(prev => ({
                ...prev,
                ...(type === 'icon' ? { image_url: '' } : {}),
                ...(type === 'header_dark' ? { header_image_dark: '' } : {}),
                ...(type === 'header_light' ? { header_image_light: '' } : {}),
                ...(type === 'favicon' ? { favicon: '' } : {})
            }));

            toast.success(`${type.replace('_', ' ')} removed successfully`, { id: loadToast });
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to remove ${type.replace('_', ' ')}`, { id: loadToast });
        }
    };

    const [viewImage, setViewImage] = useState<string | null>(null);

    const handleFactionUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingDetails(true);
        try {
            await api.put(`/factions/${faction.id}`, factionForm);
            toast.success('Faction details updated successfully!');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error('Failed to update faction details');
        } finally {
            setSavingDetails(false);
        }
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (savingRank) return;

        if (roleForm.weight >= userHighestWeight) {
            toast.error('Cannot set weight equal to or higher than your own.');
            return;
        }

        setSavingRank(true);
        const loadToast = toast.loading(editingRole ? 'Updating rank...' : 'Creating rank...');
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, roleForm);
                toast.success('Rank updated successfully', { id: loadToast });
            } else {
                await api.post(`/factions/${faction.shortname}/roles`, roleForm);
                toast.success('Rank created successfully', { id: loadToast });
            }
            setShowRoleModal(false);
            setEditingRole(null);
            fetchData();
        } catch (err) {
            toast.error('Failed to save rank', { id: loadToast });
        } finally {
            setSavingRank(false);
        }
    };

    const deleteRole = async (role: any) => {
        const confirmed = await confirm({
            title: 'Delete Rank',
            message: `Are you sure you want to delete the rank "${role.name}"? This action cannot be undone.`,
            confirmText: 'Delete Rank',
            variant: 'danger'
        });

        if (!confirmed) return;

        setDeleting(true);
        const loadToast = toast.loading('Deleting rank...');
        try {
            await api.delete(`/roles/${role.id}`);
            if (selectedRole?.id === role.id) setSelectedRole(null);
            fetchData();
            toast.success('Rank deleted successfully', { id: loadToast });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete rank', { id: loadToast });
        } finally {
            setDeleting(false);
        }
    };

    const openRoleModal = (role: any = null) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({ name: role.name, weight: role.weight, color: role.color, type: role.type || 'secondary' });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', weight: roles.length > 0 ? Math.min(...roles.map(r => r.weight)) - 1 : 1, color: '#3b82f6', type: 'secondary' });
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

            <div className="flex gap-1 border-b border-border mb-2 relative z-50 overflow-x-auto scrollbar-none">
                {availableTabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-accent' : 'text-muted hover:text-text'}`}
                    >
                        <div className="flex items-center gap-2">
                            {tab.id === 'details' && <Info size={14} />}
                            {tab.id === 'roles' && <Key size={14} />}
                            {tab.id === 'users' && <Users size={14} />}
                            {tab.id === 'invites' && <LinkIcon size={14} />}
                            {tab.id === 'integrations' && <ShieldAlert size={14} />}
                            {tab.id === 'quick_search' && <Search size={14} />}
                            {tab.id === 'details' && 'Faction Details'}
                            {tab.id === 'roles' && 'Ranks & Permissions'}
                            {tab.id === 'users' && 'Users'}
                            {tab.id === 'invites' && 'Invites'}
                            {tab.id === 'integrations' && 'Integrations'}
                            {tab.id === 'quick_search' && 'Quick Search'}
                        </div>
                        {activeTab === tab.id && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                    <motion.div key="details" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="bg-card border border-border rounded-lg p-6 w-full">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Info size={18} className="text-accent" /> General Information</h3>
                        <form onSubmit={handleFactionUpdate} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-12">
                                    <div className="space-y-6">
                                        <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Identity & Branding</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Name</label>
                                                <input value={factionForm.name} onChange={e => setFactionForm({ ...factionForm, name: e.target.value })} className="w-full bg-surface border border-border p-3 rounded text-sm focus:border-accent outline-none transition text-text disabled:opacity-50 disabled:cursor-not-allowed" required disabled={!hasPerm('modify_faction_details')} />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Short Name (URL Slug)</label>
                                                <input value={faction.shortname} disabled className="w-full bg-surface/50 border border-border p-3 rounded text-sm text-muted cursor-not-allowed" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Faction Color</label>
                                                <div className="flex gap-3">
                                                    <input type="color" value={factionForm.color} onChange={e => setFactionForm({ ...factionForm, color: e.target.value })} className="w-12 h-11 bg-surface border border-border rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasPerm('modify_faction_details')} />
                                                    <input value={factionForm.color} onChange={e => setFactionForm({ ...factionForm, color: e.target.value })} className="flex-1 bg-surface border border-border p-3 rounded text-sm font-mono focus:border-accent outline-none transition text-text disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasPerm('modify_faction_details')} />
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Description</label>
                                                <textarea value={factionForm.description} onChange={e => setFactionForm({ ...factionForm, description: e.target.value })} rows={4} className="w-full bg-surface border border-border p-3 rounded text-sm focus:border-accent outline-none transition resize-none text-text disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Tell people about your organization..." disabled={!hasPerm('modify_faction_details')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Visibility Settings</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {['public', 'hidden', 'private'].map(id => (
                                                <label key={id} className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer group ${factionForm.visibility === id ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' : 'bg-surface border-border hover:border-accent/50'} ${!hasPerm('modify_faction_details') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${factionForm.visibility === id ? 'text-accent' : 'text-muted'}`}>{id.charAt(0).toUpperCase() + id.slice(1)}</span>
                                                        <input type="radio" name="visibility" value={id} checked={factionForm.visibility === id} onChange={e => setFactionForm({ ...factionForm, visibility: e.target.value })} className="w-3.5 h-3.5 text-accent bg-bg border-border focus:ring-accent transition cursor-pointer disabled:cursor-not-allowed" disabled={!hasPerm('modify_faction_details')} />
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Access Control</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { id: 'joinable', name: 'Public (Open)', desc: 'Anyone can join freely' },
                                                { id: 'invite-only', name: 'Invite Only', desc: 'Requires an invite link' },
                                                { id: 'private', name: 'Private', desc: 'Manual addition only' }
                                            ].map(opt => (
                                                <label key={opt.id} className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer group ${factionForm.access === opt.id ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' : 'bg-surface border-border hover:border-accent/50'} ${!hasPerm('modify_faction_details') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${factionForm.access === opt.id ? 'text-accent' : 'text-muted'}`}>{opt.name}</span>
                                                        <input type="radio" name="access" value={opt.id} checked={factionForm.access === opt.id} onChange={e => setFactionForm({ ...factionForm, access: e.target.value })} className="w-3.5 h-3.5 text-accent bg-bg border-border focus:ring-accent transition cursor-pointer disabled:cursor-not-allowed" disabled={!hasPerm('modify_faction_details')} />
                                                    </div>
                                                    <p className="text-[9px] text-muted font-bold uppercase tracking-tight leading-none">{opt.desc}</p>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-12">
                                    <div className="space-y-6">
                                        <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 border-b border-border pb-1">Branding & Visuals</div>
                                        
                                        <div className="relative group">
                                            {!faction.allow_branding && (
                                                <div className="absolute inset-0 z-10 bg-surface/40 backdrop-blur-[4px] rounded-xl flex items-center justify-center border border-dashed border-border/50">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Key size={20} className="text-muted" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Option Restricted</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className={`grid grid-cols-1 sm:grid-cols-4 gap-4 ${!faction.allow_branding ? 'pointer-events-none select-none' : ''}`}>
                                                {['header_dark', 'header_light', 'favicon', 'icon'].map(type => {
                                                    // Icon is always allowed, headers/favicon are restricted
                                                    const isRestricted = !faction.allow_branding && type !== 'icon';
                                                    return (
                                                        <div key={type} className={`space-y-2 ${isRestricted ? 'opacity-20 grayscale' : ''}`}>
                                                            <label className="block text-[10px] text-muted font-bold uppercase tracking-widest px-1 flex justify-between">
                                                                {type.replace('_', ' ')}
                                                                {factionForm[type as keyof typeof factionForm] && (
                                                                    <button type="button" onClick={() => handleRemoveBranding(type as any)} className="text-[8px] text-danger hover:underline">Remove</button>
                                                                )}
                                                            </label>
                                                            <div className="relative aspect-square bg-surface border border-border rounded-xl overflow-hidden flex items-center justify-center p-4 transition-all hover:border-accent/50 group/upload">
                                                                {factionForm[type as keyof typeof factionForm] ? (
                                                                    <img 
                                                                        src={factionForm[type as keyof typeof factionForm] as string} 
                                                                        alt={type} 
                                                                        className="w-full h-full object-contain drop-shadow-md" 
                                                                    />
                                                                ) : (
                                                                    <Upload size={18} className="text-muted opacity-20" />
                                                                )}
                                                                
                                                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/upload:opacity-100 transition-opacity cursor-pointer">
                                                                    <Upload size={20} className="text-white" />
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, type as any)} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="relative group">
                                                {!faction.allow_branding && (
                                                    <div className="absolute inset-0 z-10 bg-surface/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center border border-dashed border-border/50">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Option Restricted</span>
                                                    </div>
                                                )}
                                                <div className="space-y-4">
                                                    <div className={`p-4 bg-surface border border-border rounded-xl flex items-center justify-between ${!faction.allow_branding ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[10px] font-black uppercase tracking-widest">Hide "Faction Panel" Logo</label>
                                                            <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Only show your faction logo in the header</p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setFactionForm({...factionForm, hide_panel_header: !factionForm.hide_panel_header})}
                                                            className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${factionForm.hide_panel_header ? 'bg-accent' : 'bg-border'}`}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${factionForm.hide_panel_header ? 'translate-x-4' : ''}`} />
                                                        </button>
                                                    </div>

                                                    <div className={`p-6 bg-surface border border-border rounded-xl space-y-6 ${!faction.allow_branding ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-0.5">
                                                                <label className="text-[10px] font-black uppercase tracking-widest">Header Background</label>
                                                                <p className="text-[9px] text-muted uppercase font-bold tracking-tight">Customize the top navigation bar appearance</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setFactionForm({...factionForm, header_gradient_enabled: false})}
                                                                    className={`px-3 py-1.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${!factionForm.header_gradient_enabled ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-bg border-border text-muted hover:border-accent/50'}`}
                                                                >Solid Color</button>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setFactionForm({...factionForm, header_gradient_enabled: true})}
                                                                    className={`px-3 py-1.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${factionForm.header_gradient_enabled ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-bg border-border text-muted hover:border-accent/50'}`}
                                                                >Gradient</button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                            <div className="space-y-2">
                                                                <label className="block text-[9px] text-muted font-bold uppercase tracking-widest px-1">{factionForm.header_gradient_enabled ? 'Start Color' : 'Background Color'}</label>
                                                                <div className="flex gap-2">
                                                                    <input type="color" value={factionForm.header_bg_color || '#1a1a1a'} onChange={e => setFactionForm({...factionForm, header_bg_color: e.target.value})} className="w-10 h-10 bg-bg border border-border rounded p-1 cursor-pointer" />
                                                                    <input value={factionForm.header_bg_color || ''} onChange={e => setFactionForm({...factionForm, header_bg_color: e.target.value})} className="flex-1 bg-bg border border-border p-2.5 rounded text-[10px] font-mono focus:border-accent outline-none transition" placeholder="#000000" />
                                                                </div>
                                                            </div>
                                                            {factionForm.header_gradient_enabled && (
                                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    <label className="block text-[9px] text-muted font-bold uppercase tracking-widest px-1">End Color</label>
                                                                    <div className="flex gap-2">
                                                                        <input type="color" value={factionForm.header_gradient_color || '#1a1a1a'} onChange={e => setFactionForm({...factionForm, header_gradient_color: e.target.value})} className="w-10 h-10 bg-bg border border-border rounded p-1 cursor-pointer" />
                                                                        <input value={factionForm.header_gradient_color || ''} onChange={e => setFactionForm({...factionForm, header_gradient_color: e.target.value})} className="flex-1 bg-bg border border-border p-2.5 rounded text-[10px] font-mono focus:border-accent outline-none transition" placeholder="#000000" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {factionForm.header_gradient_enabled && (
                                                            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <label className="block text-[9px] text-muted font-bold uppercase tracking-widest px-1">Gradient Direction</label>
                                                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                                                    {['to-r', 'to-l', 'to-t', 'to-b', 'to-tr', 'to-tl', 'to-br', 'to-bl'].map(dir => (
                                                                        <button 
                                                                            key={dir} 
                                                                            type="button" 
                                                                            onClick={() => setFactionForm({...factionForm, header_gradient_direction: dir})}
                                                                            className={`py-2 rounded border text-[8px] font-black uppercase transition-all ${factionForm.header_gradient_direction === dir ? 'bg-accent/10 border-accent text-accent' : 'bg-bg border-border text-muted hover:border-accent/50'}`}
                                                                        >
                                                                            {dir.replace('to-', '')}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                {!faction.allow_branding && (
                                                    <div className="absolute inset-0 z-10 bg-surface/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center border border-dashed border-border/50">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Option Restricted</span>
                                                    </div>
                                                )}
                                                <div className={`space-y-2 ${!faction.allow_branding ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
                                                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest px-1">Custom Footer Text</label>
                                                    <input 
                                                        value={factionForm.custom_footer_text} 
                                                        onChange={e => setFactionForm({ ...factionForm, custom_footer_text: e.target.value })} 
                                                        className="w-full bg-surface border border-border p-4 rounded-xl text-sm focus:border-accent outline-none transition text-text" 
                                                        placeholder="e.g. Los Santos Sheriff's Department &copy; 2026"
                                                        disabled={!hasPerm('modify_faction_details')}
                                                    />
                                                    <p className="text-[8px] text-muted uppercase font-bold tracking-widest px-1 italic">Replaces the default version footer in the sidebar.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {hasPerm('modify_faction_details') && (
                                <div className="pt-6 border-t border-border flex justify-end">
                                    <button type="submit" disabled={savingDetails} className="flex items-center gap-2 px-10 py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50 shadow-lg shadow-accent/20">
                                        <Save size={16} /> {savingDetails ? 'Saving Changes...' : 'Update Faction Settings'}
                                    </button>
                                </div>
                            )}
                        </form>

                        {(faction.faction_leader === user?.id || user?.is_superadmin) && (
                            <div className="mt-12 pt-8 border-t border-danger/20">
                                <div className="bg-danger/5 border border-danger/20 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <h4 className="text-danger font-black uppercase text-sm tracking-tight flex items-center gap-2">
                                            <ShieldAlert size={18} /> Danger Zone
                                        </h4>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed max-w-md">
                                            Deleting the faction will permanently remove all data, including rosters, records, and memberships. <br />
                                            <span className="text-danger opacity-80">This action is irreversible.</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const confirmed = await confirm({
                                                title: 'Delete Faction',
                                                message: `Are you sure you want to permanently delete the faction "${faction.name}"? All data will be lost forever.`,
                                                confirmText: 'Delete Permanently',
                                                variant: 'danger'
                                            });

                                            if (confirmed) {
                                                const finalConfirm = await confirm({
                                                    title: 'Final Confirmation',
                                                    message: `Deleting this faction will remove all personnel data, records, and rosters. This cannot be undone.`,
                                                    confirmText: 'I understand, delete it',
                                                    variant: 'danger',
                                                    requiredInput: faction.name
                                                });

                                                if (finalConfirm) {
                                                    const loadToast = toast.loading('Deleting faction...');
                                                    try {
                                                        await api.delete(`/factions/${faction.id}`);
                                                        toast.success('Faction deleted successfully', { id: loadToast });
                                                        window.location.href = '/';
                                                    } catch (err: any) {
                                                        toast.error(err.response?.data?.message || 'Failed to delete faction', { id: loadToast });
                                                    }
                                                }
                                            }
                                        }}
                                        className="px-6 py-3 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-danger/5"
                                    >
                                        Delete Faction
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'roles' && (
                    <motion.div key="roles" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col lg:flex-row gap-6">
                        <div className="w-full lg:w-72 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2 px-2 flex items-center gap-2"><Shield size={12} /> System Ranks</div>
                                {roles.filter(r => ['Administrator', 'User', 'Public'].includes(r.name)).sort((a, b) => (a.weight || 0) - (b.weight || 0)).map(role => (
                                    <div key={role.id} className={`p-3 rounded-lg transition-all border cursor-pointer ${selectedRole?.id === role.id ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted hover:border-accent/50'}`} onClick={() => setSelectedRole(role)}>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} /><div className="font-bold text-sm">{role.name}</div></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 px-2 flex justify-between items-center">Custom Ranks {hasPerm('create_ranks') && <button onClick={() => openRoleModal()} className="p-1 hover:text-accent transition"><Plus size={14} /></button>}</div>
                                {roles.filter(r => !['Administrator', 'User', 'Public'].includes(r.name)).map(role => (
                                    <div key={role.id} className={`group relative p-3 rounded-lg transition-all border cursor-pointer ${selectedRole?.id === role.id ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted hover:border-accent/50'}`} onClick={() => setSelectedRole(role)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                                            <div className="flex flex-col">
                                                <div className="font-bold text-sm leading-none mb-1">{role.name}</div>
                                                <div className="text-[7px] uppercase tracking-[0.2em] font-black opacity-50">{role.type}</div>
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {hasPerm('modify_ranks') && role.weight < userHighestWeight && <button onClick={(e) => { e.stopPropagation(); openRoleModal(role); }} className="p-1 hover:text-text"><Edit2 size={12} /></button>}
                                            {hasPerm('delete_ranks') && role.weight < userHighestWeight && <button onClick={(e) => { e.stopPropagation(); deleteRole(role); }} className="p-1 hover:text-danger"><Trash2 size={12} /></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {selectedRole && (
                            <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col min-h-[500px]">
                                <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                                    <div><h3 className="font-bold text-lg uppercase tracking-tight">{selectedRole.name} Permissions</h3></div>
                                    {selectedRole.name !== 'Administrator' && hasPerm('modify_permissions') && selectedRole.weight < userHighestWeight && (
                                        <button onClick={savePermissions} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-[10px] uppercase tracking-widest transition"><Save size={14} /> {saving ? 'Saving...' : 'Save Permissions'}</button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-8">
                                    {config && Object.entries(config).map(([catKey, category]: [string, any]) => (
                                        <div key={catKey}>
                                            <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] mb-4 border-b border-accent/20 pb-1">{category.name}</h4>
                                            <div className="space-y-2">
                                                {Object.entries(category.permissions).map(([permKey, perm]: [string, any]) => {
                                                    const currentVal = selectedRole.name === 'Administrator' ? 'YES' : (selectedRole.permissions?.find((p: any) => p.permission_key === permKey)?.value || 'NO');
                                                    return (
                                                        <div key={permKey} className="flex items-center justify-between p-3 bg-surface rounded border border-border/50">
                                                            <div className="max-w-[60%]"><div className="text-sm font-bold text-text">{perm.name}</div><div className="text-[10.5px] text-muted">{perm.description}</div></div>
                                                            <div className="flex gap-1 bg-bg p-1 rounded border border-border">
                                                                {['YES', 'NO', 'NEVER'].map(val => (
                                                                    <button key={val} disabled={!hasPerm('modify_permissions') || selectedRole.name === 'Administrator'} onClick={() => handlePermissionChange(permKey, val)} className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${currentVal === val ? 'bg-accent text-white' : 'text-muted hover:text-text'} disabled:opacity-50 disabled:cursor-not-allowed`}>{val}</button>
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
                        )}
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div key="users" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                            <div><h3 className="font-bold text-lg flex items-center gap-2 text-text"><Users size={18} className="text-accent" /> Faction Members</h3></div>
                        </div>
                        <div className="p-4 overflow-auto">
                            {fetchingMembers ? <Loading message="Fetching Members..." fullScreen={false} /> : (
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="border-b border-border"><th className="py-3 px-4 text-[10px] font-bold text-muted uppercase">User</th><th className="py-3 px-4 text-[10px] font-bold text-muted uppercase text-right">Actions</th></tr></thead>
                                    <tbody>
                                        {members.map((member: any) => (
                                            <tr key={member.id} className="border-b border-border/50 hover:bg-surface transition-colors group">
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-text">{member.username}</span>
                                                            {faction.faction_leader === member.id && (
                                                                <Crown size={14} className="text-yellow-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {member.roles?.filter((r: any) => r.faction_id === faction.id).sort((a: any, b: any) => b.weight - a.weight).map((role: any) => (
                                                                <span 
                                                                    key={role.id} 
                                                                    className={`px-1.5 py-0.5 rounded-[4px] border font-black text-[7px] uppercase tracking-widest ${role.type === 'primary' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-surface border-border text-muted'}`}
                                                                    style={role.type === 'primary' ? {} : { borderColor: `${role.color}40`, color: role.color }}
                                                                >
                                                                    {role.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    {faction.faction_leader !== member.id && userHighestWeight > Math.max(0, ...member.roles.map((r: any) => r.weight || 0)) && (
                                                        <div className="flex justify-end gap-2">
                                                            {hasPerm('change_ranks') && <button onClick={() => openRankModal(member)} className="p-1.5 hover:text-accent rounded"><UserCog size={16} /></button>}
                                                            {hasPerm('remove_users') && <button onClick={() => handleRemoveMember(member)} className="p-1.5 hover:text-danger rounded"><UserMinus size={16} /></button>}
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
                    <motion.div key="invites" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-text"><Plus size={18} className="text-accent" /> Create Invite</h3>
                                <form onSubmit={handleCreateInvite} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Duration</label>
                                        <select 
                                            value={inviteForm.duration} 
                                            onChange={e => setInviteForm({ ...inviteForm, duration: e.target.value })}
                                            className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition"
                                        >
                                            <option value="1h">1 Hour</option>
                                            <option value="3h">3 Hours</option>
                                            <option value="6h">6 Hours</option>
                                            <option value="12h">12 Hours</option>
                                            <option value="24h">24 Hours</option>
                                            <option value="48h">48 Hours</option>
                                            <option value="7d">7 Days</option>
                                            <option value="30d">30 Days</option>
                                            <option value="never">Never Expires</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Max Uses (0 for unlimited)</label>
                                        <input 
                                            type="number"
                                            value={inviteForm.max_uses} 
                                            onChange={e => setInviteForm({ ...inviteForm, max_uses: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition"
                                            min="0"
                                        />
                                    </div>
                                    <button type="submit" disabled={creatingInvite} className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
                                        <LinkIcon size={14} /> {creatingInvite ? 'Generating...' : 'Generate Invite Link'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <div className="p-4 border-b border-border bg-border/10 flex justify-between items-center">
                                    <h3 className="font-bold text-lg flex items-center gap-2 text-text"><LinkIcon size={18} className="text-accent" /> Active Invites</h3>
                                    <button onClick={fetchInvites} disabled={fetchingInvites} className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-accent transition">Refresh</button>
                                </div>
                                <div className="p-4">
                                    {fetchingInvites ? (
                                        <Loading message="Fetching Invites..." fullScreen={false} />
                                    ) : invites.length === 0 ? (
                                        <div className="py-12 text-center space-y-2">
                                            <div className="text-muted opacity-20 flex justify-center"><LinkIcon size={48} /></div>
                                            <p className="text-muted text-[10px] font-bold uppercase tracking-widest">No active invite links found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {invites.map((invite: any) => (
                                                <div key={invite.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-accent/30 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                                                            <LinkIcon size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono font-bold text-text text-sm">{invite.code}</span>
                                                                <button onClick={() => copyInviteLink(invite.code)} className="p-1 text-muted hover:text-accent transition-colors"><Copy size={12} /></button>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-tight text-muted">
                                                                <span className="flex items-center gap-1"><Users size={10} /> {invite.uses} / {invite.max_uses || '∞'} Uses</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {invite.expires_at ? `Expires ${new Date(invite.expires_at).toLocaleDateString()}` : 'Never Expires'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button 
                                                            onClick={() => handleDeleteInvite(invite.id)}
                                                            className="p-2 bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/20 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Delete Invite"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'integrations' && (
                    <motion.div key="integrations" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-card border border-border rounded-lg p-8 relative overflow-hidden">
                        <div className={`flex flex-col items-center text-center max-w-2xl mx-auto space-y-8 ${!user.gtaw_linked ? 'blur-md pointer-events-none select-none opacity-20' : ''}`}>
                            <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center text-accent"><LinkIcon size={40} /></div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">GTA World Integration</h3>
                                <p className="text-muted text-sm uppercase tracking-widest font-bold">Synchronize your faction roster directly from GTA World.</p>
                            </div>
                            {faction.gtaw_faction_id ? (
                                <div className="w-full bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-4">
                                    <div className="flex items-center justify-center gap-3 text-green-500"><Check size={24} /> <span className="text-sm font-black uppercase tracking-widest">Integration Active</span></div>
                                    <p className="text-xs text-muted font-bold uppercase tracking-widest leading-relaxed">Linked with GTA:W Faction ID: <span className="text-text font-black">{faction.gtaw_faction_id}</span>.</p>
                                </div>
                            ) : (
                                <div className="w-full space-y-6">
                                    {integrating ? <Loading message="Setting up integration..." fullScreen={false} /> : (
                                        <>
                                            <div className="space-y-4">
                                                <select value={selectedGtawFactionId} onChange={e => setSelectedGtawFactionId(e.target.value)} className="w-full bg-surface border border-border p-4 rounded-xl text-sm text-text focus:border-accent outline-none transition">
                                                    <option value="">Select a faction where you are rank 15+</option>
                                                    {availableFactions.map(f => <option key={f.id} value={f.id}>{f.name} (ID: {f.id})</option>)}
                                                </select>
                                                {fetchingFactions && <p className="text-[10px] text-accent mt-2 animate-pulse uppercase font-black tracking-widest text-center">Fetching available factions...</p>}
                                                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-4">
                                                    <ShieldAlert size={20} className="text-danger shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed text-left">Once integrated, this action <span className="text-danger">cannot be undone</span>.</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowIntegrationWarning(true)} disabled={!selectedGtawFactionId || integrating} className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition shadow-xl shadow-accent/20 disabled:opacity-30">Begin Integration</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {!user.gtaw_linked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 bg-card/20 backdrop-blur-[2px]">
                                <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6 shadow-2xl shadow-accent/20 border border-accent/30">
                                    <ShieldAlert size={32} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Account Not Linked</h3>
                                <p className="text-xs text-muted font-bold uppercase tracking-widest leading-relaxed text-center max-w-xs">
                                    You must be logged in via GTA World to manage integration settings.
                                </p>
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem('access_token');
                                        window.location.href = '/login';
                                    }}
                                    className="mt-8 px-8 py-3 bg-accent text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition shadow-lg shadow-accent/20 hover:scale-105"
                                >
                                    Relog with GTA:W
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'quick_search' && (
                    <motion.div key="quick_search" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full">
                        <QuickSearchSettings faction={faction} />
                    </motion.div>
                )}
            </AnimatePresence>

            {showIntegrationWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[700]">
                    <div className="bg-card p-8 rounded-2xl max-w-md w-full border border-border shadow-2xl space-y-6">
                        <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center text-danger mx-auto"><ShieldAlert size={32} /></div>
                        <div className="text-center"><h2 className="text-xl font-black uppercase tracking-tight mb-2">Final Confirmation</h2><p className="text-xs text-muted font-bold uppercase tracking-widest leading-relaxed">Link with GTA:W Faction ID <span className="text-text font-black">{selectedGtawFactionId}</span>?</p></div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowIntegrationWarning(false)} className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded-xl font-black text-[10px] uppercase tracking-widest transition">Cancel</button>
                            <button onClick={() => { setShowIntegrationWarning(false); handleSetupIntegration(); }} className="flex-1 px-4 py-3 bg-danger text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition">Confirm & Link</button>
                        </div>
                    </div>
                </div>
            )}

            {showRoleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
                    <div className="bg-card p-6 rounded-lg max-w-sm w-full border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-text">{editingRole ? 'Edit Rank' : 'Create New Rank'}</h2>
                        <form onSubmit={handleRoleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Rank Name</label>
                                <input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" required placeholder="Rank Name" />
                            </div>

                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Rank Weight (Hierarchy)</label>
                                <input 
                                    type="number" 
                                    value={roleForm.weight} 
                                    onChange={e => setRoleForm({ ...roleForm, weight: parseInt(e.target.value) || 0 })} 
                                    className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" 
                                    required 
                                    placeholder="e.g. 100" 
                                />
                                <p className="mt-1 text-[8px] text-muted font-bold uppercase tracking-widest">
                                    Higher weight means higher authority. Your max: <span className="text-accent">{userHighestWeight === 999999 ? '∞' : userHighestWeight - 1}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Rank Color</label>
                                <div className="flex gap-3">
                                    <input type="color" value={roleForm.color} onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} className="w-12 h-11 bg-surface border border-border rounded p-1 cursor-pointer" />
                                    <input value={roleForm.color} onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} className="flex-1 bg-surface border border-border p-3 rounded text-sm font-mono focus:border-accent outline-none transition text-text" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">Rank Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setRoleForm({ ...roleForm, type: 'primary' })}
                                        className={`px-3 py-2 rounded border text-[10px] font-bold uppercase tracking-widest transition-all ${roleForm.type === 'primary' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-muted hover:border-accent/50'}`}
                                    >
                                        Primary
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setRoleForm({ ...roleForm, type: 'secondary' })}
                                        className={`px-3 py-2 rounded border text-[10px] font-bold uppercase tracking-widest transition-all ${roleForm.type === 'secondary' ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-border text-muted hover:border-accent/50'}`}
                                    >
                                        Secondary
                                    </button>
                                </div>
                                <p className="mt-2 text-[9px] text-muted font-bold uppercase tracking-tight leading-none italic">
                                    {roleForm.type === 'primary' 
                                        ? 'Primary ranks are the main rank of a user. Only one can be assigned.' 
                                        : 'Secondary ranks are for additional tags, permissions, or specialized roles.'}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                                <button type="submit" disabled={savingRank} className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">Save Rank</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRankModal && editingMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
                    <div className="bg-card p-8 rounded-2xl max-w-md w-full border border-border shadow-2xl text-text overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
                        <div className="mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight italic">Manage Ranks</h2>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Updating permissions for <span className="text-accent">{editingMember.username}</span></p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            <div className="space-y-3">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/60 px-1">Available Faction Ranks</div>
                                <div className="grid grid-cols-1 gap-2">
                                    {roles.filter(r => r.name !== 'Public').map(role => {
                                        const isSelected = memberRoleIds.includes(role.id);
                                        const isRestricted = role.weight >= userHighestWeight && !user.is_superadmin;
                                        
                                        return (
                                            <button 
                                                key={role.id}
                                                disabled={isRestricted}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setMemberRoleIds(memberRoleIds.filter(id => id !== role.id));
                                                    } else {
                                                        let newIds = [...memberRoleIds];
                                                        // If selecting a primary role, remove any other primary roles
                                                        if (role.type === 'primary') {
                                                            const otherPrimaryIds = roles.filter(r => r.type === 'primary' && r.id !== role.id).map(r => r.id);
                                                            newIds = newIds.filter(id => !otherPrimaryIds.includes(id));
                                                        }
                                                        setMemberRoleIds([...newIds, role.id]);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${
                                                    isSelected 
                                                        ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]' 
                                                        : 'bg-surface border-border hover:border-accent/30'
                                                } ${isRestricted ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: role.color }} />
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-accent' : 'text-text'}`}>{role.name}</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-[0.1em] opacity-60">
                                                            {role.type} • Weight: {role.weight}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected ? 'bg-accent border-accent text-white scale-110' : 'border-border bg-bg group-hover:border-accent/50'
                                                }`}>
                                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-4 bg-surface border border-border rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-muted uppercase font-black text-[9px] tracking-widest">
                                    <Info size={12} /> Rank Rules
                                </div>
                                <ul className="text-[9px] text-muted font-bold uppercase tracking-tight space-y-1 ml-4 list-disc italic">
                                    <li>Users can have exactly <span className="text-text">one primary rank</span>.</li>
                                    <li>Multiple secondary ranks can be assigned.</li>
                                    <li>You can only manage ranks with lower weight than your own.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 mt-2 border-t border-border">
                            <button 
                                type="button" 
                                onClick={() => setShowRankModal(false)} 
                                className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded-xl font-black text-[10px] uppercase tracking-widest transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveMemberRoles} 
                                disabled={savingMemberRoles} 
                                className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition shadow-lg shadow-accent/20 disabled:opacity-50"
                            >
                                {savingMemberRoles ? 'Saving...' : 'Update Ranks'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Administration;
