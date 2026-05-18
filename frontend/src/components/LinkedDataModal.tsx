import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Database, Layers, ArrowRight, Table, Check, List } from 'lucide-react';
import api from '../api';
import Loading from './Loading';

interface LinkedDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    shortname: string;
}

export const LinkedDataModal: React.FC<LinkedDataModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    shortname
}) => {
    const [rosters, setRosters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'roster' | 'section' | 'row' | 'column'>('roster');
    
    const [selection, setSelection] = useState({
        roster_id: (initialData && typeof initialData === 'object') ? initialData.roster_id : null,
        section_id: (initialData && typeof initialData === 'object') ? initialData.section_id : null,
        row_id: (initialData && typeof initialData === 'object') ? initialData.row_id : null,
        col_id: (initialData && typeof initialData === 'object') ? initialData.col_id : null
    });

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchRosters();
            if (initialData && typeof initialData === 'object') {
                setSelection({
                    roster_id: initialData.roster_id || null,
                    section_id: initialData.section_id || null,
                    row_id: initialData.row_id || null,
                    col_id: initialData.col_id || null
                });
            } else {
                setSelection({
                    roster_id: null,
                    section_id: null,
                    row_id: null,
                    col_id: null
                });
            }
        }
    }, [isOpen, initialData]);

    const fetchRosters = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/factions/${shortname}`);
            setRosters(res.data.rosters || []);
        } catch (err) {
            console.error('Failed to fetch rosters', err);
        } finally {
            setLoading(false);
        }
    };

    const selectedRoster = useMemo(() => 
        rosters.find(r => r.id === selection.roster_id), 
    [rosters, selection.roster_id]);

    const allSections = useMemo(() => {
        if (!selectedRoster) return [];
        const sections: any[] = [];
        const flatSections = (sec: any) => {
            sections.push(sec);
            if (sec.children) sec.children.forEach(flatSections);
        };
        (selectedRoster.root_sections || []).forEach(flatSections);
        return sections;
    }, [selectedRoster]);

    const selectedSection = useMemo(() => 
        allSections.find(s => s.id === selection.section_id),
    [allSections, selection.section_id]);

    const selectedRow = useMemo(() => 
        selectedSection?.contents?.find((c: any) => c.id === selection.row_id),
    [selectedSection, selection.row_id]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (selection.roster_id && selection.section_id && selection.row_id && selection.col_id) {
            onSave(selection);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
            <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Layers size={20} className="text-accent" />
                            Link Roster Data
                        </h2>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                            Mirror data from another roster cell
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors p-2 hover:bg-surface rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex bg-surface border-b border-border shrink-0 overflow-x-auto">
                    {[
                        { id: 'roster', label: 'Roster', value: selection.roster_id, display: selectedRoster?.name },
                        { id: 'section', label: 'Section', value: selection.section_id, display: selectedSection?.name },
                        { id: 'row', label: 'Row', value: selection.row_id, display: selectedRow ? `Row #${selectedRow.id}` : null },
                        { id: 'column', label: 'Column', value: selection.col_id, display: selectedRoster?.columns?.find((c: any) => c.id === selection.col_id)?.name }
                    ].map((s, idx) => (
                        <button 
                            key={s.id}
                            disabled={idx > 0 && ![selection.roster_id, selection.section_id, selection.row_id][idx-1]}
                            onClick={() => setStep(s.id as any)}
                            className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                                ${step === s.id ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-muted hover:text-text'}
                                ${idx > 0 && ![selection.roster_id, selection.section_id, selection.row_id][idx-1] ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                            `}
                        >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${s.value ? 'bg-success text-white' : 'bg-surface border border-border'}`}>
                                {s.value ? <Check size={8} /> : idx + 1}
                            </div>
                            <div className="flex flex-col items-start">
                                <span>{s.label}</span>
                                {s.display && <span className="text-[8px] opacity-60 normal-case font-bold truncate max-w-[80px]">{s.display}</span>}
                            </div>
                            {idx < 3 && <ArrowRight size={10} className="opacity-20 ml-2" />}
                        </button>
                    ))}
                </div>

                <div className="p-6 flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="py-20"><Loading message="Fetching available rosters..." /></div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                                <input 
                                    type="text"
                                    placeholder={`Search ${step}s...`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-surface border border-border p-2.5 pl-10 rounded-lg text-xs text-text focus:border-accent outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {step === 'roster' && rosters.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                                    <button 
                                        key={r.id}
                                        onClick={() => {
                                            setSelection({ ...selection, roster_id: r.id, section_id: null, row_id: null, col_id: null });
                                            setStep('section');
                                            setSearchQuery('');
                                        }}
                                        className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left group
                                            ${selection.roster_id === r.id ? 'bg-accent/10 border-accent shadow-lg shadow-accent/5' : 'bg-surface border-border hover:border-accent/50'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: r.color }}>
                                            <Database size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black uppercase tracking-tight">{r.name}</div>
                                            <div className="text-[9px] font-bold text-muted uppercase tracking-widest">{r.shortname}</div>
                                        </div>
                                        {selection.roster_id === r.id && <div className="p-2 bg-accent text-white rounded-full"><Check size={12} /></div>}
                                    </button>
                                ))}

                                {step === 'section' && allSections.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                                    <button 
                                        key={s.id}
                                        onClick={() => {
                                            setSelection({ ...selection, section_id: s.id, row_id: null, col_id: null });
                                            setStep('row');
                                            setSearchQuery('');
                                        }}
                                        className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left group
                                            ${selection.section_id === s.id ? 'bg-accent/10 border-accent shadow-lg shadow-accent/5' : 'bg-surface border-border hover:border-accent/50'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted group-hover:text-accent group-hover:border-accent/50 transition-all">
                                            <Table size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black uppercase tracking-tight">{s.name}</div>
                                            <div className="text-[9px] font-bold text-muted uppercase tracking-widest">{s.type}</div>
                                        </div>
                                        {selection.section_id === s.id && <div className="p-2 bg-accent text-white rounded-full"><Check size={12} /></div>}
                                    </button>
                                ))}

                                {step === 'row' && selectedSection?.contents?.filter((r: any) => 
                                    Object.values(r.content || {}).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
                                ).map((r: any) => (
                                    <button 
                                        key={r.id}
                                        onClick={() => {
                                            setSelection({ ...selection, row_id: r.id, col_id: null });
                                            setStep('column');
                                            setSearchQuery('');
                                        }}
                                        className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left group
                                            ${selection.row_id === r.id ? 'bg-accent/10 border-accent shadow-lg shadow-accent/5' : 'bg-surface border-border hover:border-accent/50'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
                                            <div className="text-[10px] font-black">#{r.id}</div>
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            {selectedRoster?.columns?.slice(0, 4).map((col: any) => (
                                                <div key={col.id} className="overflow-hidden">
                                                    <div className="text-[7px] font-black text-muted uppercase tracking-widest truncate">{col.name}</div>
                                                    <div className="text-[10px] font-bold truncate">{String(r.content?.[col.id] || '-')}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {selection.row_id === r.id && <div className="p-2 bg-accent text-white rounded-full shrink-0"><Check size={12} /></div>}
                                    </button>
                                ))}

                                {step === 'column' && selectedRoster?.columns?.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c: any) => (
                                    <button 
                                        key={c.id}
                                        onClick={() => {
                                            setSelection({ ...selection, col_id: c.id });
                                            setSearchQuery('');
                                        }}
                                        className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left group
                                            ${selection.col_id === c.id ? 'bg-accent/10 border-accent shadow-lg shadow-accent/5' : 'bg-surface border-border hover:border-accent/50'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
                                            <List size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-black uppercase tracking-tight">{c.name}</div>
                                            <div className="text-[9px] font-bold text-muted uppercase tracking-widest">{c.type}</div>
                                        </div>
                                        {selection.col_id === c.id && <div className="p-2 bg-accent text-white rounded-full"><Check size={12} /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-surface border-t border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        {step !== 'roster' && (
                            <button 
                                onClick={() => {
                                    const steps: any[] = ['roster', 'section', 'row', 'column'];
                                    setStep(steps[steps.indexOf(step) - 1]);
                                }}
                                className="px-4 py-2 bg-card border border-border rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
                            >
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-card border border-border rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-surface transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!selection.roster_id || !selection.section_id || !selection.row_id || !selection.col_id}
                            className="px-6 py-2 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                        >
                            Save Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
