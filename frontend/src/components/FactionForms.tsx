import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import { useConfirm } from './ConfirmationProvider';
import { Form, Faction } from '../types';
import {
    Plus,
    FileText,
    Settings,
    Trash2,
    ChevronRight,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    Edit2,
    BarChart3,
    ArrowLeft,
    Inbox,
    Search,
    AlertCircle,
    Info,
    CheckCircle2,
    ShieldAlert
} from 'lucide-react';
import FormEditor from './forms/FormEditor';
import FormView from './FormView';
import FormSubmissionReview from './forms/submission/FormSubmissionReview';

interface FactionFormsProps {
    shortname: string;
    user: any;
    permissions: string[];
}

const FactionForms: React.FC<FactionFormsProps> = ({ shortname, user, permissions }) => {
    const [forms, setForms] = useState<Form[]>([]);
    const [mySubmissions, setMySubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<'pending' | 'archived' | 'unsubmitted'>('pending');
    const [pendingStartForm, setPendingStartForm] = useState<Form | null>(null);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({
        name: '',
        type: 'standard' as 'standard' | 'quiz',
        description: '',
        is_public: false
    });

    const navigate = useNavigate();
    const location = useLocation();

    // Parse sub-path to derive current view from URL
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const formsIdx = pathSegments.indexOf('forms');
    const subSegments = pathSegments.slice(formsIdx + 1);

    const formIdInPath = subSegments[0] && !isNaN(Number(subSegments[0])) ? Number(subSegments[0]) : null;
    const viewInPath = subSegments[1] || null;
    const subViewIdInPath = subSegments[2] && !isNaN(Number(subSegments[2])) ? Number(subSegments[2]) : null;

    const activeForm = formIdInPath !== null ? forms.find(f => f.id === formIdInPath) ?? null : null;
    const activeSubmissionId = subViewIdInPath;

    const isEditing = viewInPath === 'edit';
    const isSubmitting = viewInPath === 'submit';
    const isReviewingSubmission = viewInPath === 'submissions' && subViewIdInPath !== null;
    const viewingFormSubmissionsId = viewInPath === 'submissions' && subViewIdInPath === null ? formIdInPath : null;
    const viewingMyFormSubmissionsId = viewInPath === 'my-submissions' ? formIdInPath : null;

    const hasPerm = (perm: string) => user?.is_superadmin || permissions.includes(perm);
    const canCreate = hasPerm('create_faction_forms');
    const canModerate = hasPerm('global_faction_form_moderation');
    const confirm = useConfirm();

    const fetchForms = async () => {
        try {
            const [formsRes, subsRes] = await Promise.all([
                api.get(`/factions/${shortname}/forms`),
                user ? api.get(`/factions/${shortname}/my-submissions`) : Promise.resolve({ data: [] })
            ]);
            setForms(formsRes.data);
            setMySubmissions(subsRes.data);

            if (canModerate) {
                const allSubsRes = await api.get(`/factions/${shortname}/submissions`);
                setAllSubmissions(allSubsRes.data);
            }
        } catch (err) {
            toast.error('Failed to fetch forms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, [shortname]);

    // Redirect to forms list if formId in URL but form not found after load
    useEffect(() => {
        if (!loading && formIdInPath !== null && !activeForm && viewInPath !== null) {
            navigate(`/${shortname}/forms`, { replace: true });
        }
    }, [loading, formIdInPath, activeForm, viewInPath]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms`, newForm);
            setForms([...forms, res.data]);
            setShowCreateModal(false);
            setNewForm({ name: '', type: 'standard', description: '', is_public: false });
            toast.success('Form created successfully!');
            navigate(`/${shortname}/forms/${res.data.id}/edit`);
        } catch (err) {
            toast.error('Failed to create form');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (form: Form) => {
        const isConfirmed = await confirm({
            title: 'Delete Form',
            message: `Are you sure you want to delete "${form.name}"? This action cannot be undone and all submissions will be lost.`,
            confirmText: 'Delete Form',
            type: 'danger'
        });

        if (isConfirmed) {
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}`);
                setForms(forms.filter(f => f.id !== form.id));
                toast.success('Form deleted');
            } catch (err) {
                toast.error('Failed to delete form');
            }
        }
    };

    if (loading) return <Loading message="Loading Forms..." />;

    if (isEditing && activeForm) {
        return (
            <FormEditor
                form={activeForm}
                shortname={shortname}
                onClose={() => {
                    navigate(`/${shortname}/forms`);
                    fetchForms();
                }}
                user={user}
                permissions={permissions}
            />
        );
    }

    if (isSubmitting && activeForm) {
        return (
            <FormView
                formId={activeForm.id}
                shortname={shortname}
                user={user}
                onClose={() => {
                    navigate(`/${shortname}/forms`);
                    fetchForms();
                }}
            />
        );
    }

    if (isReviewingSubmission && activeSubmissionId) {
        return (
            <FormSubmissionReview
                submissionId={activeSubmissionId}
                shortname={shortname}
                onClose={() => {
                    const backPath = (location.state as any)?.from ?? `/${shortname}/forms`;
                    navigate(backPath);
                    fetchForms();
                }}
                user={user}
            />
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {(viewingFormSubmissionsId || viewingMyFormSubmissionsId) && (
                        <button
                            onClick={() => navigate(`/${shortname}/forms`)}
                            className="p-2 hover:bg-bg rounded-full text-text-muted hover:text-text transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                            <FileText className="text-accent" />
                            {viewingFormSubmissionsId
                                ? `Reviewing: ${forms.find(f => f.id === viewingFormSubmissionsId)?.name}`
                                : viewingMyFormSubmissionsId
                                    ? `My Submissions: ${forms.find(f => f.id === viewingMyFormSubmissionsId)?.name}`
                                    : 'Faction Forms'}
                        </h1>
                        <p className="text-text-muted text-sm mt-1">
                            {viewingFormSubmissionsId || viewingMyFormSubmissionsId
                                ? 'View and manage form submissions.'
                                : 'Create and manage applications, quizzes, and dynamic forms.'}
                        </p>
                    </div>
                </div>
                {!viewingFormSubmissionsId && !viewingMyFormSubmissionsId && canCreate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                    >
                        <Plus size={16} />
                        Create Form
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {viewingFormSubmissionsId ? (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex gap-2">
                            <button
                                onClick={() => setReviewFilter('pending')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${reviewFilter === 'pending' ? 'bg-accent text-white' : 'bg-bg border border-border text-text-muted hover:border-accent/50'}`}
                            >
                                Review ({allSubmissions.filter(s => s.form_id === viewingFormSubmissionsId && s.submitted_at && !s.current_status?.is_archived).length})
                            </button>
                            <button
                                onClick={() => setReviewFilter('unsubmitted')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${reviewFilter === 'unsubmitted' ? 'bg-amber-500 text-white' : 'bg-bg border border-border text-text-muted hover:border-amber-500/50'}`}
                            >
                                Pending ({allSubmissions.filter(s => s.form_id === viewingFormSubmissionsId && !s.submitted_at).length})
                            </button>
                            <button
                                onClick={() => setReviewFilter('archived')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${reviewFilter === 'archived' ? 'bg-accent text-white' : 'bg-bg border border-border text-text-muted hover:border-accent/50'}`}
                            >
                                Archived ({allSubmissions.filter(s => s.form_id === viewingFormSubmissionsId && s.current_status?.is_archived).length})
                            </button>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg/50 border-b border-border">
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">User</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Stage</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Submitted Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {allSubmissions
                                        .filter(sub => sub.form_id === viewingFormSubmissionsId)
                                        .filter(sub => {
                                            if (reviewFilter === 'unsubmitted') return !sub.submitted_at;
                                            if (reviewFilter === 'archived') return sub.current_status?.is_archived;
                                            return sub.submitted_at && !sub.current_status?.is_archived;
                                        })
                                        .map(sub => (
                                        <tr key={sub.id} className="hover:bg-bg/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                                        {sub.user?.username ? sub.user.username[0].toUpperCase() : 'G'}
                                                    </div>
                                                    <span className="text-sm font-bold text-text">{sub.user?.username || 'Guest'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-text-muted font-bold">
                                                    {sub.current_stage?.name ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    !sub.submitted_at ? 'bg-amber-500/10 text-amber-500' :
                                                    sub.current_status?.is_passed ? 'bg-green-500/10 text-green-500' :
                                                    sub.current_status?.is_failed ? 'bg-red-500/10 text-red-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {!sub.submitted_at ? 'In Progress' : (sub.current_status?.name || 'Submitted')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-text-muted">
                                                    {sub.submitted_at
                                                        ? new Date(sub.submitted_at).toLocaleDateString()
                                                        : `Started ${new Date(sub.created_at).toLocaleDateString()}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(
                                                        `/${shortname}/forms/${viewingFormSubmissionsId}/submissions/${sub.id}`,
                                                        { state: { from: `/${shortname}/forms/${viewingFormSubmissionsId}/submissions` } }
                                                    )}
                                                    className="px-3 py-1.5 bg-accent/10 text-accent rounded text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                                                >
                                                    {reviewFilter === 'unsubmitted' ? 'View Progress' : 'Review'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allSubmissions
                                        .filter(sub => sub.form_id === viewingFormSubmissionsId)
                                        .filter(sub => {
                                            if (reviewFilter === 'unsubmitted') return !sub.submitted_at;
                                            if (reviewFilter === 'archived') return sub.current_status?.is_archived;
                                            return sub.submitted_at && !sub.current_status?.is_archived;
                                        }).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <Search size={48} className="mx-auto mb-4 opacity-10 text-text-muted" />
                                                <p className="font-bold text-text-muted">No {reviewFilter} submissions found for this form.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : viewingMyFormSubmissionsId ? (
                    <motion.div
                        key="my_submissions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg/50 border-b border-border">
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Submitted Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mySubmissions
                                        .filter(sub => sub.form_id === viewingMyFormSubmissionsId && sub.submitted_at)
                                        .map(sub => (
                                        <tr key={sub.id} className="hover:bg-bg/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    sub.current_status?.is_passed ? 'bg-green-500/10 text-green-500' :
                                                    sub.current_status?.is_failed ? 'bg-red-500/10 text-red-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {sub.current_status?.name || 'Submitted'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-text-muted">{new Date(sub.submitted_at || sub.created_at).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(
                                                        `/${shortname}/forms/${viewingMyFormSubmissionsId}/submissions/${sub.id}`,
                                                        { state: { from: `/${shortname}/forms/${viewingMyFormSubmissionsId}/my-submissions` } }
                                                    )}
                                                    className="p-2 text-text-muted hover:text-accent transition-colors"
                                                    title="View My Submission"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {mySubmissions.filter(sub => sub.form_id === viewingMyFormSubmissionsId).length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-20 text-center">
                                                <Inbox size={48} className="mx-auto mb-4 opacity-10 text-text-muted" />
                                                <p className="font-bold text-text-muted">You haven't submitted this form yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="available"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {forms.map(form => {
                            const submission = mySubmissions.find(s => s.form_id === form.id);
                            const hasInProgressSubmission = submission && !submission.submitted_at;
                            const hasUnderReviewSubmission = submission && submission.submitted_at && !submission.current_status?.is_archived && !submission.current_status?.is_passed && !submission.current_status?.is_failed;

                            const submissionsCount = allSubmissions.filter(s => s.form_id === form.id && !s.current_status?.is_archived).length;
                            const mySubmissionsCount = mySubmissions.filter(s => s.form_id === form.id).length;

                            const meetsRequirements = true; // Placeholder

                            return (
                                <motion.div
                                    key={form.id}
                                    layout
                                    className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-accent/30 transition-all shadow-lg hover:shadow-xl group"
                                >
                                    {/* Alert Header */}
                                    <div className={`p-3 flex items-center gap-3 border-b border-border/50 ${meetsRequirements ? 'bg-green-500/5 text-green-500' : 'bg-amber-500/5 text-amber-500'}`}>
                                        {meetsRequirements ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {meetsRequirements ? 'You meet the requirements for this form' : 'You do not meet the requirements'}
                                        </span>
                                    </div>

                                    <div className="p-5 flex-1 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded bg-bg border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {form.metadata?.image ? (
                                                    <img src={form.metadata.image} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <FileText size={24} className="text-accent/40" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-text truncate">{form.name}</h3>
                                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">
                                                    {form.metadata?.category || 'General Form'}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-text-muted text-sm line-clamp-3">
                                            {form.description || 'No description provided.'}
                                        </p>

                                        <hr className="border-border/50" />

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    <span>Rank Required: {form.metadata?.rank || 'None'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    <span>Time since last: {form.cooldown_seconds > 0 ? `${form.cooldown_seconds / 3600}h` : 'None'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    <span>Public Form: {form.is_public ? 'Yes' : 'No'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-bg/30 border-t border-border flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => navigate(`/${shortname}/forms/${form.id}/edit`)}
                                                className="p-2 text-text-muted hover:text-accent hover:bg-accent/5 rounded transition-all"
                                                title="Configure"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            {(canModerate || form.created_by === user?.id) && (
                                                <button
                                                    onClick={() => handleDelete(form)}
                                                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/5 rounded transition-all"
                                                    title="Delete Form"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {submission && submission.submitted_at && (
                                                <button
                                                    onClick={() => navigate(
                                                        `/${shortname}/forms/${form.id}/submissions/${submission.id}`,
                                                        { state: { from: `/${shortname}/forms` } }
                                                    )}
                                                    className="px-3 py-1.5 border border-border text-text-muted hover:text-text hover:border-text rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    My Submission
                                                </button>
                                            )}
                                            {canModerate && (
                                                <button
                                                    onClick={() => navigate(`/${shortname}/forms/${form.id}/submissions`)}
                                                    className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                                                >
                                                    Review ({allSubmissions.filter(s => s.form_id === form.id && s.submitted_at && !s.current_status?.is_archived).length})
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (hasInProgressSubmission) {
                                                        navigate(`/${shortname}/forms/${form.id}/submit`);
                                                    } else if (hasUnderReviewSubmission) {
                                                        navigate(
                                                            `/${shortname}/forms/${form.id}/submissions/${submission.id}`,
                                                            { state: { from: `/${shortname}/forms` } }
                                                        );
                                                    } else {
                                                        setPendingStartForm(form);
                                                    }
                                                }}
                                                className="px-5 py-1.5 bg-accent text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-accent/90 shadow-lg shadow-accent/20"
                                            >
                                                {hasInProgressSubmission
                                                    ? (submission?.current_status?.is_passed ? 'Continue' : 'Resume')
                                                    : hasUnderReviewSubmission ? 'Check Status' : 'Submit'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {forms.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-xl text-text-muted">
                                <FileText size={64} className="mb-4 opacity-10" />
                                <p className="font-bold text-lg">No forms available.</p>
                                {canCreate && <p className="text-sm">Click "Create Form" to start building.</p>}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h2 className="text-xl font-bold text-text">Create New Form</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text">
                                    <Plus className="rotate-45" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Form Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newForm.name}
                                        onChange={e => setNewForm({...newForm, name: e.target.value})}
                                        className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors"
                                        placeholder="e.g. Recruitment Application"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Form Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewForm({...newForm, type: 'standard'})}
                                            className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${newForm.type === 'standard' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg border-border text-text-muted hover:border-accent/50'}`}
                                        >
                                            <FileText size={20} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Standard</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewForm({...newForm, type: 'quiz'})}
                                            className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${newForm.type === 'quiz' ? 'bg-purple-500/10 border-purple-500 text-purple-500' : 'bg-bg border-border text-text-muted hover:border-purple-500/50'}`}
                                        >
                                            <BarChart3 size={20} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Quiz</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Description</label>
                                    <textarea
                                        value={newForm.description}
                                        onChange={e => setNewForm({...newForm, description: e.target.value})}
                                        className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors h-24 resize-none"
                                        placeholder="Explain the purpose of this form..."
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-bg/50 rounded border border-border">
                                    <input
                                        type="checkbox"
                                        id="is_public"
                                        checked={newForm.is_public}
                                        onChange={e => setNewForm({...newForm, is_public: e.target.checked})}
                                        className="w-4 h-4 accent-accent"
                                    />
                                    <label htmlFor="is_public" className="text-sm font-medium text-text cursor-pointer">
                                        Allow non-logged in users to submit
                                    </label>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-border text-text-muted rounded font-bold uppercase tracking-widest text-xs hover:bg-bg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2.5 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-colors disabled:opacity-50"
                                    >
                                        {creating ? 'Creating...' : 'Create Form'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Start Application Warning Modal */}
            <AnimatePresence>
                {pendingStartForm && (
                    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPendingStartForm(null)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
                        >
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-text mb-4">Start Application</h2>
                                <p className="text-text-muted text-sm leading-relaxed mb-6">
                                    Opening an application will indicate your interest for the role, however withdrawing your application will incur a cooldown. Are you sure you want to start?
                                </p>

                                {pendingStartForm.requires_gtaw_login && !user?.gtaw_linked && (
                                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2 items-start">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-500">This form requires a linked GTA:W account. Please link your account in Settings first.</p>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setPendingStartForm(null)}
                                        className="px-4 py-2 text-text-muted hover:text-text font-bold uppercase tracking-widest text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={pendingStartForm.requires_gtaw_login && !user?.gtaw_linked}
                                        onClick={() => {
                                            navigate(`/${shortname}/forms/${pendingStartForm.id}/submit`);
                                            setPendingStartForm(null);
                                        }}
                                        className="px-6 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-colors disabled:opacity-50"
                                    >
                                        Start
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FactionForms;
