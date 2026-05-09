import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import Loading from './Loading';
import { 
    History, User as UserIcon, Calendar, Info, ChevronLeft, ChevronRight, 
    Eye, Search, Filter, X, ArrowRight, Clock, Monitor, Globe, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { debounce } from 'lodash';

interface AuditLog {
    id: number;
    user_id: number;
    user?: {
        username: string;
    };
    event: string;
    auditable_type: string | null;
    auditable_id: number | null;
    old_values: any | null;
    new_values: any | null;
    url: string;
    ip_address: string;
    user_agent: string;
    method: string;
    created_at: string;
}

interface AuditLogsProps {
    shortname: string;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ shortname }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async (p: number = 1, currentSearch = searchTerm, currentEvent = eventFilter, currentFrom = dateFrom, currentTo = dateTo) => {
        setLoading(true);
        try {
            let url = `/factions/${shortname}/audit-logs?page=${p}`;
            if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
            if (currentEvent) url += `&event=${currentEvent}`;
            if (currentFrom) url += `&date_from=${currentFrom}`;
            if (currentTo) url += `&date_to=${currentTo}`;

            const res = await api.get(url);
            setLogs(res.data.data);
            setPage(res.data.current_page);
            setLastPage(res.data.last_page);
        } catch (err) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useCallback(
        debounce((search: string) => {
            fetchLogs(1, search);
        }, 500),
        [shortname]
    );

    useEffect(() => {
        fetchLogs();
    }, [shortname]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        debouncedFetch(val);
    };

    const handleFilterChange = () => {
        fetchLogs(1);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setEventFilter('');
        setDateFrom('');
        setDateTo('');
        fetchLogs(1, '', '', '', '');
    };

    const formatEvent = (event: string) => {
        switch (event) {
            case 'created': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-tighter">Created</span>;
            case 'updated': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-tighter">Updated</span>;
            case 'deleted': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-tighter">Deleted</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-tighter">{event}</span>;
        }
    };

    const getAuditableName = (type: string | null) => {
        if (!type) return 'System';
        const parts = type.split('\\');
        return parts[parts.length - 1].replace(/([A-Z])/g, ' $1').trim();
    };

    const renderDiff = (oldValues: any, newValues: any) => {
        if (!oldValues && !newValues) return null;
        
        const allKeys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]));
        
        return (
            <div className="space-y-2 border border-border rounded-lg overflow-hidden bg-black/20">
                <div className="grid grid-cols-3 bg-muted/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <div>Field</div>
                    <div>Original</div>
                    <div>Updated</div>
                </div>
                <div className="divide-y divide-border/50">
                    {allKeys.map(key => {
                        const oldVal = oldValues?.[key];
                        const newVal = newValues?.[key];
                        
                        // Skip if they are the same (shouldn't happen with our Auditable trait usually but for safety)
                        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;

                        const formatVal = (val: any) => {
                            if (val === null) return <span className="italic text-muted">null</span>;
                            if (typeof val === 'boolean') return val ? 'True' : 'False';
                            if (typeof val === 'object') return 'JSON Object';
                            return String(val);
                        };

                        return (
                            <div key={key} className="grid grid-cols-3 px-3 py-2 text-xs items-center gap-2">
                                <div className="font-bold text-accent truncate">{key}</div>
                                <div className="text-red-400 truncate line-through opacity-70">{formatVal(oldVal)}</div>
                                <div className="text-green-400 font-semibold truncate flex items-center gap-2">
                                    <ArrowRight size={10} className="text-muted shrink-0" />
                                    {formatVal(newVal)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto w-full space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20">
                            <History size={32} className="text-accent" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-text">Audit Logs</h1>
                            <div className="flex items-center gap-2 text-muted font-bold uppercase tracking-widest text-[10px]">
                                <Clock size={12} />
                                Comprehensive activity tracking
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input 
                            type="text" 
                            placeholder="SEARCH USERS OR CONTENT..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 text-xs font-bold uppercase tracking-widest focus:border-accent outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' : 'bg-card border-border text-muted hover:border-accent hover:text-accent'}`}
                    >
                        <Filter size={20} />
                    </button>
                    {(searchTerm || eventFilter || dateFrom || dateTo) && (
                        <button 
                            onClick={resetFilters}
                            className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl hover:bg-danger hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden p-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Event Type</label>
                                <select 
                                    value={eventFilter}
                                    onChange={(e) => {setEventFilter(e.target.value); handleFilterChange();}}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-accent"
                                >
                                    <option value="">All Events</option>
                                    <option value="created">Created</option>
                                    <option value="updated">Updated</option>
                                    <option value="deleted">Deleted</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Date From</label>
                                <input 
                                    type="date" 
                                    value={dateFrom}
                                    onChange={(e) => {setDateFrom(e.target.value); handleFilterChange();}}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-accent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Date To</label>
                                <input 
                                    type="date" 
                                    value={dateTo}
                                    onChange={(e) => {setDateTo(e.target.value); handleFilterChange();}}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-accent"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted border-b border-border">
                                <th className="px-8 py-5">Event</th>
                                <th className="px-8 py-5">Administrator</th>
                                <th className="px-8 py-5">Modified Component</th>
                                <th className="px-8 py-5">Timestamp</th>
                                <th className="px-8 py-5 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <Loading message="Loading logs..." />
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/20 transition-all group">
                                    <td className="px-8 py-5">
                                        {formatEvent(log.event)}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-accent/20">
                                                {log.user?.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-black text-xs uppercase tracking-widest text-text">{log.user?.username || 'SYSTEM'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-accent">
                                                {getAuditableName(log.auditable_type)}
                                            </span>
                                            {log.auditable_id && <span className="text-[9px] text-muted font-bold uppercase tracking-tighter mt-0.5">Reference ID: #{log.auditable_id}</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-muted">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={12} className="text-accent" />
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="text-muted" />
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-accent hover:border-accent transition-all group-hover:scale-110"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && logs.length === 0 && (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted">
                            <History size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black uppercase tracking-tight">No Logs Found</h3>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest">Adjust your filters and try again.</p>
                        </div>
                    </div>
                )}

                {lastPage > 1 && (
                    <div className="px-8 py-6 bg-muted/10 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Page</span>
                            <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-accent text-[10px] font-black">{page}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">of {lastPage}</span>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                disabled={page === 1}
                                onClick={() => fetchLogs(page - 1)}
                                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-accent disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <button 
                                disabled={page === lastPage}
                                onClick={() => fetchLogs(page + 1)}
                                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent/20 disabled:opacity-30 transition-all"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detailed Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedLog(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-[2.5rem] relative"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-border flex items-center justify-between bg-muted/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20">
                                        <Info size={24} className="text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Log Details</h2>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1 italic">Event ID: #{selectedLog.id}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="w-12 h-12 flex items-center justify-center bg-surface border border-border rounded-2xl text-muted hover:text-white hover:bg-danger/20 hover:border-danger/30 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-10">
                                {/* Top Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">Performed By</label>
                                                <p className="font-black text-sm uppercase tracking-wider">{selectedLog.user?.username || 'SYSTEM'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <History size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">Event Status</label>
                                                <div className="mt-1">{formatEvent(selectedLog.event)}</div>
                                            </div>
                                        </div>
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">Date & Time</label>
                                                <p className="font-bold text-xs uppercase tracking-widest">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <Monitor size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">Technical Endpoint</label>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-[10px] font-black text-accent">{selectedLog.method}</span>
                                                    <span className="text-[10px] font-mono text-muted truncate max-w-[200px]">{selectedLog.url}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <Globe size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">IP Identification</label>
                                                <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                                            </div>
                                        </div>
                                        <div className="bg-surface/50 border border-border rounded-2xl p-4 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                                <Info size={20} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] block">Target Component</label>
                                                <p className="font-black text-xs uppercase tracking-widest text-accent">
                                                    {getAuditableName(selectedLog.auditable_type)} {selectedLog.auditable_id && `[#${selectedLog.auditable_id}]`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Data Changes - The core part */}
                                <div className="space-y-6 pt-10 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                            <div className="w-2 h-8 bg-accent rounded-full" />
                                            Modification Analysis
                                        </h3>
                                    </div>
                                    
                                    {selectedLog.event === 'updated' ? (
                                        renderDiff(selectedLog.old_values, selectedLog.new_values)
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    Original State
                                                </div>
                                                <pre className="p-6 bg-black/40 rounded-3xl border border-border text-[11px] overflow-auto max-h-80 font-mono text-red-300 leading-relaxed shadow-inner">
                                                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 4) : 'NULL'}
                                                </pre>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    Modified State
                                                </div>
                                                <pre className="p-6 bg-black/40 rounded-3xl border border-border text-[11px] overflow-auto max-h-80 font-mono text-green-300 leading-relaxed shadow-inner">
                                                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 4) : 'NULL'}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-6 border-t border-border">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] block">Agent Signature</label>
                                    <p className="text-[10px] text-muted font-bold italic bg-muted/20 p-4 rounded-2xl border border-border/50 break-all leading-relaxed">
                                        {selectedLog.user_agent}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-8 border-t border-border bg-muted/10 flex justify-end">
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="px-10 py-4 bg-surface border border-border hover:bg-muted/80 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuditLogs;
