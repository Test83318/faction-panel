import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    requiredInput?: string;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmationProvider');
    }
    return context.confirm;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<ConfirmationOptions | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

    const confirm = (options: ConfirmationOptions): Promise<boolean> => {
        const normalized = {
            ...options,
            variant: options.variant || 'warning'
        };
        setConfig(normalized);
        setInputValue('');
        return new Promise((resolve) => {
            setResolveCallback(() => resolve);
        });
    };

    const handleConfirm = () => {
        if (config?.requiredInput && inputValue.trim().toLowerCase() !== config.requiredInput.trim().toLowerCase()) return;
        if (resolveCallback) resolveCallback(true);
        setConfig(null);
    };

    const handleCancel = () => {
        if (resolveCallback) resolveCallback(false);
        setConfig(null);
    };

    const isConfirmDisabled = config?.requiredInput 
        ? inputValue.trim().toLowerCase() !== config.requiredInput.trim().toLowerCase() 
        : false;

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {config && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-card border border-border w-full max-w-md overflow-hidden flex flex-col shadow-2xl rounded-[2rem] relative"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-4 rounded-2xl border ${
                                        config.variant === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' : 
                                        config.variant === 'info' ? 'bg-accent/10 border-accent/20 text-accent' :
                                        'bg-warning/10 border-warning/20 text-warning'
                                    }`}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-black uppercase tracking-tighter leading-tight">{config.title}</h2>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Confirmation Required</p>
                                    </div>
                                </div>

                                <p className="text-sm text-muted font-bold uppercase tracking-widest leading-relaxed">
                                    {config.message}
                                </p>

                                {config.requiredInput && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Type <span className="text-text">"{config.requiredInput}"</span> to confirm</p>
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !isConfirmDisabled && handleConfirm()}
                                            className="w-full bg-surface border border-border p-4 rounded-xl text-sm font-black focus:border-accent outline-none transition"
                                            placeholder={config.requiredInput}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={handleCancel}
                                        className="flex-1 py-4 bg-surface border border-border hover:bg-muted/50 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
                                    >
                                        {config.cancelText || 'Cancel'}
                                    </button>
                                    <button 
                                        disabled={isConfirmDisabled}
                                        onClick={handleConfirm}
                                        className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed ${
                                            config.variant === 'danger' ? 'bg-danger shadow-danger/20 hover:bg-danger/90' : 
                                            config.variant === 'info' ? 'bg-accent shadow-accent/20 hover:bg-accent/90' :
                                            'bg-warning shadow-warning/20 hover:bg-warning/90'
                                        }`}
                                    >
                                        {config.confirmText || 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};
