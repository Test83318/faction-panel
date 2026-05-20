import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
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
    Search
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
    const [activeForm, setActiveForm] = useState<Form | null>(null);
    const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'available' | 'my_submissions' | 'review'>('available');
    const [reviewFilter, setReviewFilter] = useState<'pending' | 'archived'>('pending');
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({
        name: '',
        type: 'standard' as 'standard' | 'quiz',
        description: '',
        is_public: false
    });

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms`, newForm);
            setForms([...forms, res.data]);
            setShowCreateModal(false);
            setNewForm({ name: '', type: 'standard', description: '', is_public: false });
            toast.success('Form created successfully!');
            handleOpenEditor(res.data);
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

    const handleOpenEditor = (form: Form) => {
        setActiveForm(form);
        setIsEditing(true);
    };

    if (loading) return <Loading message="Loading Forms..." />;

    if (isEditing && activeForm) {
        return (
            <FormEditor 
                form={activeForm} 
                shortname={shortname} 
                onClose={() => {
                    setIsEditing(false);
                    setActiveForm(null);
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
                    setIsSubmitting(false);
                    setActiveForm(null);
                    fetchForms();
                }} 
            />
        );
    }

    if (isReviewing && activeSubmissionId) {
        return (
            <FormSubmissionReview 
                submissionId={activeSubmissionId}
                shortname={shortname}
                onClose={() => {
                    setIsReviewing(false);
                    setActiveSubmissionId(null);
                    fetchForms();
                }}
                user={user}
            />
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                        <FileText className="text-accent" />
                        Faction Forms
                    </h1>
                    <p className="text-text-muted text-sm mt-1">Create and manage applications, quizzes, and dynamic forms.</p>
                </div>
                {canCreate && (
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                    >
                        <Plus size={16} />
                        Create Form
                    </button>
                )}
            </div>

            <div className="flex gap-4 border-b border-border">
                <button 
                    onClick={() => setActiveTab('available')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'available' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
                >
                    Available Forms
                    {activeTab === 'available' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('my_submissions')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'my_submissions' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
                >
                    My Submissions
                    {mySubmissions.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-accent text-white text-[10px] rounded-full">{mySubmissions.length}</span>}
                    {activeTab === 'my_submissions' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />}
                </button>
                {canModerate && (
                    <button 
                        onClick={() => setActiveTab('review')}
                        className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'review' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
                    >
                        Review Submissions
                        {allSubmissions.filter(s => !s.current_status?.is_archived).length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">
                                {allSubmissions.filter(s => !s.current_status?.is_archived).length}
                            </span>
                        )}
                        {activeTab === 'review' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />}
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'available' ? (
                    <motion.div 
                        key="available"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {forms.map(form => (
                            <motion.div 
                                key={form.id}
                                layout
                                className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-accent/30 transition-all shadow-sm"
                            >
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${form.type === 'quiz' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {form.type}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {form.is_public && <Eye size={14} className="text-green-500" title="Public Form" />}
                                            {!form.is_enabled && <EyeOff size={14} className="text-red-500" title="Disabled" />}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-text mb-2">{form.name}</h3>
                                    <p className="text-text-muted text-sm line-clamp-2 mb-4">
                                        {form.description || 'No description provided.'}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {form.cooldown_seconds > 0 ? `${form.cooldown_seconds / 3600}h CD` : 'No Cooldown'}
                                        </div>
                                        {form.type === 'quiz' && (
                                            <div className="flex items-center gap-1">
                                                <BarChart3 size={12} />
                                                Quiz
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-bg/50 border-t border-border flex items-center justify-between">
                                    <button 
                                        onClick={() => handleOpenEditor(form)}
                                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-accent transition-colors"
                                    >
                                        <Settings size={14} />
                                        Configure
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setActiveForm(form);
                                                setIsSubmitting(true);
                                            }}
                                            className="px-3 py-1.5 bg-accent text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-accent/90"
                                        >
                                            Apply
                                        </button>
                                        {(canModerate || form.created_by === user?.id) && (
                                            <button 
                                                onClick={() => handleDelete(form)}
                                                className="p-2 text-text-muted hover:text-red-500 transition-colors" 
                                                title="Delete Form"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {forms.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-xl text-text-muted">
                                <FileText size={64} className="mb-4 opacity-10" />
                                <p className="font-bold text-lg">No forms available.</p>
                                {canCreate && <p className="text-sm">Click "Create Form" to start building.</p>}
                            </div>
                        )}
                    </motion.div>
                ) : activeTab === 'my_submissions' ? (
                    <motion.div 
                        key="submissions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg/50 border-b border-border">
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Form Name</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Submitted Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mySubmissions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-bg/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-text">{sub.form?.name}</span>
                                            </td>
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
                                                    onClick={() => {
                                                        setActiveSubmissionId(sub.id);
                                                        setIsReviewing(true);
                                                    }}
                                                    className="p-2 text-text-muted hover:text-accent transition-colors"
                                                    title="View My Submission"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {mySubmissions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <Inbox size={48} className="mx-auto mb-4 opacity-10 text-text-muted" />
                                                <p className="font-bold text-text-muted">You haven't submitted any forms yet.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="review"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setReviewFilter('pending')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${reviewFilter === 'pending' ? 'bg-accent text-white' : 'bg-bg border border-border text-text-muted hover:border-accent/50'}`}
                            >
                                Pending
                            </button>
                            <button 
                                onClick={() => setReviewFilter('archived')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${reviewFilter === 'archived' ? 'bg-accent text-white' : 'bg-bg border border-border text-text-muted hover:border-accent/50'}`}
                            >
                                Archived
                            </button>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg/50 border-b border-border">
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">User</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Form</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {allSubmissions
                                        .filter(sub => reviewFilter === 'archived' ? sub.current_status?.is_archived : !sub.current_status?.is_archived)
                                        .map(sub => (
                                        <tr key={sub.id} className="hover:bg-bg/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                                        {sub.user?.username[0].toUpperCase() || 'G'}
                                                    </div>
                                                    <span className="text-sm font-bold text-text">{sub.user?.username || 'Guest'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-text">{sub.form?.name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    sub.current_status?.is_passed ? 'bg-green-500/10 text-green-500' :
                                                    sub.current_status?.is_failed ? 'bg-red-500/10 text-red-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {sub.current_status?.name || 'Submitted'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setActiveSubmissionId(sub.id);
                                                        setIsReviewing(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-accent/10 text-accent rounded text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allSubmissions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <Search size={48} className="mx-auto mb-4 opacity-10 text-text-muted" />
                                                <p className="font-bold text-text-muted">No submissions found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal (unchanged) */}
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
        </div>
    );
};

export default FactionForms;
