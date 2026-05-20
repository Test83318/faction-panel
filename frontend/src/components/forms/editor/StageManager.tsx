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
    onUpdate: () => void;
}

const StageManager: React.FC<StageManagerProps> = ({ form, shortname, onUpdate }) => {
    const [expandedStages, setExpandedStages] = useState<number[]>(form.stages?.length ? [form.stages[0].id] : []);
    const [editingStage, setEditingStage] = useState<number | null>(null);
    const [stageName, setStageName] = useState('');
    const confirm = useConfirm();

    const toggleStage = (id: number) => {
        setExpandedStages(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handleAddStage = async () => {
        try {
            await api.post(`/factions/${shortname}/forms/${form.id}/stages`, { name: `Stage ${form.stages?.length ? form.stages.length + 1 : 1}` });
            onUpdate();
            toast.success('Stage added');
        } catch (err) {
            toast.error('Failed to add stage');
        }
    };

    const handleUpdateStage = async (stageId: number) => {
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/stages/${stageId}`, { name: stageName });
            setEditingStage(null);
            onUpdate();
            toast.success('Stage updated');
        } catch (err) {
            toast.error('Failed to update stage');
        }
    };

    const handleDeleteStage = async (stage: FormStage) => {
        const isConfirmed = await confirm({
            title: 'Delete Stage',
            message: `Are you sure you want to delete "${stage.name}" and all its sections?`,
            type: 'danger'
        });

        if (isConfirmed) {
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/stages/${stage.id}`);
                onUpdate();
                toast.success('Stage deleted');
            } catch (err) {
                toast.error('Failed to delete stage');
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
            onUpdate();
        } catch (err) {
            toast.error('Failed to reorder stages');
            onUpdate(); // Revert
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
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
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
                                    <div className="flex items-center gap-2 flex-1 mr-4">
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={stageName}
                                            onChange={e => setStageName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUpdateStage(stage.id)}
                                            className="bg-bg border border-accent rounded px-3 py-1.5 text-sm text-text outline-none w-full"
                                        />
                                        <button 
                                            onClick={() => handleUpdateStage(stage.id)}
                                            className="p-1.5 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setEditingStage(null)}
                                            className="p-1.5 bg-bg border border-border text-text-muted rounded hover:text-text transition-colors"
                                        >
                                            <Plus size={14} className="rotate-45" />
                                        </button>
                                    </div>
                                ) : (
                                    <h3 
                                        className="text-lg font-bold text-text cursor-pointer hover:text-accent transition-colors flex items-center gap-2"
                                        onClick={() => toggleStage(stage.id)}
                                    >
                                        {stage.name}
                                        <span className="text-[10px] font-bold text-text-muted uppercase bg-bg px-1.5 py-0.5 rounded">
                                            Stage {stage.order + 1}
                                        </span>
                                    </h3>
                                )}

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            setEditingStage(stage.id);
                                            setStageName(stage.name);
                                        }}
                                        className="p-2 text-text-muted hover:text-accent hover:bg-bg rounded transition-all"
                                        title="Rename Stage"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteStage(stage)}
                                        className="p-2 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-all"
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
                            className="mt-4 text-accent hover:underline font-bold text-sm uppercase tracking-widest"
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
