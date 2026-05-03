import React, { useState, useEffect } from 'react';
import api from '../api';
import Loading from './Loading';
import { History, User as UserIcon, Calendar, Info, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

    const fetchLogs = async (p: number = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/factions/${shortname}/audit-logs?page=${p}`);
            setLogs(res.data.data);
            setPage(res.data.current_page);
            setLastPage(res.data.last_page);
        } catch (err) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [shortname]);

    const formatEvent = (event: string) => {
        switch (event) {
            case 'created': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-500 uppercase">Created</span>;
            case 'updated': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-500 uppercase">Updated</span>;
            case 'deleted': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-500 uppercase">Deleted</span>;
            case 'visited': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-500 uppercase">Visited</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent uppercase">{event}</span>;
        }
    };

    const getAuditableName = (type: string | null) => {
        if (!type) return 'System';
        const parts = type.split('\\');
        return parts[parts.length - 1];
    };

    if (loading && page === 1) return <Loading message="Loading Audit Logs..." />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <History className="text-accent" />
                        Audit Logs
                    </h1>
                    <p className="text-muted text-sm mt-1">Track all activities and changes within the faction.</p>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted border-b border-border">
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Target</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        {formatEvent(log.event)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold">
                                                {log.user?.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-sm">{log.user?.username || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium">{getAuditableName(log.auditable_type)}</span>
                                        {log.auditable_id && <span className="text-xs text-muted ml-1">#{log.auditable_id}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm">{new Date(log.created_at).toLocaleDateString()}</span>
                                            <span className="text-[10px] text-muted uppercase font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => setSelectedLog(log)}
                                            className="p-1.5 hover:bg-accent hover:text-white rounded transition-all text-muted"
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {logs.length === 0 && (
                    <div className="py-12 text-center text-muted">
                        No audit logs found.
                    </div>
                )}

                {lastPage > 1 && (
                    <div className="px-4 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted font-bold uppercase tracking-widest">Page {page} of {lastPage}</span>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => fetchLogs(page - 1)}
                                className="p-1.5 border border-border rounded hover:bg-card disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button 
                                disabled={page === lastPage}
                                onClick={() => fetchLogs(page + 1)}
                                className="p-1.5 border border-border rounded hover:bg-card disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedLog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-lg">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold flex items-center gap-2 text-lg">
                                <Info className="text-accent" />
                                Audit Log Details
                            </h2>
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="text-muted hover:text-white transition-colors p-1 hover:bg-red-500/20 rounded"
                            >
                                <ChevronLeft className="rotate-90" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">User</label>
                                        <p className="font-semibold">{selectedLog.user?.username || 'System'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Event Type</label>
                                        <div>{formatEvent(selectedLog.event)}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Target</label>
                                        <p className="font-semibold">{getAuditableName(selectedLog.auditable_type)} {selectedLog.auditable_id && `#${selectedLog.auditable_id}`}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">Timestamp</label>
                                        <p className="font-semibold">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">IP Address</label>
                                        <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-1">HTTP Method & URL</label>
                                        <p className="text-xs"><span className="font-bold text-accent mr-2">{selectedLog.method}</span> {selectedLog.url}</p>
                                    </div>
                                </div>
                            </div>

                            {(selectedLog.old_values || selectedLog.new_values) && (
                                <div className="space-y-4 border-t border-border pt-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-accent">Data Changes</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">Before</label>
                                            <pre className="p-3 bg-black/40 rounded border border-border text-[11px] overflow-auto max-h-60 font-mono text-red-300">
                                                {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'N/A'}
                                            </pre>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">After</label>
                                            <pre className="p-3 bg-black/40 rounded border border-border text-[11px] overflow-auto max-h-60 font-mono text-green-300">
                                                {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'N/A'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 border-t border-border pt-6">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">User Agent</label>
                                <p className="text-[10px] text-muted italic bg-muted/20 p-2 rounded">{selectedLog.user_agent}</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
