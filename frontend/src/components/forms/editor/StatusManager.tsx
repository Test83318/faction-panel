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
    onUpdate: () => void | Promise<void>;
}

const StatusManager: React.FC<StatusManagerProps> = ({ form, shortname, onUpdate }) => {
    const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
    const [statusForm, setStatusForm] = useState<Partial<FormStatus>>({});
    const [pending, setPending] = useState(false);
    const confirm = useConfirm();

    const handleAddStatus = async () => {
        setPending(true);
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
            await onUpdate();
            toast.success('Status added');
        } catch (err) {
            toast.error('Failed to add status');
        } finally {
            setPending(false);
        }
    };

    const handleUpdateStatus = async (statusId: number) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/statuses/${statusId}`, statusForm);
            setEditingStatusId(null);
            await onUpdate();
            toast.success('Status updated');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setPending(false);
        }
    };

    const handleDeleteStatus = async (status: FormStatus) => {
        const isConfirmed = await confirm({
            title: 'Delete Status',
            message: `Are you sure you want to delete "${status.name}"?`,
            variant: 'danger'
        });

        if (isConfirmed) {
            setPending(true);
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/statuses/${status.id}`);
                await onUpdate();
                toast.success('Status deleted');
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to delete status');
            } finally {
                setPending(false);
            }
        }
    };

    const handleReorder = async (newStatuses: FormStatus[]) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/statuses/reorder`, {
                status_ids: newStatuses.map(s => s.id)
            });
            await onUpdate();
        } catch (err) {
            toast.error('Failed to reorder statuses');
            await onUpdate();
        } finally {
            setPending(false);
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
                    disabled={pending}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onReorder={pending ? () => {} : handleReorder}
                className="space-y-3"
            >
                {form.statuses?.map((status) => {
                    const isPendingStatus = status.system_key === 'pending';
                    const isSystemStatus = status.system_key === 'submitted' || status.system_key === 'pending';
                    return (
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
                                                disabled={pending}
                                                className="w-full bg-bg border border-accent rounded px-3 py-2 text-sm text-text outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Status Name"
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Stage Bindings (Visible on Selected Stages)</label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    disabled={isPendingStatus}
                                                    onClick={() => !isPendingStatus && setStatusForm({ ...statusForm, stage_ids: [] })}
                                                    className={`px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition-all ${
                                                        isPendingStatus ? 'opacity-50 cursor-not-allowed' : ''
                                                    } ${
                                                        (!statusForm.stage_ids || statusForm.stage_ids.length === 0)
                                                            ? 'bg-accent text-white border-accent shadow-sm'
                                                            : 'bg-bg border-border text-text-muted hover:border-accent/50'
                                                    }`}
                                                >
                                                    Global (All Stages)
                                                </button>
                                                {form.stages?.map(stage => {
                                                    const isSelected = statusForm.stage_ids?.includes(stage.id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={stage.id}
                                                            disabled={isPendingStatus}
                                                            onClick={() => {
                                                                if (isPendingStatus) return;
                                                                const currentIds = statusForm.stage_ids || [];
                                                                const newIds = isSelected
                                                                    ? currentIds.filter(id => id !== stage.id)
                                                                    : [...currentIds, stage.id];
                                                                setStatusForm({ ...statusForm, stage_ids: newIds });
                                                            }}
                                                            className={`px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition-all ${
                                                                isPendingStatus ? 'opacity-50 cursor-not-allowed' : ''
                                                            } ${
                                                                isSelected
                                                                    ? 'bg-accent/10 border-accent text-accent shadow-sm'
                                                                    : 'bg-bg border-border text-text-muted hover:border-accent/50'
                                                            }`}
                                                        >
                                                            {stage.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {isPendingStatus && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-600 dark:text-yellow-400">
                                            <strong>Core System Status:</strong> Status settings and stage bindings are locked for the Pending draft state. Only the status name can be customized.
                                        </div>
                                    )}

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
                                                onClick={() => !pending && !isPendingStatus && setStatusForm({...statusForm, [opt.id]: !statusForm[opt.id as keyof FormStatus]})}
                                                className={`flex flex-col gap-1 p-3 rounded border cursor-pointer transition-all ${pending || isPendingStatus ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${statusForm[opt.id as keyof FormStatus] ? 'bg-accent/10 border-accent text-accent' : 'bg-bg border-border text-text-muted hover:border-accent/50'}`}
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
                                            disabled={pending}
                                            className="px-4 py-2 bg-accent text-white rounded text-xs font-bold uppercase tracking-wider shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save Status
                                        </button>
                                        <button 
                                            onClick={() => setEditingStatusId(null)}
                                            disabled={pending}
                                            className="px-4 py-2 bg-bg border border-border text-text-muted rounded text-xs font-bold uppercase tracking-wider hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            {isSystemStatus && (
                                                <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 uppercase tracking-wider">
                                                    System Status
                                                </span>
                                            )}
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
                                            {status.system_key === 'submitted' ? 'Default Entry Status' : (
                                                status.system_key === 'pending' ? 'Core Draft Status' : (
                                                    <>
                                                        Custom Status ({status.order})
                                                        {(!status.stage_ids || status.stage_ids.length === 0) ? (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded border border-green-500/20 text-[9px]">
                                                                Global
                                                            </span>
                                                        ) : (
                                                            status.stage_ids.map(stageId => {
                                                                const stageName = form.stages?.find(s => s.id === stageId)?.name;
                                                                if (!stageName) return null;
                                                                return (
                                                                    <span key={stageId} className="ml-2 px-1.5 py-0.5 bg-accent/10 text-accent rounded border border-accent/20 text-[9px]">
                                                                        {stageName}
                                                                    </span>
                                                                );
                                                            })
                                                        )}
                                                    </>
                                                )
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover/status:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setEditingStatusId(status.id);
                                                setStatusForm(status);
                                            }}
                                            disabled={pending}
                                            className="p-2 text-text-muted hover:text-accent hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Edit Status"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        {!isSystemStatus && status.name !== 'Submitted' && (
                                            <button 
                                                onClick={() => handleDeleteStatus(status)}
                                                disabled={pending}
                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete Status"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Reorder.Item>
                    );
                })}
            </Reorder.Group>
        </div>
    );
};

export default StatusManager;
