import React from 'react';
import { FormField } from '../../../types';

interface FormFieldRendererProps {
    field: FormField;
    value: any;
    onChange: (value: any) => void;
}

const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({ field, value, onChange }) => {
    const renderSingleInput = (singleValue: any, onSingleChange: (val: any) => void) => {
        switch (field.type) {
            case 'text':
                return (
                    <input 
                        type="text"
                        value={singleValue || ''}
                        disabled={field.is_disabled}
                        onChange={e => onSingleChange(e.target.value)}
                        className={`w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all ${field.is_disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        placeholder={field.placeholder || "Type here..."}
                    />
                );

            case 'textarea':
                return (
                    <textarea 
                        value={singleValue || ''}
                        disabled={field.is_disabled}
                        onChange={e => onSingleChange(e.target.value)}
                        className={`w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all min-h-[120px] ${field.is_disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        placeholder={field.placeholder || "Type here..."}
                    />
                );

            case 'select':
                return (
                    <div className="relative">
                        <select 
                            value={singleValue || ''}
                            disabled={field.is_disabled}
                            onChange={e => onSingleChange(e.target.value)}
                            className={`w-full bg-card border border-border rounded-lg p-3 text-text focus:border-accent outline-none transition-all appearance-none ${field.is_disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <option value="">{field.placeholder || "Select an option..."}</option>
                            {field.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                            </svg>
                        </div>
                    </div>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt: string) => (
                            <label 
                                key={opt}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${field.is_disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${singleValue === opt ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-text-muted hover:border-accent/50'}`}
                            >
                                <input 
                                    type="radio"
                                    name={`field_${field.id}`}
                                    checked={singleValue === opt}
                                    disabled={field.is_disabled}
                                    onChange={() => !field.is_disabled && onSingleChange(opt)}
                                    className="hidden"
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${singleValue === opt ? 'border-accent' : 'border-border'}`}>
                                    {singleValue === opt && <div className="w-2 h-2 rounded-full bg-accent" />}
                                </div>
                                <span className="text-sm font-medium">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'toggle':
                return (
                    <div 
                        onClick={() => !field.is_disabled && onSingleChange(!singleValue)}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${field.is_disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${singleValue ? 'bg-accent' : 'bg-card border border-border'}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all transform ${singleValue ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                );

            default:
                return <p className="text-red-500 text-xs italic">Unsupported field type: {field.type}</p>;
        }
    };

    const renderInput = () => {
        if (field.is_multi) {
            if (field.type === 'radio') {
                // Radio with is_multi acts as Checkboxes group storing array value
                let selectedList: string[] = [];
                if (Array.isArray(value)) {
                    selectedList = value;
                } else if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        selectedList = Array.isArray(parsed) ? parsed : [value];
                    } catch {
                        selectedList = [value];
                    }
                }

                const toggleOption = (opt: string) => {
                    if (field.is_disabled) return;
                    if (selectedList.includes(opt)) {
                        onChange(selectedList.filter(i => i !== opt));
                    } else {
                        onChange([...selectedList, opt]);
                    }
                };

                return (
                    <div className="space-y-2">
                        {field.options?.map((opt: string) => {
                            const isChecked = selectedList.includes(opt);
                            return (
                                <label 
                                    key={opt}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${field.is_disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isChecked ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-text-muted hover:border-accent/50'}`}
                                >
                                    <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={field.is_disabled}
                                        onChange={() => toggleOption(opt)}
                                        className="hidden"
                                    />
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'border-accent bg-accent text-white' : 'border-border bg-card'}`}>
                                        {isChecked && (
                                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            } else {
                // Other types wrap in a dynamic multi-row input form
                const items = Array.isArray(value) ? value : [value !== undefined && value !== null ? value : ''];
                
                const handleItemChange = (idx: number, itemVal: any) => {
                    const newItems = [...items];
                    newItems[idx] = itemVal;
                    onChange(newItems);
                };

                const handleAddItem = () => {
                    onChange([...items, field.type === 'toggle' ? false : '']);
                };

                const handleRemoveItem = (idx: number) => {
                    onChange(items.filter((_, i) => i !== idx));
                };

                return (
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="flex-1">
                                    {renderSingleInput(item, (val) => handleItemChange(idx, val))}
                                </div>
                                {!field.is_disabled && items.length > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="p-3 text-text-muted hover:text-red-500 transition-colors bg-card border border-border rounded-lg"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        {!field.is_disabled && (
                            <button 
                                type="button"
                                onClick={handleAddItem}
                                className="w-full py-2 bg-bg border border-dashed border-border rounded-lg text-xs font-bold uppercase tracking-widest text-text-muted hover:text-accent hover:border-accent/50 transition-all"
                            >
                                + Add Item
                            </button>
                        )}
                    </div>
                );
            }
        }

        return renderSingleInput(value, onChange);
    };

    if (field.type === 'html') {
        return (
            <div 
                className="w-full text-text overflow-hidden break-words p-2"
                dangerouslySetInnerHTML={{ __html: field.default_value || '' }}
            />
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <label className="text-sm font-bold text-text flex items-center gap-1.5">
                        {field.label}
                        {field.is_required && <span className="text-red-500">*</span>}
                    </label>
                    {field.description && (
                        <p className="text-xs text-text-muted mt-1">{field.description}</p>
                    )}
                </div>
                {field.is_automatic_scored && (
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded">Auto-Scored</span>
                )}
            </div>
            {renderInput()}
        </div>
    );
};

export default FormFieldRenderer;
