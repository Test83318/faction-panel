import React from 'react';
import { FormField } from '../../../types';

interface FormFieldRendererProps {
    field: FormField;
    value: any;
    onChange: (value: any) => void;
}

const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({ field, value, onChange }) => {
    const renderInput = () => {
        switch (field.type) {
            case 'text':
                return (
                    <input 
                        type="text"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all"
                        placeholder="Type here..."
                    />
                );

            case 'textarea':
                return (
                    <textarea 
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all min-h-[120px]"
                        placeholder="Type here..."
                    />
                );

            case 'select':
                return (
                    <select 
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all appearance-none"
                    >
                        <option value="">Select an option...</option>
                        {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt: string) => (
                            <label 
                                key={opt}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${value === opt ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-text-muted hover:border-accent/50'}`}
                            >
                                <input 
                                    type="radio"
                                    name={`field_${field.id}`}
                                    checked={value === opt}
                                    onChange={() => onChange(opt)}
                                    className="hidden"
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${value === opt ? 'border-accent' : 'border-border'}`}>
                                    {value === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
                                </div>
                                <span className="text-sm font-medium">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'toggle':
                return (
                    <div 
                        onClick={() => onChange(!value)}
                        className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-all ${value ? 'bg-accent' : 'bg-card border border-border'}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                );

            case 'multi_input':
                const items = Array.isArray(value) ? value : [];
                return (
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={item}
                                    onChange={e => {
                                        const newItems = [...items];
                                        newItems[idx] = e.target.value;
                                        onChange(newItems);
                                    }}
                                    className="flex-1 bg-card border border-border rounded-lg p-2.5 text-sm text-text outline-none focus:border-accent"
                                />
                                <button 
                                    onClick={() => onChange(items.filter((_, i) => i !== idx))}
                                    className="p-2.5 text-text-muted hover:text-red-500 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => onChange([...items, ''])}
                            className="w-full py-2 bg-bg border border-dashed border-border rounded-lg text-xs font-bold uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent/50 transition-all"
                        >
                            + Add Item
                        </button>
                    </div>
                );

            default:
                return <p className="text-red-500 text-xs italic">Unsupported field type: {field.type}</p>;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-start">
                <label className="text-sm font-bold text-text flex items-center gap-1.5">
                    {field.label}
                    {field.is_required && <span className="text-red-500">*</span>}
                </label>
                {field.is_automatic_scored && (
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded">Auto-Scored</span>
                )}
            </div>
            {renderInput()}
        </div>
    );
};

export default FormFieldRenderer;
