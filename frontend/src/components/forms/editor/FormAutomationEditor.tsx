import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../../../api';
import { Form, FormAutomation, AutomationCondition, AutomationOperator } from '../../../types';
import { Plus, Trash2, ChevronDown, ChevronUp, Zap, ToggleLeft, ToggleRight } from 'lucide-react';

interface Props {
    form: Form;
    shortname: string;
}

interface AutomationDraft {
    name: string;
    trigger: 'on_submit' | 'on_status_change';
    trigger_status_id: number | null;
    condition_logic: 'all' | 'any';
    conditions: AutomationCondition[];
    action: 'set_status' | 'add_comment';
    action_status_id: number | null;
    action_comment: string;
    action_comment_internal: boolean;
    is_enabled: boolean;
}

const OPERATORS: { value: AutomationOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
];

const VALUELESS_OPS: AutomationOperator[] = ['is_empty', 'is_not_empty'];

const emptyDraft = (): AutomationDraft => ({
    name: '',
    trigger: 'on_submit',
    trigger_status_id: null,
    condition_logic: 'all',
    conditions: [],
    action: 'set_status',
    action_status_id: null,
    action_comment: '',
    action_comment_internal: false,
    is_enabled: true,
});

const FormAutomationEditor: React.FC<Props> = ({ form, shortname }) => {
    const [automations, setAutomations] = useState<FormAutomation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | 'new' | null>(null);
    const [draft, setDraft] = useState<AutomationDraft>(emptyDraft());
    const [saving, setSaving] = useState(false);

    const allFields = (form.stages ?? [])
        .flatMap(s => (s.sections ?? []).flatMap(sec => sec.fields ?? []));

    const statuses = form.statuses ?? [];

    const fetchAutomations = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/forms/${form.id}/automations`);
            setAutomations(res.data);
        } catch {
            toast.error('Failed to load automations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAutomations(); }, [form.id]);

    const openNew = () => {
        setDraft(emptyDraft());
        setExpandedId('new');
    };

    const openEdit = (automation: FormAutomation) => {
        setDraft({
            name: automation.name ?? '',
            trigger: automation.trigger,
            trigger_status_id: automation.trigger_status_id,
            condition_logic: automation.condition_logic,
            conditions: automation.conditions ?? [],
            action: automation.action,
            action_status_id: automation.action_status_id,
            action_comment: automation.action_comment ?? '',
            action_comment_internal: automation.action_comment_internal,
            is_enabled: automation.is_enabled,
        });
        setExpandedId(automation.id);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (expandedId === 'new') {
                const res = await api.post(`/factions/${shortname}/forms/${form.id}/automations`, draft);
                setAutomations(prev => [...prev, res.data]);
                toast.success('Automation created');
            } else {
                const res = await api.put(`/factions/${shortname}/forms/${form.id}/automations/${expandedId}`, draft);
                setAutomations(prev => prev.map(a => a.id === expandedId ? res.data : a));
                toast.success('Automation saved');
            }
            setExpandedId(null);
        } catch {
            toast.error('Failed to save automation');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/factions/${shortname}/forms/${form.id}/automations/${id}`);
            setAutomations(prev => prev.filter(a => a.id !== id));
            if (expandedId === id) setExpandedId(null);
            toast.success('Automation deleted');
        } catch {
            toast.error('Failed to delete automation');
        }
    };

    const handleToggleEnabled = async (automation: FormAutomation) => {
        try {
            const res = await api.put(`/factions/${shortname}/forms/${form.id}/automations/${automation.id}`, {
                is_enabled: !automation.is_enabled,
            });
            setAutomations(prev => prev.map(a => a.id === automation.id ? res.data : a));
        } catch {
            toast.error('Failed to toggle automation');
        }
    };

    const addCondition = () => {
        setDraft(d => ({
            ...d,
            conditions: [...d.conditions, { field_id: allFields[0]?.id ?? 0, operator: 'equals', value: '' }],
        }));
    };

    const updateCondition = (idx: number, patch: Partial<AutomationCondition>) => {
        setDraft(d => ({
            ...d,
            conditions: d.conditions.map((c, i) => i === idx ? { ...c, ...patch } : c),
        }));
    };

    const removeCondition = (idx: number) => {
        setDraft(d => ({ ...d, conditions: d.conditions.filter((_, i) => i !== idx) }));
    };

    const triggerLabel = (automation: FormAutomation) => {
        if (automation.trigger === 'on_submit') return 'On Submit';
        const status = statuses.find(s => s.id === automation.trigger_status_id);
        return `On Status → ${status?.name ?? '?'}`;
    };

    const actionLabel = (automation: FormAutomation) => {
        if (automation.action === 'set_status') {
            const status = statuses.find(s => s.id === automation.action_status_id);
            return `Set Status: ${status?.name ?? '?'}`;
        }
        return 'Add Comment';
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-text-muted text-sm">Loading automations...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-text">Automations</h2>
                    <p className="text-xs text-text-muted mt-0.5">Auto-trigger actions when forms are submitted or statuses change.</p>
                </div>
                <button
                    onClick={openNew}
                    disabled={expandedId === 'new'}
                    className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                    <Plus size={14} />
                    New Automation
                </button>
            </div>

            {/* New automation form */}
            <AnimatePresence>
                {expandedId === 'new' && (
                    <motion.div
                        key="new"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-card border border-accent/40 rounded-xl overflow-hidden shadow-lg"
                    >
                        <div className="p-4 border-b border-border bg-accent/5 flex items-center gap-2">
                            <Zap size={14} className="text-accent" />
                            <span className="text-xs font-bold uppercase tracking-widest text-accent">New Automation</span>
                        </div>
                        <div className="p-4">
                            <AutomationForm
                                draft={draft}
                                setDraft={setDraft}
                                allFields={allFields}
                                statuses={statuses}
                                addCondition={addCondition}
                                updateCondition={updateCondition}
                                removeCondition={removeCondition}
                            />
                        </div>
                        <div className="px-4 py-3 border-t border-border bg-bg/30 flex justify-end gap-2">
                            <button onClick={() => setExpandedId(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-1.5 bg-accent text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Create'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Existing automations */}
            {automations.length === 0 && expandedId !== 'new' && (
                <div className="py-16 flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-xl text-text-muted">
                    <Zap size={40} className="mb-3 opacity-10" />
                    <p className="font-bold text-sm">No automations yet.</p>
                    <p className="text-xs mt-1">Create one to auto-process submissions.</p>
                </div>
            )}

            <div className="space-y-3">
                {automations.map(automation => (
                    <motion.div
                        key={automation.id}
                        layout
                        className={`bg-card border rounded-xl overflow-hidden shadow-sm transition-colors ${expandedId === automation.id ? 'border-accent/40' : 'border-border'}`}
                    >
                        {/* Header row */}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <button
                                onClick={() => handleToggleEnabled(automation)}
                                className={`flex-shrink-0 transition-colors ${automation.is_enabled ? 'text-accent' : 'text-text-muted'}`}
                                title={automation.is_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                            >
                                {automation.is_enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-text truncate">
                                    {automation.name || <span className="text-text-muted italic">Unnamed</span>}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">{triggerLabel(automation)}</span>
                                    <span className="text-[10px] text-text-muted">→</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{actionLabel(automation)}</span>
                                    {(automation.conditions?.length ?? 0) > 0 && (
                                        <span className="text-[10px] text-text-muted">
                                            · {automation.conditions!.length} condition{automation.conditions!.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => expandedId === automation.id ? setExpandedId(null) : openEdit(automation)}
                                    className="p-1.5 text-text-muted hover:text-text rounded transition-colors"
                                >
                                    {expandedId === automation.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(automation.id)}
                                    className="p-1.5 text-text-muted hover:text-red-500 rounded transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Expanded edit form */}
                        <AnimatePresence>
                            {expandedId === automation.id && (
                                <motion.div
                                    key="edit"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-border p-4">
                                        <AutomationForm
                                            draft={draft}
                                            setDraft={setDraft}
                                            allFields={allFields}
                                            statuses={statuses}
                                            addCondition={addCondition}
                                            updateCondition={updateCondition}
                                            removeCondition={removeCondition}
                                        />
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-bg/30 flex justify-end gap-2">
                                        <button onClick={() => setExpandedId(null)} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-1.5 bg-accent text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

interface AutomationFormProps {
    draft: AutomationDraft;
    setDraft: React.Dispatch<React.SetStateAction<AutomationDraft>>;
    allFields: any[];
    statuses: any[];
    addCondition: () => void;
    updateCondition: (idx: number, patch: Partial<AutomationCondition>) => void;
    removeCondition: (idx: number) => void;
}

const AutomationForm: React.FC<AutomationFormProps> = ({
    draft, setDraft, allFields, statuses, addCondition, updateCondition, removeCondition
}) => {
    const inputCls = 'bg-bg border border-border rounded px-2.5 py-1.5 text-sm text-text focus:border-accent outline-none transition-colors';
    const labelCls = 'block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5';

    return (
        <div className="space-y-5">
            {/* Name */}
            <div>
                <label className={labelCls}>Name <span className="normal-case text-text-muted/50">(optional)</span></label>
                <input
                    type="text"
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Auto-reject low scores"
                    className={`${inputCls} w-full`}
                />
            </div>

            {/* Trigger */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Trigger</label>
                    <select
                        value={draft.trigger}
                        onChange={e => setDraft(d => ({ ...d, trigger: e.target.value as any, trigger_status_id: null }))}
                        className={`${inputCls} w-full`}
                    >
                        <option value="on_submit">On Submit</option>
                        <option value="on_status_change">On Status Change</option>
                    </select>
                </div>
                {draft.trigger === 'on_status_change' && (
                    <div>
                        <label className={labelCls}>When status becomes</label>
                        <select
                            value={draft.trigger_status_id ?? ''}
                            onChange={e => setDraft(d => ({ ...d, trigger_status_id: e.target.value ? Number(e.target.value) : null }))}
                            className={`${inputCls} w-full`}
                        >
                            <option value="">— any status —</option>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Conditions */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>Conditions</label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted uppercase tracking-widest">Match</span>
                        <div className="flex bg-bg border border-border rounded overflow-hidden">
                            <button
                                onClick={() => setDraft(d => ({ ...d, condition_logic: 'all' }))}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${draft.condition_logic === 'all' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
                            >
                                ALL
                            </button>
                            <button
                                onClick={() => setDraft(d => ({ ...d, condition_logic: 'any' }))}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${draft.condition_logic === 'any' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
                            >
                                ANY
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {draft.conditions.map((cond, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <select
                                value={cond.field_id}
                                onChange={e => updateCondition(idx, { field_id: Number(e.target.value) })}
                                className={`${inputCls} flex-1 min-w-0`}
                            >
                                {allFields.length === 0 && <option value={0}>No fields</option>}
                                {allFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                            </select>
                            <select
                                value={cond.operator}
                                onChange={e => updateCondition(idx, { operator: e.target.value as AutomationOperator })}
                                className={`${inputCls} w-36 flex-shrink-0`}
                            >
                                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                            </select>
                            {!VALUELESS_OPS.includes(cond.operator) && (
                                <input
                                    type="text"
                                    value={cond.value}
                                    onChange={e => updateCondition(idx, { value: e.target.value })}
                                    placeholder="value"
                                    className={`${inputCls} w-32 flex-shrink-0`}
                                />
                            )}
                            <button
                                onClick={() => removeCondition(idx)}
                                className="p-1.5 text-text-muted hover:text-red-500 flex-shrink-0 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addCondition}
                    disabled={allFields.length === 0}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-accent transition-colors disabled:opacity-30"
                >
                    <Plus size={12} />
                    Add Condition
                </button>
                {draft.conditions.length === 0 && (
                    <p className="text-[10px] text-text-muted/60 mt-1">No conditions — automation always runs on trigger.</p>
                )}
            </div>

            {/* Action */}
            <div className="space-y-3">
                <div>
                    <label className={labelCls}>Action</label>
                    <select
                        value={draft.action}
                        onChange={e => setDraft(d => ({ ...d, action: e.target.value as any }))}
                        className={`${inputCls} w-full`}
                    >
                        <option value="set_status">Set Status</option>
                        <option value="add_comment">Add Comment</option>
                    </select>
                </div>

                {draft.action === 'set_status' && (
                    <div>
                        <label className={labelCls}>Target Status</label>
                        <select
                            value={draft.action_status_id ?? ''}
                            onChange={e => setDraft(d => ({ ...d, action_status_id: e.target.value ? Number(e.target.value) : null }))}
                            className={`${inputCls} w-full`}
                        >
                            <option value="">— select status —</option>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                {draft.action === 'add_comment' && (
                    <div className="space-y-2">
                        <div>
                            <label className={labelCls}>Comment Text</label>
                            <textarea
                                value={draft.action_comment}
                                onChange={e => setDraft(d => ({ ...d, action_comment: e.target.value }))}
                                rows={3}
                                placeholder="Automated comment content..."
                                className={`${inputCls} w-full resize-none`}
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={draft.action_comment_internal}
                                onChange={e => setDraft(d => ({ ...d, action_comment_internal: e.target.checked }))}
                                className="accent-accent"
                            />
                            <span className="text-xs text-text-muted">Internal comment (hidden from applicant)</span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormAutomationEditor;
