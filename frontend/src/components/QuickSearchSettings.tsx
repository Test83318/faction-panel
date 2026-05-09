import React, { useState, useEffect } from 'react';
import { Search, Save, Info, Check, X, Database, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';
import { Faction, FactionRecordDatabase } from '../types';

interface QuickSearchSettingsProps {
    faction: Faction;
}

const QuickSearchSettings: React.FC<QuickSearchSettingsProps> = ({ faction }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [databases, setDatabases] = useState<FactionRecordDatabase[]>([]);
    
    const [settings, setSettings] = useState({
        enabled: faction.quick_search_enabled,
        database_id: faction.quick_search_settings?.database_id || null,
        column_id: faction.quick_search_settings?.column_id || '',
        exact_match_only: faction.quick_search_settings?.exact_match_only ?? false
    });

    useEffect(() => {
        const fetchDatabases = async () => {
            try {
                const res = await api.get(`/factions/${faction.shortname}/records`);
                setDatabases(res.data);
            } catch (err) {
                toast.error('Failed to load databases');
            } finally {
                setLoading(false);
            }
        };
        fetchDatabases();
    }, [faction.shortname]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/factions/${faction.shortname}/quick-search/settings`, settings);
            toast.success('Quick search settings updated!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const selectedDb = databases.find(db => db.id === settings.database_id);

    if (loading) return <Loading message="Loading search settings..." fullScreen={false} />;

    return (
        <div className="bg-card border border-border rounded-lg p-8 w-full max-w-4xl mx-auto space-y-10">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20">
                    <Search size={32} className="text-accent" />
                </div>
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-text">Global Quick Search</h3>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Configure real-time character or record lookups</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl">
                    <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-tight">Enable Quick Search</h4>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Show the search bar in the site header</p>
                    </div>
                    <button 
                        onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                        className={`w-14 h-8 rounded-full relative transition-all ${settings.enabled ? 'bg-accent' : 'bg-muted/30 border border-border'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <AnimatePresence>
                    {settings.enabled && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-8 overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Database Selection */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                        <Database size={12} /> Target Database
                                    </label>
                                    <select 
                                        value={settings.database_id || ''}
                                        onChange={(e) => setSettings({ ...settings, database_id: Number(e.target.value) || null, column_id: '' })}
                                        className="w-full bg-surface border border-border p-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-accent transition-all"
                                    >
                                        <option value="">Select Database...</option>
                                        {databases.map(db => (
                                            <option key={db.id} value={db.id}>{db.name} ({db.record_shortcode || db.id})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Column Selection */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                                        <List size={12} /> Target Column
                                    </label>
                                    <select 
                                        disabled={!settings.database_id}
                                        value={settings.column_id}
                                        onChange={(e) => setSettings({ ...settings, column_id: e.target.value })}
                                        className="w-full bg-surface border border-border p-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-accent transition-all disabled:opacity-30"
                                    >
                                        <option value="">Select Column...</option>
                                        {selectedDb?.database_structure.map(col => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Match Type */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Matching Logic</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setSettings({ ...settings, exact_match_only: false })}
                                        className={`flex flex-col gap-2 p-6 rounded-2xl border transition-all text-left group ${!settings.exact_match_only ? 'bg-accent/10 border-accent' : 'bg-surface border-border hover:border-accent/30'}`}
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${!settings.exact_match_only ? 'text-accent' : 'text-muted'}`}>Partial Match</span>
                                        <p className="text-[9px] text-muted font-bold uppercase tracking-tight leading-none italic">Search triggers after 3 characters. Shows suggestions.</p>
                                    </button>
                                    <button 
                                        onClick={() => setSettings({ ...settings, exact_match_only: true })}
                                        className={`flex flex-col gap-2 p-6 rounded-2xl border transition-all text-left group ${settings.exact_match_only ? 'bg-accent/10 border-accent' : 'bg-surface border-border hover:border-accent/30'}`}
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${settings.exact_match_only ? 'text-accent' : 'text-muted'}`}>Exact Match Only</span>
                                        <p className="text-[9px] text-muted font-bold uppercase tracking-tight leading-none italic">Press Enter to jump directly to an entry.</p>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-8 border-t border-border flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving || (settings.enabled && (!settings.database_id || !settings.column_id))}
                        className="flex items-center gap-3 px-12 py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition shadow-xl shadow-accent/20 disabled:opacity-30"
                    >
                        {saving ? <Loading message="" fullScreen={false} /> : <Save size={18} />}
                        Save Configuration
                    </button>
                </div>
            </div>

            <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl flex items-start gap-4">
                <Info size={20} className="text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-accent">Access Logic</h5>
                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest leading-relaxed">
                        The Quick Search bar will be visible to any user who has permission to view the selected database.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QuickSearchSettings;
