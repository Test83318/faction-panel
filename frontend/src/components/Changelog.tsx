import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import { ArrowLeft, ScrollText } from 'lucide-react';

interface ChangelogEntry {
    id: number;
    version: string;
    title: string;
    body: string;
    released_at: string;
    order: number;
}

interface ChangelogProps {
    siteVersion?: string;
}

const Changelog: React.FC<ChangelogProps> = ({ siteVersion }) => {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/changelog')
            .then(res => setEntries(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading message="Loading changelog..." />;

    return (
        <div className="max-w-3xl mx-auto p-8 pb-20">
            <div className="mb-8">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest mb-4 hover:gap-3 transition-all"
                >
                    <ArrowLeft size={14} />
                    Back
                </Link>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-1">Changelog</h1>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">
                    Antelope{siteVersion ? ` v${siteVersion}` : ''}
                </p>
            </div>

            {entries.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-16 text-muted text-center">
                    <ScrollText size={48} className="opacity-10 mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs">No entries yet</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {entries.map(entry => (
                        <div key={entry.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono text-[10px] font-black px-2 py-1 bg-accent/10 text-accent rounded">
                                    v{entry.version}
                                </span>
                                <h2 className="font-black text-base uppercase tracking-tight">{entry.title}</h2>
                                <span className="ml-auto text-[9px] text-muted font-bold uppercase tracking-widest">
                                    {new Date(entry.released_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="text-sm text-muted whitespace-pre-line leading-relaxed">
                                {entry.body}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Changelog;
