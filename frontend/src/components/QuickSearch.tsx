import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Database, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { debounce } from 'lodash';

interface QuickSearchResult {
    id: number;
    entry_id: number;
    value: string;
    database_id: number;
    database_shortcode: string | null;
}

interface QuickSearchProps {
    shortname: string;
    settings: {
        database_id: number | null;
        column_id: string | null;
        exact_match_only: boolean;
    };
}

const QuickSearch: React.FC<QuickSearchProps> = ({ shortname, settings }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<QuickSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const performSearch = async (q: string) => {
        if (!q || q.length < (settings.exact_match_only ? 1 : 3)) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/factions/${shortname}/quick-search?q=${encodeURIComponent(q)}`);
            setResults(res.data);
            setShowResults(true);
        } catch (err) {
            console.error('Quick search failed', err);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useRef(debounce(performSearch, 300)).current;

    useEffect(() => {
        if (!settings.exact_match_only) {
            debouncedSearch(query);
        }
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query) {
            if (settings.exact_match_only) {
                performSearch(query).then(() => {
                    // If we have an exact match result, go to it
                    // This is a bit tricky since performSearch updates results state
                });
            } else if (results.length > 0) {
                handleSelect(results[0]);
            }
        }
    };

    // Special handling for exact match + enter
    useEffect(() => {
        if (settings.exact_match_only && results.length === 1 && (results[0].value || '').toString().toLowerCase() === query.toLowerCase()) {
            handleSelect(results[0]);
        }
    }, [results]);

    const handleSelect = (result: QuickSearchResult) => {
        const dbId = result.database_shortcode || result.database_id;
        navigate(`/${shortname}/records?database=${dbId}&record=${result.entry_id}`);
        setShowResults(false);
        setQuery('');
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative w-40 lg:w-64 group">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${loading ? 'text-accent animate-pulse' : 'text-muted group-hover:text-accent'}`} size={14} />
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 3 && setShowResults(true)}
                    placeholder="QUICK SEARCH..."
                    className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-muted/50"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" size={12} />}
            </div>

            <AnimatePresence>
                {showResults && results.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[500]"
                    >
                        <div className="p-2 border-b border-border bg-muted/20 flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted">Search Results</span>
                            <Database size={10} className="text-accent" />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {results.map((result) => (
                                <button 
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface border-b border-border/50 last:border-0 transition-colors text-left group"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black text-text truncate uppercase tracking-tight group-hover:text-accent transition-colors">{result.value}</span>
                                        <span className="text-[8px] font-bold text-muted uppercase tracking-widest">Entry #{result.entry_id}</span>
                                    </div>
                                    <ArrowRight size={12} className="text-muted group-hover:text-accent transition-all group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuickSearch;
