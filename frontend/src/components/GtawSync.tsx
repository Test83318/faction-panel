import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Trash2, History, AlertTriangle, CheckCircle2, Search, ShieldAlert } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';
import { useConfirm } from './ConfirmationProvider';

const GtawSync: React.FC<{ faction: any; user: any }> = ({ faction, user }) => {
    const [syncing, setSyncing] = useState(false);
    const [pruning, setPruning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const confirm = useConfirm();

    const handleSync = async () => {
        setSyncing(true);
        setResults(null);
        try {
            const res = await api.post(`/factions/${faction.shortname}/integrations/gtaw/sync`);
            setResults(res.data.results);
            toast.success('Synchronization complete!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to sync with GTA:W');
        } finally {
            setSyncing(false);
        }
    };

    const handlePrune = async () => {
        const confirmed = await confirm({
            title: 'Prune Synchronized Data',
            message: 'Are you sure you want to prune all synchronized character data? This will clear the Characters Database but keep History and Name Changes.',
            confirmText: 'Prune Data',
            variant: 'danger'
        });

        if (!confirmed) return;
        
        setPruning(true);
        try {
            await api.post(`/factions/${faction.shortname}/integrations/gtaw/prune`);
            toast.success('Data pruned successfully');
            setResults(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to prune data');
        } finally {
            setPruning(false);
        }
    };

    return (
        <div className="relative flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className={`flex flex-col gap-6 transition-all duration-500 ${!user.gtaw_linked ? 'blur-xl pointer-events-none select-none opacity-20 scale-[0.98]' : ''}`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-text flex items-center gap-3">
                            <RefreshCw className="text-accent" />
                            GTA:W Synchronization
                        </h2>
                        <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">
                            Manage your faction integration with GTA World.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sync Card */}
                    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
                        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                            <RefreshCw size={24} className={syncing ? 'animate-spin' : ''} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Manual Synchronization</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest leading-relaxed">
                                Fetch the latest roster data from GTA World. This will update the Characters Database, log joins/leaves in History, and track Name Changes.
                            </p>
                        </div>
                        <button 
                            onClick={handleSync}
                            disabled={syncing || pruning}
                            className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition shadow-xl shadow-accent/20 disabled:opacity-30 flex items-center justify-center gap-3"
                        >
                            {syncing ? <><RefreshCw size={16} className="animate-spin" /> Synchronizing...</> : 'Sync Now'}
                        </button>
                    </div>

                    {/* Prune Card */}
                    <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
                        <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center text-danger">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Prune Data</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest leading-relaxed">
                                Clear all entries from the synchronized Characters Database. This action is useful if you want to perform a completely fresh synchronization.
                            </p>
                        </div>
                        <button 
                            onClick={handlePrune}
                            disabled={syncing || pruning}
                            className="w-full py-4 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 text-text hover:text-danger rounded-xl font-black text-xs uppercase tracking-[0.2em] transition disabled:opacity-30 flex items-center justify-center gap-3"
                        >
                            {pruning ? <><RefreshCw size={16} className="animate-spin" /> Pruning...</> : 'Prune Characters'}
                        </button>
                    </div>
                </div>

                {/* Sync Results */}
                {results && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="p-4 bg-accent/5 border-b border-border flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-accent" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text">Last Sync Results</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
                            {[
                                { label: 'Added', value: results.added, color: 'text-green-500' },
                                { label: 'Updated', value: results.updated, color: 'text-accent' },
                                { 
                                    label: 'Removed', 
                                    value: results.removed, 
                                    color: 'text-danger',
                                    subValue: results.duplicates_removed,
                                    subLabel: 'Duplicates'
                                },
                                { label: 'Name Changes', value: results.name_changes, color: 'text-purple-500' },
                                { label: 'Activity Logs', value: results.activity_logs, color: 'text-orange-500' }
                            ].map((item: any, idx) => (
                                <div key={idx} className="p-6 text-center flex flex-col justify-center">
                                    <div className={`text-2xl font-black mb-1 ${item.color}`}>{item.value}</div>
                                    <div className="text-[8px] text-muted font-black uppercase tracking-widest">{item.label}</div>
                                    {item.subValue > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border/50">
                                            <div className="text-xs font-black text-muted/60 leading-none mb-1">{item.subValue}</div>
                                            <div className="text-[6px] text-muted/40 font-black uppercase tracking-widest">{item.subLabel}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Information Card */}
                <div className="bg-surface border border-border rounded-2xl p-6 flex items-start gap-4">
                    <AlertTriangle size={24} className="text-accent shrink-0" />
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text">Integration Information</h4>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed">
                            The GTA World integration uses the access token of the administrator who performed the link. 
                            Synchronization ensures that the <span className="text-text">Characters Database</span> accurately reflects the current faction roster. 
                            Any character not found in the GTA:W roster will be automatically soft-deleted from the Characters Database.
                        </p>
                    </div>
                </div>
            </div>

            {!user.gtaw_linked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                    <div className="bg-card border border-border rounded-3xl p-12 shadow-2xl flex flex-col items-center max-w-md w-full">
                        <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mb-8 shadow-2xl shadow-accent/20 border border-accent/30">
                            <ShieldAlert size={40} />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-center">Account Not Linked</h3>
                        <p className="text-sm text-muted font-bold uppercase tracking-widest leading-relaxed text-center mb-8">
                            You must be logged in via GTA World to access synchronization features. This is required to securely communicate with the UCP API.
                        </p>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('access_token');
                                window.location.href = '/login';
                            }}
                            className="w-full py-4 bg-accent text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Relog with GTA:W
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GtawSync;
