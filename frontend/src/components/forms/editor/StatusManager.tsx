import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Form, FormStatus } from '../../../types';
import { 
    Plus, 
    GripVertical, 
    Trash2, 
    Edit2, 
    CheckSquare, 
    Lock, 
    EyeOff, 
    Archive, 
    CheckCircle2, 
    XCircle,
    Ban
} from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../ConfirmationProvider';

interface StatusManagerProps {
    form: Form;
    shortname: string;
    onUpdate: () => void;
}

const StatusManager: React.FC<StatusManagerProps> = ({ form, shortname, onUpdate }) => {
    const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
    const [statusForm, setStatusForm] = useState<Partial<FormStatus>>({});
    const confirm = useConfirm();

    const handleAddStatus = async () => {
        try {
            await api.post(`/factions/${shortname}/forms/${form.id}/statuses`, {
                name: 'New Status',
                is_hidden: false,
                is_locked: false,
                is_closed: false,
                is_failed: false,
                is_passed: false,
                is_archived: false
            });
            onUpdate();
            toast.success('Status added');
        } catch (err) {
            toast.error('Failed to add status');
        }
    };

    const handleUpdateStatus = async (statusId: number) => {
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/statuses/${statusId}`, statusForm);
            setEditingStatusId(null);
            onUpdate();
            toast.success('Status updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteStatus = async (status: FormStatus) => {
        const isConfirmed = await confirm({
            title: 'Delete Status',
            message: `Are you sure you want to delete "${status.name}"?`,
            type: 'danger'
        });

        if (isConfirmed) {
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/statuses/${status.id}`);
                onUpdate();
                toast.success('Status deleted');
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to delete status');
            }
        }
    };

    const handleReorder = async (newStatuses: FormStatus[]) => {
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/statuses/reorder`, {
                status_ids: newStatuses.map(s => s.id)
            });
            onUpdate();
        } catch (err) {
            toast.error('Failed to reorder statuses');
            onUpdate();
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-text">Form Statuses</h2>
                    <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Define the lifecycle stages of a submission</p>
                </div>
                <button 
                    onClick={handleAddStatus}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                >
                    <Plus size={16} />
                    Add Status
                </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-4 items-start">
                <div className="p-2 bg-blue-500 text-white rounded-lg">
                    <CheckSquare size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-500 uppercase tracking-widest">About Statuses</h4>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Statuses allow you to track the progress of a form submission. You can define custom behaviors for each status, such as locking the form from edits, hiding it from the submitter, or marking it as a final pass/fail.
                    </p>
                </div>
            </div>

            <Reorder.Group 
                axis="y" 
                values={form.statuses || []} 
                onReorder={handleReorder}
                className="space-y-3"
            >
                {form.statuses?.map((status) => (
                    <Reorder.Item 
                        key={status.id} 
                        value={status}
                        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group/status"
                    >
                        {editingStatusId === status.id ? (
                            <div className="p-5 space-y-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                    <div className="flex-1 w-full">
                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Status Name</label>
                                        <input 
                                            type="text"
                                            value={statusForm.name}
                                            onChange={e => setStatusForm({...statusForm, name: e.target.value})}
                                            className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-text outline-none"
                                            placeholder="Status Name"
                                        />
                                    </div>
                                    <div className="w-full md:w-64">
                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Stage Binding</label>
                                        <select
                                            value={statusForm.form_stage_id || ''}
                                            onChange={e => setStatusForm({...statusForm, form_stage_id: e.target.value ? parseInt(e.target.value) : null})}
                                            className="w-full bg-bg border border-border rounded px-3 py-2.5 text-xs text-text outline-none font-bold uppercase tracking-wider"
                                        >
                                            <option value="">Global Status</option>
                                            {form.stages?.map(stage => (
                                                <option key={stage.id} value={stage.id}>Stage: {stage.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'is_hidden', label: 'Hidden', icon: <EyeOff size={14} />, desc: 'Hide from submitter' },
                                        { id: 'is_locked', label: 'Locked', icon: <Lock size={14} />, desc: 'Submitter cannot edit' },
                                        { id: 'is_closed', label: 'Closed', icon: <Ban size={14} />, desc: 'Final stage / No review' },
                                        { id: 'is_failed', label: 'Failed', icon: <XCircle size={14} />, desc: 'Mark as failed' },
                                        { id: 'is_passed', label: 'Passed', icon: <CheckCircle2 size={14} />, desc: 'Mark as passed' },
                                        { id: 'is_archived', label: 'Archived', icon: <Archive size={14} />, desc: 'Move to archives' },
                                    ].map(opt => (
                                        <div 
                                            key={opt.id}
                                            onClick={() => setStatusForm({...statusForm, [opt.id]: !statusForm[opt.id as keyof FormStatus]})}
                                            className={`flex flex-col gap-1 p-3 rounded border cursor-pointer transition-all ${statusForm[opt.id as keyof FormStatus] ? 'bg-accent/10 border-accent text-accent' : 'bg-bg border-border text-text-muted hover:border-accent/50'}`}
                                        >
                                            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                                                {opt.icon}
                                                {opt.label}
                                            </div>
                                            <span className="text-[9px] opacity-70 italic">{opt.desc}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 justify-end pt-2 border-t border-border">
                                    <button 
                                        onClick={() => handleUpdateStatus(status.id)}
                                        className="px-4 py-2 bg-accent text-white rounded text-xs font-bold uppercase tracking-wider shadow-lg shadow-accent/20"
                                    >
                                        Save Status
                                    </button>
                                    <button 
                                        onClick={() => setEditingStatusId(null)}
                                        className="px-4 py-2 bg-bg border border-border text-text-muted rounded text-xs font-bold uppercase tracking-wider hover:text-text transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 p-4">
                                <div className="cursor-grab active:cursor-grabbing text-text-muted/30 group-hover/status:text-text-muted transition-colors">
                                    <GripVertical size={20} />
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-base font-bold text-text">{status.name}</h4>
                                        <div className="flex items-center gap-1.5">
                                            {status.is_hidden && <div className="p-1 bg-gray-500/20 text-gray-500 rounded" title="Hidden"><EyeOff size={12} /></div>}
                                            {status.is_locked && <div className="p-1 bg-orange-500/20 text-orange-500 rounded" title="Locked"><Lock size={12} /></div>}
                                            {status.is_closed && <div className="p-1 bg-red-500/20 text-red-500 rounded" title="Closed"><Ban size={12} /></div>}
                                            {status.is_passed && <div className="p-1 bg-green-500/20 text-green-500 rounded" title="Passed"><CheckCircle2 size={12} /></div>}
                                            {status.is_failed && <div className="p-1 bg-red-500/20 text-red-500 rounded" title="Failed"><XCircle size={12} /></div>}
                                            {status.is_archived && <div className="p-1 bg-blue-500/20 text-blue-500 rounded" title="Archived"><Archive size={12} /></div>}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                        {status.name === 'Submitted' ? 'Default Entry Status' : (
                                            <>
                                                Custom Status ({status.order})
                                                {status.form_stage_id && (
                                                    <span className="ml-2 px-1.5 py-0.5 bg-accent/10 text-accent rounded border border-accent/20">
                                                        Bound to: {form.stages?.find(s => s.id === status.form_stage_id)?.name || 'Unknown Stage'}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover/status:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setEditingStatusId(status.id);
                                            setStatusForm(status);
                                        }}
                                        className="p-2 text-text-muted hover:text-accent hover:bg-bg rounded transition-all"
                                        title="Edit Status"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {status.name !== 'Submitted' && (
                                        <button 
                                            onClick={() => handleDeleteStatus(status)}
                                            className="p-2 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-all"
                                            title="Delete Status"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </div>
    );
};

export default StatusManager;
