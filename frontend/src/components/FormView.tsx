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
    FileText
} from 'lucide-react';
import FormFieldRenderer from './forms/submission/FormFieldRenderer';

interface FormViewProps {
    formId: number;
    shortname: string;
    onClose: () => void;
    user: any;
}

const FormView: React.FC<FormViewProps> = ({ formId, shortname, onClose, user }) => {
    const [form, setForm] = useState<Form | null>(null);
    const [submission, setSubmission] = useState<FormSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [responses, setResponses] = useState<Record<number, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const fetchForm = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/forms/${formId}`);
            setForm(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load form');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForm();
    }, [formId]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms/${formId}/submissions/start`);
            const sub = res.data;
            setSubmission(sub);

            // Handle pre-filled responses
            if (sub.responses) {
                const prefilled: Record<number, any> = {};
                sub.responses.forEach((r: any) => {
                    prefilled[r.form_field_id] = r.value;
                });
                setResponses(prefilled);
            }
        } catch (err: any) {
            if (err.response?.status === 429) {
                toast.error(`Cooldown: Please wait ${Math.ceil(err.response.data.remaining_seconds / 60)} minutes.`);
            } else {
                toast.error(err.response?.data?.message || 'Failed to start submission');
            }
        } finally {
            setStarting(false);
        }
    };

    const handleResponseChange = (fieldId: number, value: any) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async () => {
        if (!submission) return;
        
        setSubmitting(true);
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

    if (loading) return <Loading message="Loading Form..." />;
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
                            onClick={handleStart}
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
    const isLastStage = currentStageIdx === (form.stages?.length || 1) - 1;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
            {/* Header & Progress */}
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-text">{form.name}</h1>
                        <p className="text-text-muted text-sm mt-1">{currentStage?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Progress</p>
                        <p className="text-sm font-bold text-accent">{currentStageIdx + 1} / {form.stages?.length || 1}</p>
                    </div>
                </div>

                <div className="h-1.5 w-full bg-card rounded-full overflow-hidden border border-border">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStageIdx + 1) / (form.stages?.length || 1)) * 100}%` }}
                        className="h-full bg-accent"
                    />
                </div>
            </div>

            {/* Stage Content */}
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentStage?.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                >
                    {currentStage?.sections?.map(section => (
                        <div key={section.id} className="space-y-6">
                            <div className="border-l-4 border-accent pl-4">
                                <h2 className="text-xl font-bold text-text">{section.name}</h2>
                                {section.description && <p className="text-text-muted text-sm mt-1">{section.description}</p>}
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                {section.fields?.map(field => (
                                    <FormFieldRenderer 
                                        key={field.id} 
                                        field={field} 
                                        value={responses[field.id]} 
                                        onChange={(val) => handleResponseChange(field.id, val)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-bg/80 backdrop-blur-md border-t border-border z-50">
                <div className="max-w-4xl mx-auto flex justify-between gap-4">
                    <button 
                        onClick={() => setCurrentStageIdx(prev => Math.max(0, prev - 1))}
                        disabled={currentStageIdx === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-text-muted rounded-xl font-bold uppercase tracking-widest text-xs hover:text-text transition-all disabled:opacity-0"
                    >
                        <ChevronLeft size={18} />
                        Back
                    </button>

                    {isLastStage ? (
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-10 py-3 bg-accent text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                        >
                            {submitting ? 'Submitting...' : 'Final Submit'}
                            {!submitting && <Send size={18} />}
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setCurrentStageIdx(prev => prev + 1);
                            }}
                            className="flex items-center gap-2 px-10 py-3 bg-accent text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                        >
                            Next Stage
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormView;
