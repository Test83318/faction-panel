import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Form, FormStage, FormSection } from '../../../types';
import { Plus, GripVertical, Trash2, Edit2, Layout, ChevronDown, ChevronUp, Copy, Move } from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../ConfirmationProvider';
import FieldManager from './FieldManager';

interface SectionManagerProps {
    stage: FormStage;
    form: Form;
    shortname: string;
    onUpdate: () => void | Promise<void>;
}

const SectionManager: React.FC<SectionManagerProps> = ({ stage, form, shortname, onUpdate }) => {
    const [expandedSections, setExpandedSections] = useState<number[]>(stage.sections?.length ? [stage.sections[0].id] : []);
    const [editingSection, setEditingSection] = useState<number | null>(null);
    const [sectionForm, setSectionForm] = useState({ name: '', description: '' });
    const confirm = useConfirm();
    const [pending, setPending] = useState(false);

    const toggleSection = (id: number) => {
        setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handleAddSection = async () => {
        setPending(true);
        try {
            const res = await api.post(`/factions/${shortname}/forms/${form.id}/stages/${stage.id}/sections`, { 
                name: `Section ${stage.sections?.length ? stage.sections.length + 1 : 1}`,
                description: ''
            });
            if (res.data?.id) {
                setExpandedSections(prev => [...prev, res.data.id]);
            }
            await onUpdate();
            toast.success('Section added');
        } catch (err) {
            toast.error('Failed to add section');
        } finally {
            setPending(false);
        }
    };

    const handleUpdateSection = async (sectionId: number) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/sections/${sectionId}`, sectionForm);
            setEditingSection(null);
            await onUpdate();
            toast.success('Section updated');
        } catch (err) {
            toast.error('Failed to update section');
        } finally {
            setPending(false);
        }
    };

    const handleDeleteSection = async (section: FormSection) => {
        const isConfirmed = await confirm({
            title: 'Delete Section',
            message: `Are you sure you want to delete "${section.name}" and all its fields?`,
            type: 'danger'
        });

        if (isConfirmed) {
            setPending(true);
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/sections/${section.id}`);
                await onUpdate();
                toast.success('Section deleted');
            } catch (err) {
                toast.error('Failed to delete section');
            } finally {
                setPending(false);
            }
        }
    };

    const handleReorder = async (newSections: FormSection[]) => {
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/stages/${stage.id}/sections/reorder`, {
                section_ids: newSections.map(s => s.id)
            });
            await onUpdate();
        } catch (err) {
            toast.error('Failed to reorder sections');
            await onUpdate();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                    <Layout size={16} className="text-accent" />
                    <h4 className="text-sm font-bold text-text uppercase tracking-widest">Sections</h4>
                </div>
                <button 
                    onClick={handleAddSection}
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent hover:bg-accent/20 rounded font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={14} />
                    Add Section
                </button>
            </div>

            <Reorder.Group 
                axis="y" 
                values={stage.sections || []} 
                onReorder={handleReorder}
                className="space-y-3"
            >
                {stage.sections?.map((section) => (
                    <Reorder.Item 
                        key={section.id} 
                        value={section}
                        className="bg-surface border border-border rounded-lg shadow-sm"
                    >
                        <div className="flex items-center gap-3 p-3 bg-bg/20 rounded-t-lg">
                            <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text transition-colors">
                                <GripVertical size={18} />
                            </div>
                            
                            <div className="flex-1 flex items-center justify-between">
                                {editingSection === section.id ? (
                                    <div className="flex flex-col gap-2 flex-1 mr-4">
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={sectionForm.name}
                                            onChange={e => setSectionForm({...sectionForm, name: e.target.value})}
                                            className="bg-bg border border-accent rounded px-2 py-1 text-sm text-text outline-none w-full"
                                            placeholder="Section Name"
                                        />
                                        <input 
                                            type="text"
                                            value={sectionForm.description}
                                            onChange={e => setSectionForm({...sectionForm, description: e.target.value})}
                                            className="bg-bg border border-border rounded px-2 py-1 text-xs text-text-muted outline-none w-full"
                                            placeholder="Section Description (optional)"
                                        />
                                        <div className="flex gap-2 mt-1">
                                            <button 
                                                onClick={() => handleUpdateSection(section.id)}
                                                disabled={pending}
                                                className="px-3 py-1 bg-accent text-white rounded text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Save
                                            </button>
                                            <button 
                                                onClick={() => setEditingSection(null)}
                                                disabled={pending}
                                                className="px-3 py-1 bg-bg border border-border text-text-muted rounded text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => toggleSection(section.id)}
                                    >
                                        <h4 className="text-sm font-bold text-text flex items-center gap-2">
                                            {section.name}
                                            <span className="text-[9px] font-bold text-text-muted uppercase bg-bg px-1 py-0.5 rounded">
                                                {section.fields?.length || 0} Fields
                                            </span>
                                        </h4>
                                        {section.description && <p className="text-[10px] text-text-muted mt-0.5">{section.description}</p>}
                                    </div>
                                )}

                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => {
                                            setEditingSection(section.id);
                                            setSectionForm({ name: section.name, description: section.description || '' });
                                        }}
                                        disabled={pending}
                                        className="p-1.5 text-text-muted hover:text-accent hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Edit Section"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteSection(section)}
                                        disabled={pending}
                                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete Section"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => toggleSection(section.id)}
                                        className="p-1.5 text-text-muted hover:text-text hover:bg-bg rounded transition-all ml-1"
                                    >
                                        {expandedSections.includes(section.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {expandedSections.includes(section.id) && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-border bg-bg/5"
                                >
                                    <div className="p-4">
                                        <FieldManager 
                                            section={section} 
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

                {(!stage.sections || stage.sections.length === 0) && (
                    <div className="py-8 flex flex-col items-center justify-center bg-surface border border-dashed border-border rounded-lg text-text-muted">
                        <Layout size={32} className="mb-2 opacity-20" />
                        <p className="text-sm font-bold">No sections in this stage.</p>
                        <button 
                            onClick={handleAddSection}
                            disabled={pending}
                            className="mt-2 text-accent hover:underline font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add your first section
                        </button>
                    </div>
                )}
            </Reorder.Group>
        </div>
    );
};

export default SectionManager;
