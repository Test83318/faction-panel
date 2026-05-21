import React, { useState } from 'react';
import { Form } from '../../../types';
import { Save, Info, Clock, Eye, Ban, Trophy, Zap, Hash } from 'lucide-react';

interface FormSettingsProps {
    form: Form;
    onSave: (data: any) => void;
    saving: boolean;
}

const FormSettings: React.FC<FormSettingsProps> = ({ form, onSave, saving }) => {
    const [formData, setFormData] = useState({
        name: form.name,
        description: form.description || '',
        is_public: form.is_public,
        requires_gtaw_login: form.requires_gtaw_login,
        cooldown_seconds: form.cooldown_seconds,
        cooldown_only_on_fail: form.cooldown_only_on_fail,
        max_submissions: form.max_submissions ?? '',
        is_enabled: form.is_enabled,
        pass_points: form.pass_points || 0,
        is_automatic_grading: form.is_automatic_grading || false
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            max_submissions: formData.max_submissions === '' ? null : Number(formData.max_submissions),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
                    <Save size={18} className="text-accent" />
                    General Settings
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Form Name</label>
                        <input 
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Description</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors h-32 resize-none"
                            placeholder="Explain the purpose of this form..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className={`p-4 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${formData.is_enabled ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-bg border-border text-text-muted hover:border-green-500/30'}`}
                             onClick={() => setFormData({...formData, is_enabled: !formData.is_enabled})}>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest">Enabled</span>
                                <Eye size={16} />
                            </div>
                            <span className="text-[10px] opacity-70 italic">Allow users to access this form</span>
                        </div>

                        <div className={`p-4 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${formData.is_public ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-bg border-border text-text-muted hover:border-blue-500/30'}`}
                             onClick={() => setFormData({...formData, is_public: !formData.is_public})}>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest">Public Access</span>
                                <Eye size={16} />
                            </div>
                            <span className="text-[10px] opacity-70 italic">Allow non-logged in users to submit</span>
                        </div>

                        <div className={`p-4 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${formData.requires_gtaw_login ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-bg border-border text-text-muted hover:border-orange-500/30'}`}
                             onClick={() => setFormData({...formData, requires_gtaw_login: !formData.requires_gtaw_login})}>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest">Require GTA:W</span>
                                <Zap size={16} />
                            </div>
                            <span className="text-[10px] opacity-70 italic">Require users to be logged in via GTA:W</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
                    <Clock size={18} className="text-accent" />
                    Cooldown Settings
                </h3>

                <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start mb-4">
                        <Info size={16} className="text-blue-500 mt-0.5" />
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            Cooldowns prevent users from submitting the same form too frequently. The cooldown starts from the moment a form is <span className="font-bold text-text">closed/processed</span>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Cooldown Duration (Hours)</label>
                        <input 
                            type="number"
                            min="0"
                            step="0.5"
                            value={formData.cooldown_seconds / 3600}
                            onChange={e => setFormData({...formData, cooldown_seconds: Math.round(parseFloat(e.target.value) * 3600) || 0})}
                            className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors"
                        />
                    </div>

                    <div
                        className={`p-4 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${formData.cooldown_only_on_fail ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-bg border-border text-text-muted hover:border-orange-500/30'}`}
                        onClick={() => setFormData({...formData, cooldown_only_on_fail: !formData.cooldown_only_on_fail})}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest">Only on Fail</span>
                            <Ban size={16} />
                        </div>
                        <span className="text-[10px] opacity-70 italic">Only apply cooldown if the previous submission was marked as "Failed"</span>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
                    <Hash size={18} className="text-accent" />
                    Submission Limit
                </h3>

                <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
                        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            Limits how many times a user can submit this form in total. Leave blank for unlimited submissions.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Max Submissions Per User</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={formData.max_submissions}
                            onChange={e => setFormData({...formData, max_submissions: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)})}
                            placeholder="Unlimited"
                            className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {form.type === 'quiz' && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500" />
                        Quiz Settings
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Points to Pass</label>
                            <input 
                                type="number"
                                min="0"
                                value={formData.pass_points}
                                onChange={e => setFormData({...formData, pass_points: parseInt(e.target.value) || 0})}
                                className="w-full bg-bg border border-border rounded p-2.5 text-text focus:border-accent outline-none transition-colors"
                            />
                        </div>

                        <div 
                            className={`p-4 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${formData.is_automatic_grading ? 'bg-purple-500/10 border-purple-500/50 text-purple-500' : 'bg-bg border-border text-text-muted hover:border-purple-500/30'}`}
                            onClick={() => setFormData({...formData, is_automatic_grading: !formData.is_automatic_grading})}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest">Automatic Status Update</span>
                                <Zap size={16} />
                            </div>
                            <span className="text-[10px] opacity-70 italic">Automatically mark as Passed/Failed based on points after all questions are graded</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button 
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-accent text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save All Changes'}
                    {!saving && <Save size={16} />}
                </button>
            </div>
        </form>
    );
};

export default FormSettings;
