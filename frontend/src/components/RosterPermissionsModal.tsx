import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Plus, Trash2, Check, Info } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { Roster, RosterPermission, Group } from '../types';

interface RosterPermissionsModalProps {
    roster: Roster;
    shortname: string;
    onClose: () => void;
}

const AVAILABLE_PERMISSIONS = [
    { key: 'view_roster', name: 'View Roster', description: 'Basic visibility of this roster' },
    { key: 'modify_roster', name: 'Modify Roster', description: 'Edit name, color, and basic settings' },
    { key: 'edit_defined_fields', name: 'Edit Defined Fields', description: 'Update data in standard columns' },
    { key: 'edit_predefined', name: 'Edit Template', description: 'Modify predefined fields/dropdowns' },
    { key: 'add_sections', name: 'Add Sections', description: 'Create new sections and subsections' },
    { key: 'remove_sections', name: 'Remove Sections', description: 'Delete sections and their content' },
    { key: 'manage_columns', name: 'Manage Columns', description: 'Configure table columns and types' },
    { key: 'manage_layout', name: 'Manage Layout', description: 'Reorder sections and manage row organization' },
];

export const RosterPermissionsModal: React.FC<RosterPermissionsModalProps> = ({ roster, shortname, onClose }) => {
    const [permissions, setPermissions] = useState<RosterPermission[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddGroup, setShowAddGroup] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [permRes, groupRes] = await Promise.all([
                api.get(`/rosters/${roster.id}/permissions`),
                api.get(`/factions/${shortname}/groups`)
            ]);
            setPermissions(permRes.data);
            setGroups(groupRes.data);
        } catch (err) {
            toast.error('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [roster.id]);

    const handleTogglePermission = async (groupId: number | null, permKey: string) => {
        const entry = permissions.find(p => p.group_id === groupId);
        let newPerms: string[] = [];

        if (entry) {
            newPerms = entry.permissions.includes(permKey)
                ? entry.permissions.filter(p => p !== permKey)
                : [...entry.permissions, permKey];
        } else {
            newPerms = [permKey];
        }

        const loadToast = toast.loading('Updating permission...');
        try {
            const res = await api.put(`/rosters/${roster.id}/permissions`, {
                group_id: groupId,
                permissions: newPerms
            });
            
            setPermissions(prev => {
                const index = prev.findIndex(p => p.group_id === groupId);
                if (index > -1) {
                    const updated = [...prev];
                    updated[index] = res.data;
                    return updated;
                }
                return [...prev, res.data];
            });
            toast.success('Permission updated', { id: loadToast });
        } catch (err) {
            toast.error('Failed to update permission', { id: loadToast });
        }
    };

    const handleRemoveEntry = async (id: number) => {
        const loadToast = toast.loading('Removing entry...');
        try {
            await api.delete(`/rosters/${roster.id}/permissions/${id}`);
            setPermissions(prev => prev.filter(p => p.id !== id));
            toast.success('Permission entry removed', { id: loadToast });
        } catch (err) {
            toast.error('Failed to remove permission', { id: loadToast });
        }
    };

    const handleAddGroup = async (groupId: number | null) => {
        if (permissions.some(p => p.group_id === groupId)) {
            toast.error('This group already has a permission entry');
            return;
        }

        const loadToast = toast.loading('Adding group...');
        try {
            const res = await api.put(`/rosters/${roster.id}/permissions`, {
                group_id: groupId,
                permissions: ['view_roster'] // Default permission
            });
            setPermissions([...permissions, res.data]);
            setShowAddGroup(false);
            toast.success(groupId === null ? 'Public access added' : 'Group added', { id: loadToast });
        } catch (err) {
            toast.error('Failed to add group', { id: loadToast });
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
            <div className="bg-card p-12 rounded-2xl border border-border shadow-2xl flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Loading Permissions...</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
            <div className="bg-card rounded-2xl max-w-4xl w-full border border-border shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Shield className="text-accent" size={24} />
                            Roster Permissions: <span style={{ color: roster.color }}>{roster.name}</span>
                        </h2>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1 opacity-60">Manage who can view and modify this roster</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-4 items-start">
                        <Info className="text-accent shrink-0" size={20} />
                        <div className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            <p className="text-accent mb-1">Automatic Access:</p>
                            <p className="opacity-80">Global Roster Moderators and the Roster Creator always have full administrative access regardless of these settings.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">Permission Matrix</h3>
                            <button 
                                onClick={() => setShowAddGroup(!showAddGroup)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    showAddGroup ? 'bg-accent text-white' : 'bg-surface hover:bg-accent/10 text-muted hover:text-accent border border-border'
                                }`}
                            >
                                <Plus size={14} /> Add Group / Public
                            </button>
                        </div>

                        {showAddGroup && (
                            <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2">
                                {!permissions.some(p => p.group_id === null) && (
                                    <button 
                                        onClick={() => handleAddGroup(null)}
                                        className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:border-accent transition-all text-left group"
                                    >
                                        <Users size={16} className="text-muted group-hover:text-accent" />
                                        <div className="text-[10px] font-black uppercase tracking-widest">Everyone / Public</div>
                                    </button>
                                )}
                                {groups.filter(g => !permissions.some(p => p.group_id === g.id)).map(group => (
                                    <button 
                                        key={group.id}
                                        onClick={() => handleAddGroup(group.id)}
                                        className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg hover:border-accent transition-all text-left"
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: group.color }} />
                                        <div className="text-[10px] font-black uppercase tracking-widest truncate">{group.name}</div>
                                    </button>
                                ))}
                                {groups.length === 0 && !permissions.some(p => p.group_id === null) && (
                                     <div className="col-span-full text-center py-4 text-[10px] text-muted font-bold uppercase tracking-widest opacity-50">No more groups available to add</div>
                                )}
                            </div>
                        )}

                        <div className="overflow-x-auto border border-border rounded-xl">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-surface/50">
                                        <th className="text-left py-4 px-6 text-[9px] font-black uppercase tracking-widest text-muted border-b border-border">Target</th>
                                        {AVAILABLE_PERMISSIONS.map(p => (
                                            <th key={p.key} className="text-center py-4 px-2 text-[9px] font-black uppercase tracking-widest text-muted border-b border-border whitespace-nowrap group relative">
                                                <div className="cursor-help">{p.name}</div>
                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black text-white p-3 rounded-lg text-[9px] font-bold uppercase tracking-widest w-40 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 shadow-2xl border border-white/10 scale-95 group-hover:scale-100">
                                                    {p.description}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black" />
                                                </div>
                                            </th>
                                        ))}
                                        <th className="py-4 px-6 border-b border-border"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {permissions.map(entry => (
                                        <tr key={entry.id} className="hover:bg-surface/30 transition-colors">
                                            <td className="py-4 px-6 border-b border-border">
                                                <div className="flex items-center gap-3">
                                                    {entry.group_id === null ? (
                                                        <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted">
                                                            <Users size={18} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg" style={{ backgroundColor: entry.group?.color || 'var(--accent)', shadowColor: entry.group?.color }}>
                                                            {entry.group?.name[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-[11px] font-black uppercase tracking-tight">{entry.group_id === null ? 'Everyone / Public' : entry.group?.name}</div>
                                                        <div className="text-[8px] font-bold text-muted uppercase tracking-widest opacity-60">{entry.group_id === null ? 'All faction members' : 'Specific group members'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {AVAILABLE_PERMISSIONS.map(p => (
                                                <td key={p.key} className="py-4 px-2 border-b border-border text-center">
                                                    <button 
                                                        onClick={() => handleTogglePermission(entry.group_id, p.key)}
                                                        className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center mx-auto border-2 ${
                                                            entry.permissions.includes(p.key) 
                                                                ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                                                                : 'bg-transparent border-border text-transparent hover:border-accent'
                                                        }`}
                                                    >
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                </td>
                                            ))}
                                            <td className="py-4 px-6 border-b border-border text-right">
                                                <button 
                                                    onClick={() => handleRemoveEntry(entry.id)}
                                                    className="p-2.5 hover:bg-danger/10 text-muted hover:text-danger rounded-xl transition-colors"
                                                    title="Remove entry"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {permissions.length === 0 && (
                                        <tr>
                                            <td colSpan={AVAILABLE_PERMISSIONS.length + 2} className="py-20 text-center text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-30">
                                                No specific permissions defined
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 border-t border-border bg-surface/30 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition shadow-lg shadow-accent/20"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};
