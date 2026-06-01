import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../../api';
import Loading from '../Loading';
import { useConfirm } from '../ConfirmationProvider';
import { Form, FormStage, FormSection, FormField, FormStatus } from '../../types';
import {
    ArrowLeft,
    Save,
    Settings,
    Layers,
    Layout,
    CheckSquare,
    Shield,
    Eye,
    Play,
    Plus,
    GripVertical,
    Trash2,
    ChevronDown,
    ChevronUp,
    Edit2,
    Copy,
    Split,
    Zap
} from 'lucide-react';
import StageManager from './editor/StageManager';
import StatusManager from './editor/StatusManager';
import FormSettings from './editor/FormSettings';
import FormPermissionsModal from './editor/FormPermissionsModal';
import FormAutomationEditor from './editor/FormAutomationEditor';
import FormView from '../FormView';


interface FormEditorProps {
    form: Form;
    shortname: string;
    onClose: () => void;
    user: any;
    permissions: string[];
}

const FormEditor: React.FC<FormEditorProps> = ({ form: initialForm, shortname, onClose, user, permissions }) => {
    const [form, setForm] = useState<Form>(initialForm);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'builder' | 'statuses' | 'automation' | 'settings'>('builder');
    const [showPermissions, setShowPermissions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const fetchFullForm = async () => {
        try {
            const res = await api.get(`/factions/${shortname}/forms/${initialForm.id}`);
            setForm(res.data);
        } catch (err) {
            toast.error('Failed to fetch form details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFullForm();
    }, [initialForm.id]);

    const handleSaveSettings = async (updatedData: any) => {
        setSaving(true);
        try {
            const res = await api.put(`/factions/${shortname}/forms/${form.id}`, updatedData);
            setForm({ ...form, ...res.data });
            toast.success('Form settings saved');
        } catch (err) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading message="Loading Form Editor..." />;

    return (
        <div className="flex flex-col h-full bg-bg">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-card">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-bg rounded-full text-text-muted hover:text-text transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-text">{form.name}</h1>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${form.type === 'quiz' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                {form.type}
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Form Editor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-bg rounded p-1 border border-border mr-2">
                        <button 
                            onClick={() => setActiveTab('builder')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'builder' ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                        >
                            <Layout size={14} />
                            Builder
                        </button>
                        <button 
                            onClick={() => setActiveTab('statuses')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'statuses' ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                        >
                            <CheckSquare size={14} />
                            Statuses
                        </button>
                        <button
                            onClick={() => setActiveTab('automation')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'automation' ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                        >
                            <Zap size={14} />
                            Automation
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
                        >
                            <Settings size={14} />
                            Settings
                        </button>
                    </div>

                    <button 
                        onClick={() => setShowPermissions(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-bg hover:bg-surface text-text-muted hover:text-text border border-border rounded font-bold uppercase tracking-widest text-[10px] transition-all"
                    >
                        <Shield size={14} />
                        Permissions
                    </button>
                    
                    <button 
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-bg hover:bg-surface text-text-muted hover:text-text border border-border rounded font-bold uppercase tracking-widest text-[10px] transition-all"
                    >
                        <Eye size={14} />
                        Preview
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'builder' && (
                        <motion.div 
                            key="builder"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full overflow-auto p-6"
                        >
                            <StageManager 
                                form={form} 
                                shortname={shortname} 
                                onUpdate={fetchFullForm} 
                            />
                        </motion.div>
                    )}

                    {activeTab === 'statuses' && (
                        <motion.div 
                            key="statuses"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full overflow-auto p-6"
                        >
                            <StatusManager 
                                form={form} 
                                shortname={shortname} 
                                onUpdate={fetchFullForm} 
                            />
                        </motion.div>
                    )}

                    {activeTab === 'automation' && (
                        <motion.div
                            key="automation"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full overflow-auto p-6 flex justify-center"
                        >
                            <div className="w-full max-w-2xl">
                                <FormAutomationEditor
                                    form={form}
                                    shortname={shortname}
                                />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'settings' && (
                        <motion.div 
                            key="settings"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full overflow-auto p-6 flex justify-center"
                        >
                            <div className="w-full max-w-2xl">
                                <FormSettings 
                                    form={form} 
                                    onSave={handleSaveSettings} 
                                    saving={saving}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Permissions Modal */}
            <AnimatePresence>
                {showPermissions && (
                    <FormPermissionsModal 
                        form={form} 
                        shortname={shortname} 
                        onClose={() => setShowPermissions(false)} 
                    />
                )}
            </AnimatePresence>

            {/* Live Preview Modal */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-bg border border-border w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-4 border-b border-border bg-card">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                    <h3 className="text-sm font-bold text-text uppercase tracking-wider">Live Preview Mode</h3>
                                </div>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-3 py-1.5 bg-bg hover:bg-surface border border-border text-text-muted hover:text-text rounded font-bold uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Exit Preview
                                </button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto bg-bg/50">
                                <FormView
                                    formId={form.id}
                                    shortname={shortname}
                                    onClose={() => setShowPreview(false)}
                                    user={user}
                                    preview={true}
                                    previewForm={form}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FormEditor;
