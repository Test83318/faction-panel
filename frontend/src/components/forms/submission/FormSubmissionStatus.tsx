import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../api';
import Loading from '../../Loading';
import { 
    ArrowLeft, 
    MessageSquare, 
    CheckCircle, 
    XCircle, 
    AlertCircle, 
    User, 
    Calendar,
    Clock,
    Activity
} from 'lucide-react';

interface FormSubmissionStatusProps {
    submissionId: number;
    shortname: string;
    onClose: () => void;
    user: any;
}

const renderResponseValue = (value: any) => {
    if (!value) {
        return <span className="italic text-text-muted">No response provided.</span>;
    }

    let parsedValue = value;
    if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
        try {
            parsedValue = JSON.parse(value);
        } catch {
            // Keep original string
        }
    }

    if (Array.isArray(parsedValue)) {
        if (parsedValue.length === 0) {
            return <span className="italic text-text-muted">No items selected / provided.</span>;
        }
        return (
            <ul className="list-disc pl-5 space-y-1">
                {parsedValue.map((item: any, idx: number) => (
                    <li key={idx} className="text-text text-sm">{String(item)}</li>
                ))}
            </ul>
        );
    }

    return String(parsedValue);
};

const FormSubmissionStatus: React.FC<FormSubmissionStatusProps> = ({ submissionId, shortname, onClose, user }) => {
    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchSubmission = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/forms/submissions/${submissionId}`);
            setSubmission(res.data);
        } catch (err) {
            toast.error('Failed to fetch submission details');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const getSectionGradingStatus = (section: any) => {
        const gradableFieldIds = section.fields?.filter((f: any) => f.type !== 'html' && f.has_grading).map((f: any) => f.id) || [];
        if (gradableFieldIds.length === 0) return null;

        const sectionResponses = submission.responses?.filter((r: any) => gradableFieldIds.includes(r.form_field_id)) || [];
        if (sectionResponses.length === 0) return null;

        const gradedResponses = sectionResponses.filter((r: any) => r.is_graded && r.correctness);
        if (gradedResponses.length === 0) return null;

        if (gradedResponses.some((r: any) => r.correctness === 'incorrect')) return 'incorrect';
        if (gradedResponses.some((r: any) => r.correctness === 'partially_correct')) return 'partially_correct';
        if (gradedResponses.every((r: any) => r.correctness === 'correct')) return 'correct';

        return null;
    };

    if (loading) return <Loading message="Loading Submission Status..." />;
    if (!submission) return null;

    const currentStatus = submission.current_status;
    const stages = [...(submission.form?.stages || [])].sort((a, b) => a.order - b.order);

    const getStagePointsReached = (stage: any) => {
        let total = 0;
        stage.sections?.forEach((section: any) => {
            section.fields?.forEach((field: any) => {
                const resp = submission.responses?.find((r: any) => r.form_field_id === field.id);
                if (resp) {
                    total += resp.points_awarded || 0;
                }
            });
        });
        return total;
    };

    return (
        <div className="flex flex-col min-h-screen bg-bg">
            {/* Header */}
            <div className="p-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 backdrop-blur-md bg-card/90">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-bg rounded-full transition-colors text-text-muted hover:text-text">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-text flex items-center gap-2">
                            {submission.form?.name}
                            <span className="text-xs font-normal text-text-muted">#Sub-{submission.id}</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-bold uppercase tracking-wider mt-1">
                            <span className="flex items-center gap-1">
                                <User size={14} className="text-accent" />
                                {submission.user?.username || 'Guest'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} className="text-accent" />
                                {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <Activity size={14} className="text-accent" />
                                Current Stage: {submission.current_stage?.name || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                        currentStatus?.is_passed ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        currentStatus?.is_failed ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                        {currentStatus?.name || 'Submitted'}
                    </span>
                </div>
            </div>

            {/* Stepper / Progress bar */}
            <div className="max-w-7xl w-full mx-auto px-6 pt-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6">Application Timeline</h3>
                    <div className="flex items-center justify-between relative">
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-0" />
                        {stages.map((stage: any, idx: number) => {
                            const isCompleted = stages.findIndex((s: any) => s.id === submission.current_stage_id) > idx;
                            const isActive = stage.id === submission.current_stage_id;
                            
                            return (
                                <div key={stage.id} className="flex flex-col items-center gap-2 relative z-10 bg-card px-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 
                                        isActive ? 'bg-accent text-white shadow-lg shadow-accent/20' : 
                                        'bg-bg border-2 border-border text-text-muted'
                                    }`}>
                                        {isCompleted ? <CheckCircle size={20} /> : <Clock size={18} />}
                                    </div>
                                    <div className="text-center max-w-[120px]">
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-text' : 'text-text-muted'}`}>
                                            {stage.name}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Grid: Left for sections, right for traversal navigation */}
            <div className="max-w-7xl w-full mx-auto px-6 flex flex-col lg:flex-row gap-6 pb-20">
                {/* Left Column: Sections & Answers (Flat & Fully Expanded) */}
                <div className="flex-1 space-y-6">
                    {stages.map((stage: any) => {
                        const isCurrentOrPastStage = stages.findIndex((s: any) => s.id === submission.current_stage_id) >= stages.findIndex((s: any) => s.id === stage.id);
                        if (!isCurrentOrPastStage) return null;

                        return (
                            <div key={stage.id} className="space-y-4">
                                <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-l-2 border-accent pl-3 flex items-center justify-between">
                                    <span>{stage.name}</span>
                                    {submission.form?.type === 'quiz' && (
                                        <span className="text-[10px] bg-card border border-border px-2.5 py-0.5 rounded text-text-muted normal-case font-medium">
                                            Score: {getStagePointsReached(stage)} / {stage.required_points || 0} PTS
                                        </span>
                                    )}
                                </h3>
                                
                                {stage.sections?.map((section: any) => {
                                    const sectionCommentsList = submission.comments?.filter(
                                        (c: any) => c.form_section_id === section.id && !c.is_internal
                                    ) || [];
                                    
                                    return (
                                        <div key={section.id} id={`section-${section.id}`} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-border/80 transition-colors">
                                            {/* Section Header */}
                                            <div className="p-5 bg-bg/25 border-b border-border flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-sm font-bold text-text">{section.name}</h4>
                                                    {section.description && (
                                                        <p className="text-[10px] text-text-muted mt-0.5">{section.description}</p>
                                                    )}
                                                </div>
                                                {sectionCommentsList.length > 0 && (
                                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold uppercase tracking-wider">
                                                        <MessageSquare size={10} />
                                                        {sectionCommentsList.length} feedback
                                                    </span>
                                                )}
                                            </div>

                                            {/* Section Fields */}
                                            <div className="p-6 space-y-6">
                                                {/* Fields and Responses */}
                                                <div className="grid grid-cols-1 gap-6">
                                                    {section.fields?.map((field: any) => {
                                                        const response = submission.responses?.find((r: any) => r.form_field_id === field.id);
                                                        if (field.type === 'html') return null;

                                                        return (
                                                            <div key={field.id} className="space-y-2 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                                                                <div className="flex items-center gap-2">
                                                                    {field.has_grading && response?.correctness === 'correct' && (
                                                                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                                                                    )}
                                                                    {field.has_grading && response?.correctness === 'partially_correct' && (
                                                                        <AlertCircle size={14} className="text-yellow-500 shrink-0" />
                                                                    )}
                                                                    {field.has_grading && response?.correctness === 'incorrect' && (
                                                                        <XCircle size={14} className="text-red-500 shrink-0" />
                                                                    )}
                                                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
                                                                        {field.label}
                                                                    </label>
                                                                </div>
                                                                <div className="text-text text-sm whitespace-pre-wrap bg-bg/30 p-4 rounded border border-border/50">
                                                                    {response ? renderResponseValue(response.value) : <span className="italic text-text-muted">No response provided.</span>}
                                                                </div>
                                                                {response?.reviewer_comment && (
                                                                    <div className="mt-2 text-xs bg-bg/50 border border-border/50 p-3 rounded-lg flex flex-col gap-1">
                                                                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Reviewer Explanation:</span>
                                                                        <p className="text-text-muted whitespace-pre-wrap">{response.reviewer_comment}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Section-Bound Chat / Comments */}
                                                {sectionCommentsList.length > 0 && (
                                                    <div className="mt-8 pt-6 border-t border-border space-y-4">
                                                        <h5 className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                            <MessageSquare size={12} className="text-accent" />
                                                            Section Feedback & Discussion
                                                        </h5>

                                                        {/* Comments List */}
                                                        <div className="space-y-3">
                                                            {sectionCommentsList.map((c: any) => (
                                                                <div key={c.id} className="flex flex-col bg-bg/40 border border-border p-3 rounded-lg max-w-2xl">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-[10px] font-bold text-accent">{c.user?.username || 'System'}</span>
                                                                        <span className="text-[9px] text-text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-xs text-text-muted whitespace-pre-wrap">{c.comment}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Sticky Section Traversal Panel */}
                <div className="w-80 shrink-0 hidden lg:block">
                    <div className="bg-card border border-border rounded-xl p-5 shadow-sm sticky top-28 space-y-4">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-border pb-3">
                            Sections
                        </h3>
                        <nav className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                            {stages.map((stage: any) => {
                                const isCurrentOrPastStage = stages.findIndex((s: any) => s.id === submission.current_stage_id) >= stages.findIndex((s: any) => s.id === stage.id);
                                if (!isCurrentOrPastStage) return null;

                                return (
                                    <div key={stage.id} className="space-y-1 border-b border-border/20 pb-3 last:border-0 last:pb-0">
                                        <div className="text-[10px] font-bold text-accent uppercase tracking-wider py-1 px-2 mb-1 flex items-center justify-between">
                                            <span>{stage.name}</span>
                                            {submission.form?.type === 'quiz' && (
                                                <span className="text-[9px] text-text-muted normal-case font-medium">
                                                    {getStagePointsReached(stage)}/{stage.required_points || 0} PTS
                                                </span>
                                            )}
                                        </div>
                                        {stage.sections?.map((section: any) => {
                                            const status = getSectionGradingStatus(section);
                                            return (
                                                <a
                                                    key={section.id}
                                                    href={`#section-${section.id}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }}
                                                    className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg transition-colors"
                                                >
                                                    <span className="truncate mr-2">{section.name}</span>
                                                    <div className="shrink-0 flex items-center">
                                                        {status === 'correct' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                <CheckCircle size={10} /> Correct
                                                            </span>
                                                        )}
                                                        {status === 'partially_correct' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                <AlertCircle size={10} /> Partial
                                                            </span>
                                                        )}
                                                        {status === 'incorrect' && (
                                                            <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                <XCircle size={10} /> Incorrect
                                                            </span>
                                                        )}
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormSubmissionStatus;
