import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../../../api';
import Loading from '../../Loading';
import { 
    ArrowLeft, 
    MessageSquare, 
    CheckCircle, 
    XCircle, 
    Clock, 
    User, 
    Calendar,
    Send,
    Lock,
    Eye,
    Shield
} from 'lucide-react';

interface FormSubmissionReviewProps {
    submissionId: number;
    shortname: string;
    onClose: () => void;
    user: any;
}

const FormSubmissionReview: React.FC<FormSubmissionReviewProps> = ({ submissionId, shortname, onClose, user }) => {
    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [grades, setGrades] = useState<Record<number, { points: number, comment: string }>>({});
    const [grading, setGrading] = useState(false);

    const fetchSubmission = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/forms/submissions/${submissionId}`);
            setSubmission(res.data);
            
            // Initialize grades if quiz
            if (res.data.form.type === 'quiz') {
                const initialGrades: Record<number, { points: number, comment: string }> = {};
                res.data.responses.forEach((resp: any) => {
                    initialGrades[resp.id] = {
                        points: resp.points_awarded || 0,
                        comment: resp.reviewer_comment || ''
                    };
                });
                setGrades(initialGrades);
            }
        } catch (err) {
            toast.error('Failed to fetch submission');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmittingComment(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms/submissions/${submissionId}/comments`, {
                comment,
                is_internal: isInternal
            });
            setSubmission({
                ...submission,
                comments: [...submission.comments, res.data]
            });
            setComment('');
            toast.success('Comment added');
        } catch (err) {
            toast.error('Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleUpdateStatus = async (statusId: number) => {
        setUpdatingStatus(true);
        try {
            const res = await api.put(`/factions/${shortname}/forms/submissions/${submissionId}/status`, {
                status_id: statusId
            });
            setSubmission({
                ...submission,
                current_status: res.data.submission.current_status,
                current_status_id: res.data.submission.current_status_id
            });
            toast.success('Status updated');
        } catch (err) {
            toast.error('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleGradeResponses = async () => {
        setGrading(true);
        try {
            const gradesPayload = Object.entries(grades).map(([id, data]) => ({
                response_id: parseInt(id),
                points: (data as { points: number }).points,
                comment: (data as { comment: string }).comment
            }));

            await api.post(`/factions/${shortname}/forms/submissions/${submissionId}/grade`, {
                grades: gradesPayload
            });
            toast.success('Responses graded');
            fetchSubmission();
        } catch (err) {
            toast.error('Failed to grade responses');
        } finally {
            setGrading(false);
        }
    };

    if (loading) return <Loading message="Loading Submission..." />;

    return (
        <div className="flex flex-col h-full bg-bg">
            {/* Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-bg rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-text flex items-center gap-2">
                            {submission.form.name}
                            <span className="text-xs font-normal text-text-muted">#{submission.id}</span>
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-text-muted font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <User size={14} />
                                {submission.user?.username || 'Guest'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                        submission.current_status?.is_passed ? 'bg-green-500/10 text-green-500' :
                        submission.current_status?.is_failed ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                    }`}>
                        {submission.current_status?.name || 'Submitted'}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content: Responses */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {submission.responses.map((resp: any) => (
                        <div key={resp.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                    {resp.field.label}
                                </label>
                                {submission.form.type === 'quiz' && (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number"
                                            value={grades[resp.id]?.points || 0}
                                            onChange={e => setGrades({...grades, [resp.id]: {...grades[resp.id], points: parseInt(e.target.value)}})}
                                            className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs font-bold focus:border-accent outline-none"
                                            max={resp.field.points}
                                        />
                                        <span className="text-[10px] font-bold text-text-muted">/ {resp.field.points} PTS</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-text text-sm whitespace-pre-wrap bg-bg/50 p-4 rounded border border-border">
                                {resp.value || <span className="italic text-text-muted">No response provided.</span>}
                            </div>

                            {submission.form.type === 'quiz' && (
                                <div className="mt-4">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">Grading Comment</label>
                                    <textarea 
                                        value={grades[resp.id]?.comment || ''}
                                        onChange={e => setGrades({...grades, [resp.id]: {...grades[resp.id], comment: e.target.value}})}
                                        className="w-full bg-bg border border-border rounded p-2 text-xs text-text focus:border-accent outline-none transition-colors h-16 resize-none"
                                        placeholder="Add a comment for this response..."
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {submission.form.type === 'quiz' && (
                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={handleGradeResponses}
                                disabled={grading}
                                className="px-6 py-2 bg-purple-500 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                {grading ? 'Saving Grades...' : 'Save All Grades'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar: Status & Comments */}
                <div className="w-96 border-l border-border bg-card/50 flex flex-col overflow-hidden">
                    {/* Status Management */}
                    <div className="p-6 border-b border-border">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield size={14} />
                            Manage Status
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {submission.form.statuses?.map((status: any) => (
                                <button 
                                    key={status.id}
                                    onClick={() => handleUpdateStatus(status.id)}
                                    disabled={updatingStatus || submission.current_status_id === status.id}
                                    className={`w-full text-left px-4 py-2.5 rounded border text-xs font-bold uppercase tracking-widest transition-all ${
                                        submission.current_status_id === status.id 
                                        ? 'bg-accent/10 border-accent text-accent' 
                                        : 'bg-bg border-border text-text-muted hover:border-accent/50'
                                    } disabled:opacity-80`}
                                >
                                    {status.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-4 bg-bg/30 border-b border-border flex justify-between items-center">
                            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={12} />
                                Discussion
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {submission.comments?.map((c: any) => (
                                <div key={c.id} className={`flex flex-col ${c.is_internal ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-bg/50 border border-border'} p-3 rounded-lg`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-text">{c.user.username}</span>
                                        <div className="flex items-center gap-2">
                                            {c.is_internal && <Lock size={10} className="text-amber-500" title="Internal Only" />}
                                            <span className="text-[10px] text-text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-muted whitespace-pre-wrap">{c.comment}</p>
                                </div>
                            ))}
                            {(!submission.comments || submission.comments.length === 0) && (
                                <div className="text-center py-8 opacity-20 flex flex-col items-center">
                                    <MessageSquare size={32} />
                                    <p className="text-[10px] font-bold uppercase mt-2">No comments yet</p>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAddComment} className="p-4 border-t border-border bg-card">
                            <textarea 
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                className="w-full bg-bg border border-border rounded p-2 text-xs text-text focus:border-accent outline-none transition-colors h-20 resize-none mb-3"
                                placeholder="Type your comment..."
                            />
                            <div className="flex items-center justify-between">
                                {submission.can_moderate && (
                                   <label className="flex items-center gap-2 cursor-pointer group">
                                       <input
                                           type="checkbox"
                                           checked={isInternal}
                                           onChange={e => setIsInternal(e.target.checked)}
                                           className="w-3 h-3 accent-amber-500"
                                       />
                                       <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-amber-500 transition-colors">Internal Only</span>
                                   </label>
                                )}

                                <button 
                                    type="submit"
                                    disabled={submittingComment || !comment.trim()}
                                    className="p-2 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormSubmissionReview;
