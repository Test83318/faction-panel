import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from './Loading';
import { Form, FormStage, FormSubmission } from '../types';
import { 
    ArrowLeft, 
    Send, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle2, 
    AlertCircle,
    Info,
    FileText,
    Edit2,
    ShieldAlert
} from 'lucide-react';
import FormFieldRenderer from './forms/submission/FormFieldRenderer';

interface FormViewProps {
    formId?: number;
    shortname: string;
    onClose: () => void;
    user: any;
    preview?: boolean;
    previewForm?: Form;
}

const WIDTH_CLASSES: Record<number, string> = {
    1: 'col-span-12 md:col-span-1',
    2: 'col-span-12 md:col-span-2',
    3: 'col-span-12 md:col-span-3',
    4: 'col-span-12 md:col-span-4',
    5: 'col-span-12 md:col-span-5',
    6: 'col-span-12 md:col-span-6',
    7: 'col-span-12 md:col-span-7',
    8: 'col-span-12 md:col-span-8',
    9: 'col-span-12 md:col-span-9',
    10: 'col-span-12 md:col-span-10',
    11: 'col-span-12 md:col-span-11',
    12: 'col-span-12 md:col-span-12',
};

const FormView: React.FC<FormViewProps> = ({ formId, shortname, onClose, user, preview = false, previewForm }) => {
    const [form, setForm] = useState<Form | null>(null);
    const [submission, setSubmission] = useState<FormSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
    const [responses, setResponses] = useState<Record<number, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isProgressExpanded, setIsProgressExpanded] = useState(true);
    const [furthestSectionIdx, setFurthestSectionIdx] = useState(0);
    const [furthestStageIdx, setFurthestStageIdx] = useState(0);

    useEffect(() => {
        if (currentStageIdx > furthestStageIdx) {
            setFurthestStageIdx(currentStageIdx);
            setFurthestSectionIdx(currentSectionIdx);
        } else if (currentStageIdx === furthestStageIdx && currentSectionIdx > furthestSectionIdx) {
            setFurthestSectionIdx(currentSectionIdx);
        }
    }, [currentStageIdx, currentSectionIdx, furthestStageIdx, furthestSectionIdx]);

    const fetchFormAndStart = async () => {
        if (preview && previewForm) {
            setLoading(true);
            setStarting(true);
            setForm(previewForm);
            
            const mockSubmission = {
                id: 9999,
                form_id: previewForm.id,
                current_stage_id: previewForm.stages?.[0]?.id,
                current_status_id: 1,
                responses: []
            };
            setSubmission(mockSubmission as any);
            
            // Populate default values
            const prefilled: Record<number, any> = {};
            previewForm.stages?.forEach((stage: any) => {
                stage.sections?.forEach((section: any) => {
                    section.fields?.forEach((field: any) => {
                        if (field.default_value !== undefined && field.default_value !== null) {
                            if (field.type === 'toggle') {
                                prefilled[field.id] = field.default_value === 'true';
                            } else {
                                prefilled[field.id] = field.default_value;
                            }
                        }
                    });
                });
            });
            setResponses(prefilled);
            setLoading(false);
            setStarting(false);
            return;
        }

        if (!formId) return;

        try {
            setLoading(true);
            const res = await api.get(`/factions/${shortname}/forms/${formId}`);
            const fetchedForm = res.data;
            setForm(fetchedForm);
            
            // Auto start logic
            setStarting(true);
            try {
                const startRes = await api.post(`/factions/${shortname}/forms/${formId}/submissions/start`);
                const sub = startRes.data;
                setSubmission(sub);

                // Initialize currentStageIdx based on submission's current_stage_id
                if (sub.current_stage_id && fetchedForm.stages) {
                    const stageIdx = fetchedForm.stages.findIndex((s: any) => s.id === sub.current_stage_id);
                    if (stageIdx !== -1) {
                        setCurrentStageIdx(stageIdx);
                    }
                }

                // Handle pre-filled responses and defaults
                const prefilled: Record<number, any> = {};
                fetchedForm.stages?.forEach((stage: any) => {
                    stage.sections?.forEach((section: any) => {
                        section.fields?.forEach((field: any) => {
                            if (field.default_value !== undefined && field.default_value !== null) {
                                if (field.type === 'toggle') {
                                    prefilled[field.id] = field.default_value === 'true';
                                } else {
                                    prefilled[field.id] = field.default_value;
                                }
                            }
                        });
                    });
                });

                if (sub.responses) {
                    sub.responses.forEach((r: any) => {
                        let val = r.value;
                        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                            try {
                                val = JSON.parse(val);
                            } catch {
                                // Keep original string
                            }
                        }
                        prefilled[r.form_field_id] = val;
                    });
                }
                setResponses(prefilled);
            } catch (startErr: any) {
                if (startErr.response?.status === 429) {
                    toast.error(`Cooldown: Please wait ${Math.ceil(startErr.response.data.remaining_seconds / 60)} minutes.`);
                } else {
                    toast.error(startErr.response?.data?.message || 'Failed to start submission');
                }
                onClose();
            } finally {
                setStarting(false);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load form');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFormAndStart();
    }, [formId, preview]);

    const handleResponseChange = (fieldId: number, value: any) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async () => {
        if (!submission) return;
        
        setSubmitting(true);
        if (preview) {
            try {
                await new Promise(resolve => setTimeout(resolve, 800));
                setSubmitted(true);
                toast.success('Simulation: Form submitted successfully!');
            } catch (err) {
                toast.error('Simulation: Failed to submit form');
            } finally {
                setSubmitting(false);
            }
            return;
        }

        try {
            await api.post(`/factions/${shortname}/forms/${formId}/submissions/${submission.id}/submit`, {
                responses
            });
            setSubmitted(true);
            toast.success('Form submitted successfully!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || starting || !submission) return (
        <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <Loading message="Preparing Application..." />
        </div>
    );
    if (!form) return null;

    if (submitted) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-green-500/10 text-green-500 rounded-full mb-6"
                >
                    <CheckCircle2 size={64} />
                </motion.div>
                <h2 className="text-3xl font-bold text-text mb-2">Submission Successful!</h2>
                <p className="text-text-muted mb-8 max-w-md">Your response has been recorded. Faction leadership will review it shortly. You can track the status in the forms list.</p>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-accent text-white rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-accent/90 transition-all"
                >
                    Return to Forms
                </button>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="max-w-3xl mx-auto p-6 space-y-8">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-card rounded-full text-text-muted transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-text">{form.name}</h1>
                        <p className="text-text-muted mt-1">Application Portal</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-8 space-y-6">
                        <div className="prose prose-invert max-w-none">
                            <p className="text-text-muted leading-relaxed whitespace-pre-wrap">{form.description || 'No description provided.'}</p>
                        </div>

                        {form.requires_gtaw_login && !user?.gtaw_linked && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-start">
                                <AlertCircle size={18} className="text-red-500 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">GTA:W Account Required</p>
                                    <p className="text-xs text-text-muted leading-relaxed">
                                        This form requires a linked GTA:W account. Please link your account in the <span className="text-text font-bold">Settings</span> menu before continuing.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-bg rounded-xl border border-border flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Type</p>
                                    <p className="text-sm font-bold text-text capitalize">{form.type}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-bg rounded-xl border border-border flex items-center gap-4">
                                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Stages</p>
                                    <p className="text-sm font-bold text-text">{form.stages?.length || 0} Phases</p>
                                </div>
                            </div>
                        </div>

                        {form.cooldown_seconds > 0 && (
                            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl flex gap-3 items-start">
                                <AlertCircle size={18} className="text-orange-500 mt-0.5" />
                                <p className="text-xs text-text-muted leading-relaxed">
                                    This form has a <span className="text-orange-500 font-bold">{form.cooldown_seconds / 3600}h cooldown</span> period {form.cooldown_only_on_fail ? 'if you fail' : ''}.
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={fetchFormAndStart}
                            disabled={starting || (form.requires_gtaw_login && !user?.gtaw_linked)}
                            className="w-full py-4 bg-accent text-white rounded-xl font-bold uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {starting ? 'Initializing...' : 'Start Application'}
                            {!starting && <ChevronRight size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentStage = form.stages?.[currentStageIdx];
    const currentSection = currentStage?.sections?.[currentSectionIdx];
    const isLastSectionOfStage = currentSectionIdx === (currentStage?.sections?.length || 1) - 1;
    const isLastStage = currentStageIdx === (form.stages?.length || 1) - 1;
    const isFinalSectionOfForm = isLastStage && isLastSectionOfStage;

    const isSectionComplete = (section: any) => {
        return section.fields?.every((f: any) => 
            !f.is_required || (responses[f.id] !== undefined && responses[f.id] !== '' && responses[f.id] !== null)
        );
    };

    const isCurrentSectionComplete = currentSection ? isSectionComplete(currentSection) : false;
    
    const isStageComplete = () => {
        return currentStage?.sections?.every(section => isSectionComplete(section));
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Application Progress Accordion */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                <button 
                    onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                    className="w-full p-4 flex justify-between items-center hover:bg-bg/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-accent/10 text-accent rounded">
                            <FileText size={18} />
                        </div>
                        <h6 className="text-sm font-bold text-text uppercase tracking-widest">Application Progress</h6>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-bg px-2 py-1 rounded">
                            {currentStageIdx + 1} / {form.stages?.length || 1} Stages
                        </div>
                        <ChevronRight size={18} className={`text-text-muted transition-transform ${isProgressExpanded ? 'rotate-90' : ''}`} />
                    </div>
                </button>

                <AnimatePresence>
                    {isProgressExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-border"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between relative">
                                    {/* Stepper Line */}
                                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-0" />
                                    
                                    {form.stages?.map((stage, idx) => {
                                        const isCompleted = idx < currentStageIdx;
                                        const isActive = idx === currentStageIdx;
                                        
                                        return (
                                            <div key={stage.id} className="flex flex-col items-center gap-2 relative z-10 bg-card px-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                    isCompleted ? 'bg-green-500 text-white' : 
                                                    isActive ? 'bg-accent text-white shadow-lg shadow-accent/20' : 
                                                    'bg-bg border-2 border-border text-text-muted'
                                                }`}>
                                                    {isCompleted ? <CheckCircle2 size={20} /> : <Edit2 size={18} />}
                                                </div>
                                                <div className="text-center max-w-[120px]">
                                                    <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-text' : 'text-text-muted'}`}>
                                                        {stage.name}
                                                    </p>
                                                    {isActive && stage.description && (
                                                        <p className="text-[8px] text-text-muted mt-0.5 italic line-clamp-1">{stage.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Content Area */}
                <div className="lg:col-span-9 bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-8 flex-1">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={`${currentStageIdx}-${currentSectionIdx}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-text tracking-tight">{currentSection?.name || 'Section'}</h2>
                                    {currentSection?.description && (
                                        <p className="text-text-muted leading-relaxed whitespace-pre-wrap">{currentSection.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-300">
                                    {currentSection?.fields?.map(field => (
                                        <div 
                                            key={field.id} 
                                            className={`${WIDTH_CLASSES[field.width || 12] || 'col-span-12'} p-6 bg-bg/30 rounded-xl border border-border/50 hover:border-accent/30 transition-all`}
                                        >
                                            <FormFieldRenderer 
                                                field={field} 
                                                value={responses[field.id]} 
                                                onChange={(val) => handleResponseChange(field.id, val)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="p-6 border-t border-border bg-bg/50 flex justify-between items-center">
                        <button 
                            onClick={() => {
                                if (currentSectionIdx > 0) {
                                    setCurrentSectionIdx(prev => prev - 1);
                                } else if (currentStageIdx > 0) {
                                    setCurrentStageIdx(prev => prev - 1);
                                    setCurrentSectionIdx(form.stages[currentStageIdx - 1].sections.length - 1);
                                }
                            }}
                            disabled={currentStageIdx === 0 && currentSectionIdx === 0}
                            className="flex items-center gap-2 px-6 py-2.5 text-text-muted hover:text-text font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-0"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        
                        {isLastSectionOfStage ? (
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting || !isStageComplete()}
                                className={`flex items-center gap-2 px-10 py-2.5 rounded font-bold uppercase tracking-widest text-[10px] transition-all ${
                                    isStageComplete() 
                                        ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20' 
                                        : 'bg-bg border border-border text-text-muted cursor-not-allowed opacity-50'
                                }`}
                            >
                                {submitting ? 'Submitting...' : isLastStage ? 'Final Submit' : 'Submit Stage'}
                                {!submitting && <Send size={16} />}
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    setCurrentSectionIdx(prev => prev + 1);
                                }}
                                disabled={!isCurrentSectionComplete}
                                className={`flex items-center gap-2 px-8 py-2.5 rounded font-bold uppercase tracking-widest text-[10px] transition-all ${
                                    isCurrentSectionComplete 
                                        ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20' 
                                        : 'bg-bg border border-border text-text-muted cursor-not-allowed opacity-50'
                                }`}
                            >
                                Continue
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-3 space-y-6 sticky top-6">
                    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-border bg-bg/50">
                            <h6 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Stage Sections</h6>
                        </div>
                        <div className="p-2 space-y-1">
                            {currentStage?.sections?.map((section, idx) => {
                                const isActive = idx === currentSectionIdx;
                                const isFilled = isSectionComplete(section);
                                
                                // A section is unlocked if it's the current active one, 
                                // or if it's been reached/filled before (furthestSectionIdx)
                                const isUnlocked = idx <= furthestSectionIdx || isFilled;
                                
                                return (
                                    <button 
                                        key={section.id}
                                        disabled={!isUnlocked}
                                        onClick={() => setCurrentSectionIdx(idx)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all group ${
                                            isActive ? 'bg-accent/10 text-accent' : 
                                            isUnlocked ? 'hover:bg-bg text-text-muted hover:text-text' : 
                                            'text-text-muted/30 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="text-xs font-bold truncate pr-2">{section.name}</span>
                                        {isFilled ? (
                                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                                        ) : !isUnlocked ? (
                                            <ShieldAlert size={14} className="text-text-muted/30 flex-shrink-0" />
                                        ) : (
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-accent' : 'bg-border group-hover:bg-text-muted'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-bg border border-border rounded-xl p-4 flex gap-3 items-start">
                        <Info size={16} className="text-accent mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] text-text-muted leading-relaxed uppercase tracking-wider">
                                Your progress is saved automatically.
                            </p>
                            {!isCurrentSectionComplete && (
                                <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest">
                                    Fill in all required fields to unlock the next section
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default FormView;
