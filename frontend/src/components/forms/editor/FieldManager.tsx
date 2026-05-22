import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Form, FormSection, FormField } from '../../../types';
import { 
    Plus, 
    GripVertical, 
    Trash2, 
    Edit2, 
    Type, 
    CheckSquare, 
    ChevronDown, 
    ChevronUp, 
    List, 
    Hash, 
    ToggleLeft,
    Columns,
    PlusCircle,
    Info,
    Trophy,
    Zap,
    Code
} from 'lucide-react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../ConfirmationProvider';

interface FieldManagerProps {
    section: FormSection;
    form: Form;
    shortname: string;
    onUpdate: () => void | Promise<void>;
}

const FIELD_TYPES = [
    { id: 'text', label: 'Text Field', icon: <Type size={16} /> },
    { id: 'textarea', label: 'Text Area', icon: <Type size={16} /> },
    { id: 'select', label: 'Dropdown', icon: <ChevronDown size={16} /> },
    { id: 'radio', label: 'Radio Buttons', icon: <PlusCircle size={16} /> },
    { id: 'toggle', label: 'Toggle Switch', icon: <ToggleLeft size={16} /> },
    { id: 'html', label: 'Custom HTML', icon: <Code size={16} /> },
];

const PREFILL_TYPES = [
    { id: 'character_id', label: 'Character ID' },
    { id: 'character_name', label: 'Character Name' },
    { id: 'faction', label: 'Faction ID' },
    { id: 'faction_name', label: 'Faction Name' },
    { id: 'faction_rank', label: 'Faction Rank (Numeric)' },
    { id: 'faction_rank_name', label: 'Faction Rank (Name)' },
];

const FieldManager: React.FC<FieldManagerProps> = ({ section, form, shortname, onUpdate }) => {
    const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
    const [fieldForm, setFieldForm] = useState<Partial<FormField>>({});
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [pending, setPending] = useState(false);
    const confirm = useConfirm();

    const handleAddField = async (type: string) => {
        setPending(true);
        try {
            await api.post(`/factions/${shortname}/forms/${form.id}/sections/${section.id}/fields`, {
                type,
                label: `New ${type.replace('_', ' ')} field`,
                name: `${type}_${Date.now()}`,
                is_required: false,
                points: 0,
                is_automatic_scored: false
            });
            setShowTypeSelector(false);
            await onUpdate();
            toast.success('Field added');
        } catch (err) {
            toast.error('Failed to add field');
        } finally {
            setPending(false);
        }
    };

    const handleUpdateField = async (fieldId: number) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/fields/${fieldId}`, fieldForm);
            setEditingFieldId(null);
            await onUpdate();
            toast.success('Field updated');
        } catch (err) {
            toast.error('Failed to update field');
        } finally {
            setPending(false);
        }
    };

    const handleDeleteField = async (field: FormField) => {
        const isConfirmed = await confirm({
            title: 'Delete Field',
            message: `Are you sure you want to delete "${field.label}"?`,
            variant: 'danger'
        });

        if (isConfirmed) {
            setPending(true);
            try {
                await api.delete(`/factions/${shortname}/forms/${form.id}/fields/${field.id}`);
                await onUpdate();
                toast.success('Field deleted');
            } catch (err) {
                toast.error('Failed to delete field');
            } finally {
                setPending(false);
            }
        }
    };

    const handleReorder = async (newFields: FormField[]) => {
        setPending(true);
        try {
            await api.put(`/factions/${shortname}/forms/${form.id}/sections/${section.id}/fields/reorder`, {
                field_ids: newFields.map(f => f.id)
            });
            await onUpdate();
        } catch (err) {
            toast.error('Failed to reorder fields');
            await onUpdate();
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="space-y-4">
            <Reorder.Group 
                axis="y" 
                values={section.fields || []} 
                onReorder={handleReorder}
                className="space-y-2"
            >
                {section.fields?.map((field) => (
                    <Reorder.Item 
                        key={field.id} 
                        value={field}
                        className="bg-bg border border-border rounded p-3 hover:border-accent/30 transition-colors group/field"
                    >
                        {editingFieldId === field.id ? (
                            field.type === 'html' ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Label (Builder Reference)</label>
                                            <input 
                                                type="text"
                                                value={fieldForm.label || ''}
                                                onChange={e => setFieldForm({...fieldForm, label: e.target.value})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Technical Name (Unique)</label>
                                            <input 
                                                type="text"
                                                value={fieldForm.name || ''}
                                                onChange={e => setFieldForm({...fieldForm, name: e.target.value})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Column Width</label>
                                            <select 
                                                value={fieldForm.width ?? 12}
                                                onChange={e => setFieldForm({...fieldForm, width: parseInt(e.target.value) || 12})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
                                                    <option key={w} value={w}>{w} / 12 Columns</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">HTML Content</label>
                                            <textarea 
                                                value={fieldForm.default_value || ''}
                                                onChange={e => setFieldForm({...fieldForm, default_value: e.target.value})}
                                                className="w-full bg-surface border border-border rounded p-2 text-xs font-mono text-text outline-none focus:border-accent h-36"
                                                placeholder="<p>Write your custom HTML here...</p>"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => handleUpdateField(field.id)}
                                            disabled={pending}
                                            className="px-4 py-1.5 bg-accent text-white rounded text-xs font-bold uppercase tracking-wider shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            onClick={() => setEditingFieldId(null)}
                                            disabled={pending}
                                            className="px-4 py-1.5 bg-bg border border-border text-text-muted rounded text-xs font-bold uppercase tracking-wider hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Label</label>
                                            <input 
                                                type="text"
                                                value={fieldForm.label || ''}
                                                onChange={e => setFieldForm({...fieldForm, label: e.target.value})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Technical Name (Unique)</label>
                                            <input 
                                                type="text"
                                                value={fieldForm.name || ''}
                                                onChange={e => setFieldForm({...fieldForm, name: e.target.value})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Description / Instructions</label>
                                            <input 
                                                type="text"
                                                value={fieldForm.description || ''}
                                                onChange={e => setFieldForm({...fieldForm, description: e.target.value})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                                placeholder="Help text shown under the label"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Column Width</label>
                                            <select 
                                                value={fieldForm.width ?? 12}
                                                onChange={e => setFieldForm({...fieldForm, width: parseInt(e.target.value) || 12})}
                                                className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
                                                    <option key={w} value={w}>{w} / 12 Columns</option>
                                                ))}
                                            </select>
                                        </div>
                                        {['text', 'textarea', 'select'].includes(field.type) ? (
                                            <div>
                                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Placeholder</label>
                                                <input 
                                                    type="text"
                                                    value={fieldForm.placeholder || ''}
                                                    onChange={e => setFieldForm({...fieldForm, placeholder: e.target.value})}
                                                    className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                                    placeholder="Enter placeholder text..."
                                                />
                                            </div>
                                        ) : (
                                            <div />
                                        )}
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Default Value</label>
                                            {field.type === 'toggle' ? (
                                                <select
                                                    value={fieldForm.default_value || ''}
                                                    onChange={e => setFieldForm({...fieldForm, default_value: e.target.value})}
                                                    className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                                >
                                                    <option value="">No Default</option>
                                                    <option value="true">True / On</option>
                                                    <option value="false">False / Off</option>
                                                </select>
                                            ) : field.type === 'textarea' ? (
                                                <textarea
                                                    value={fieldForm.default_value || ''}
                                                    onChange={e => setFieldForm({...fieldForm, default_value: e.target.value})}
                                                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent h-16"
                                                    placeholder="Enter default multi-line value..."
                                                />
                                            ) : (
                                                <input 
                                                    type="text"
                                                    value={fieldForm.default_value || ''}
                                                    onChange={e => setFieldForm({...fieldForm, default_value: e.target.value})}
                                                    className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                                                    placeholder="Enter default value..."
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id={`req_${field.id}`}
                                                checked={fieldForm.is_required || false}
                                                onChange={e => setFieldForm({...fieldForm, is_required: e.target.checked})}
                                                className="w-4 h-4 accent-accent"
                                            />
                                            <label htmlFor={`req_${field.id}`} className="text-xs font-bold text-text cursor-pointer">Required</label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id={`disabled_${field.id}`}
                                                checked={fieldForm.is_disabled || false}
                                                onChange={e => setFieldForm({...fieldForm, is_disabled: e.target.checked})}
                                                className="w-4 h-4 accent-accent"
                                            />
                                            <label htmlFor={`disabled_${field.id}`} className="text-xs font-bold text-text cursor-pointer">Disabled (Read-only)</label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id={`multi_${field.id}`}
                                                checked={fieldForm.is_multi || false}
                                                onChange={e => setFieldForm({...fieldForm, is_multi: e.target.checked})}
                                                className="w-4 h-4 accent-accent"
                                            />
                                            <label htmlFor={`multi_${field.id}`} className="text-xs font-bold text-text cursor-pointer">Multi (Add multiple items)</label>
                                        </div>

                                        {form.requires_gtaw_login && (
                                            <div className="flex items-center gap-2">
                                                <Zap size={14} className="text-orange-500" />
                                                <label className="text-xs font-bold text-text whitespace-nowrap">Pre-fill:</label>
                                                <select 
                                                    value={fieldForm.prefill_type || ''}
                                                    onChange={e => setFieldForm({...fieldForm, prefill_type: e.target.value || null})}
                                                    className="bg-surface border border-border rounded px-2 py-1 text-xs text-text outline-none focus:border-accent"
                                                >
                                                    <option value="">None</option>
                                                    {PREFILL_TYPES.map(pt => (
                                                        <option key={pt.id} value={pt.id}>{pt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {form.type === 'quiz' && (
                                        <div className="flex flex-wrap items-center gap-6 p-3 bg-surface/50 border border-border/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Trophy size={14} className="text-yellow-500" />
                                                <label className="text-xs font-bold text-text">Points:</label>
                                                <input 
                                                    type="number"
                                                    value={fieldForm.points || 0}
                                                    onChange={e => setFieldForm({...fieldForm, points: parseInt(e.target.value) || 0})}
                                                    className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs text-text outline-none focus:border-accent"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox"
                                                    id={`auto_${field.id}`}
                                                    checked={fieldForm.is_automatic_scored || false}
                                                    onChange={e => setFieldForm({...fieldForm, is_automatic_scored: e.target.checked})}
                                                    className="w-4 h-4 accent-accent"
                                                />
                                                <label htmlFor={`auto_${field.id}`} className="text-xs font-bold text-text cursor-pointer">Auto Score</label>
                                            </div>

                                            {fieldForm.is_automatic_scored && (
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Correct Answer</label>
                                                    {field.type === 'toggle' ? (
                                                        <select 
                                                            value={fieldForm.correct_answer || 'false'}
                                                            onChange={e => setFieldForm({...fieldForm, correct_answer: e.target.value})}
                                                            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-text outline-none focus:border-accent"
                                                        >
                                                            <option value="true">True / On</option>
                                                            <option value="false">False / Off</option>
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type="text"
                                                            value={fieldForm.correct_answer || ''}
                                                            onChange={e => setFieldForm({...fieldForm, correct_answer: e.target.value})}
                                                            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-text outline-none focus:border-accent"
                                                            placeholder="Exact value match"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Options for Select/Radio */}
                                    {(field.type === 'select' || field.type === 'radio') && (
                                        <div className="p-3 bg-surface border border-border rounded">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Options (One per line)</label>
                                            <textarea 
                                                value={Array.isArray(fieldForm.options) ? fieldForm.options.join('\n') : ''}
                                                onChange={e => setFieldForm({...fieldForm, options: e.target.value.split('\n').filter(o => o.trim())})}
                                                className="w-full bg-bg border border-border rounded p-2 text-xs text-text outline-none focus:border-accent h-24 resize-none"
                                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => handleUpdateField(field.id)}
                                            disabled={pending}
                                            className="px-4 py-1.5 bg-accent text-white rounded text-xs font-bold uppercase tracking-wider shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save Changes
                                        </button>
                                        <button 
                                            onClick={() => setEditingFieldId(null)}
                                            disabled={pending}
                                            className="px-4 py-1.5 bg-bg border border-border text-text-muted rounded text-xs font-bold uppercase tracking-wider hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="cursor-grab active:cursor-grabbing text-text-muted/30 group-hover/field:text-text-muted transition-colors">
                                    <GripVertical size={16} />
                                </div>
                                <div className="p-1.5 bg-surface border border-border rounded text-text-muted">
                                    {FIELD_TYPES.find(t => t.id === field.type)?.icon || <Type size={16} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text">{field.label}</span>
                                        {field.is_required && <span className="text-red-500 font-bold" title="Required">*</span>}
                                        <span className="text-[9px] font-bold text-text-muted uppercase bg-surface px-1 py-0.5 rounded border border-border">
                                            {field.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-text-muted font-mono">{field.name}</span>
                                        {form.type === 'quiz' && field.points > 0 && (
                                            <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-1">
                                                <Trophy size={10} /> {field.points} pts
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setEditingFieldId(field.id);
                                            setFieldForm(field);
                                        }}
                                        disabled={pending}
                                        className="p-1.5 text-text-muted hover:text-accent hover:bg-surface rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteField(field)}
                                        disabled={pending}
                                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-surface rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <div className="relative">
                <button 
                    onClick={() => setShowTypeSelector(!showTypeSelector)}
                    disabled={pending}
                    className="w-full py-3 flex items-center justify-center gap-2 bg-surface border border-dashed border-border rounded hover:border-accent/50 hover:bg-accent/5 text-text-muted hover:text-accent transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Add Field</span>
                </button>

                <AnimatePresence>
                    {showTypeSelector && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowTypeSelector(false)} />
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden relative z-50"
                            >
                                <div className="mt-2 p-2 bg-card border border-border rounded-lg shadow-xl grid grid-cols-2 gap-2">
                                    <div className="col-span-2 px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border mb-1">
                                        Select Input Type
                                    </div>
                                    {FIELD_TYPES.map(type => (
                                        <button 
                                            key={type.id}
                                            onClick={() => handleAddField(type.id)}
                                            disabled={pending}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-accent hover:text-white text-text-muted text-xs font-bold transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="p-1 bg-bg/50 rounded">{type.icon}</span>
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FieldManager;
