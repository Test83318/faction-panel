import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Form, FormStage } from '../../../types';
import { Plus, GripVertical, Trash2, Edit2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../ConfirmationProvider';
import SectionManager from './SectionManager';

interface StageManagerProps {
    form: Form;
    shortname: string;
    onUpdate: () => void | Promise<void>;
}

const StageManager: React.FC<StageManagerProps> = ({ form, shortname, onUpdate }) => {
    const [expandedStages, setExpandedStages] = useState<number[]>(form.stages?.length ? [form.stages[0].id] : []);
    const [editingStage, setEditingStage] = useState<number | null>(null);
    const [stageName, setStageName] = useState('');
    const [stageSubmitStatusId, setStageSubmitStatusId] = useState<number | null>(null);
    const [requiredPoints, setRequiredPoints] = useState<number>(0);
    const confirm = useConfirm();
    const [pending, setPending] = useState(false);

    const toggleStage = (id: number) => {
        setExpandedStages(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handleAddStage = async () => {
        setPending(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms/${form.id}/stages`, { name: `Stage ${form.stages?.length ? form.stages.length + 1 : 1}` });
            if (res.data?.id) {
                setExpandedStages(prev => [...prev, res.data.id]);
            }
            await onUpdate();
            toast.success('Stage added');
        } catch (err) {
            toast.error('Failed to add stage');
        } finally {
            setPending(false);
        }
    };

    const handleUpdateStage = async (stageId: number) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/stages/${stageId}`, { 
                name: stageName,
                submit_status_id: stageSubmitStatusId,
                required_points: requiredPoints
            });
            setEditingStage(null);
            await onUpdate();
            toast.success('Stage updated');
        } catch (err) {
            toast.error('Failed to update stage');
        } finally {
            setPending(false);
        }
    };

    const handleDeleteStage = async (stage: FormStage) => {
        const isConfirmed = await confirm({
            title: 'Delete Stage',
            message: `Are you sure you want to delete "${stage.name}" and all its sections?`,
            variant: 'danger'
        });

        if (isConfirmed) {
            setPending(true);
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/stages/${stage.id}`);
                await onUpdate();
                toast.success('Stage deleted');
            } catch (err) {
                toast.error('Failed to delete stage');
            } finally {
                setPending(false);
            }
        }
    };

    const handleReorder = async (newStages: FormStage[]) => {
        // Optimistic update
        // We don't update parent state directly as it's fetched from API
        // But Reorder.Group handles the local drag state
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/stages/reorder`, {
                stage_ids: newStages.map(s => s.id)
            });
            await onUpdate();
        } catch (err) {
            toast.error('Failed to reorder stages');
            await onUpdate(); // Revert
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 text-accent rounded-lg">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text">Form Stages</h2>
                        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Manage the sequential phases of your form</p>
                    </div>
                </div>
                <button 
                    onClick={handleAddStage}
                    disabled={pending}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={16} />
                    Add Stage
                </button>
            </div>

            <Reorder.Group 
                axis="y" 
                values={form.stages || []} 
                onReorder={handleReorder}
                className="space-y-4"
            >
                {form.stages?.map((stage) => (
                    <Reorder.Item 
                        key={stage.id} 
                        value={stage}
                        className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-4 p-4 bg-bg/30 rounded-t-xl">
                            <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text transition-colors">
                                <GripVertical size={20} />
                            </div>
                            
                            <div className="flex-1 flex items-center justify-between">
                                {editingStage === stage.id ? (
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 mr-4">
                                        <div className="flex-1 w-full">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 ml-1">Stage Name</label>
                                            <input 
                                                autoFocus
                                                type="text"
                                                value={stageName}
                                                onChange={e => setStageName(e.target.value)}
                                                className="bg-bg border border-accent rounded px-3 py-1.5 text-sm text-text outline-none w-full"
                                            />
                                        </div>
                                        <div className="w-full md:w-64">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 ml-1">Status on Submission</label>
                                            <select
                                                value={stageSubmitStatusId || ''}
                                                onChange={e => setStageSubmitStatusId(e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-text outline-none font-bold uppercase tracking-wider"
                                            >
                                                <option value="">Default (Submitted)</option>
                                                {form.statuses?.map(status => (
                                                    <option key={status.id} value={status.id}>{status.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {form.type === 'quiz' && (
                                            <div className="w-full md:w-32">
                                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 ml-1">Required Points</label>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    value={requiredPoints}
                                                    onChange={e => setRequiredPoints(parseInt(e.target.value) || 0)}
                                                    className="bg-bg border border-border rounded px-3 py-1.5 text-sm text-text outline-none w-full"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 pt-5">
                                            <button 
                                                onClick={() => handleUpdateStage(stage.id)}
                                                disabled={pending}
                                                className="p-1.5 bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => setEditingStage(null)}
                                                disabled={pending}
                                                className="p-1.5 bg-bg border border-border text-text-muted rounded hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus size={14} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col">
                                        <h3 
                                            className="text-lg font-bold text-text cursor-pointer hover:text-accent transition-colors flex items-center gap-2"
                                            onClick={() => toggleStage(stage.id)}
                                        >
                                            {stage.name}
                                            <span className="text-[10px] font-bold text-text-muted uppercase bg-bg px-1.5 py-0.5 rounded">
                                                Stage {stage.order + 1}
                                            </span>
                                        </h3>
                                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5 flex flex-wrap gap-x-3">
                                            <span>
                                                {stage.submit_status_id 
                                                    ? `Status on Submit: ${form.statuses?.find(s => s.id === stage.submit_status_id)?.name || 'Unknown'}`
                                                    : 'Status on Submit: Default (Submitted)'
                                                }
                                            </span>
                                            {form.type === 'quiz' && stage.required_points !== undefined && (
                                                <span className="text-accent">
                                                    · Required Points: {stage.required_points}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setEditingStage(stage.id);
                                            setStageName(stage.name);
                                            setStageSubmitStatusId(stage.submit_status_id);
                                            setRequiredPoints(stage.required_points || 0);
                                        }}
                                        disabled={pending}
                                        className="p-2 text-text-muted hover:text-accent hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Rename Stage"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteStage(stage)}
                                        disabled={pending}
                                        className="p-2 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete Stage"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => toggleStage(stage.id)}
                                        className="p-2 text-text-muted hover:text-text hover:bg-bg rounded transition-all ml-2"
                                    >
                                        {expandedStages.includes(stage.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {expandedStages.includes(stage.id) && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-border bg-bg/10"
                                >
                                    <div className="p-6">
                                        <SectionManager 
                                            stage={stage} 
                                            form={form} 
                                            shortname={shortname} 
                                            onUpdate={onUpdate} 
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Reorder.Item>
                ))}

                {(!form.stages || form.stages.length === 0) && (
                    <div className="py-12 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-xl text-text-muted">
                        <Layers size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">No stages created yet.</p>
                        <button 
                            onClick={handleAddStage}
                            disabled={pending}
                            className="mt-4 text-accent hover:underline font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add your first stage
                        </button>
                    </div>
                )}
            </Reorder.Group>
        </div>
    );
};

export default StageManager;
