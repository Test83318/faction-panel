import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import api from '../api';
import Loading from './Loading';
import { Shield, User, Info } from 'lucide-react';

const Credits: React.FC = () => {
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCredits = async () => {
            try {
                const res = await api.get('/credits');
                setCredits(res.data);
            } catch (err) {
                console.error('Failed to fetch credits', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCredits();
    }, []);

    if (loading) return <Loading message="Loading Credits..." />;

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="text-center mb-16 space-y-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-accent/20"
                >
                    <Shield size={12} /> Project Contributors
                </motion.div>
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl font-black text-text uppercase tracking-tighter italic"
                >
                    Credits
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted text-sm uppercase font-bold tracking-widest max-w-lg mx-auto leading-relaxed"
                >
                    The dedicated individuals who made the Faction Panel project possible.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {credits.map((credit, index) => (
                    <motion.div
                        key={credit.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-card border border-border p-6 rounded-2xl hover:border-accent/30 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={64} />
                        </div>
                        
                        <div className="relative z-10 space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-accent">
                                    <User size={16} />
                                    <h3 className="text-xl font-black uppercase tracking-tight italic">{credit.name}</h3>
                                </div>
                                <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                                    {credit.role}
                                </div>
                            </div>

                            <div className="h-px w-8 bg-accent/30 group-hover:w-full transition-all duration-500" />

                            <p className="text-[11px] text-muted font-bold uppercase tracking-tight leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                {credit.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {credits.length === 0 && (
                <div className="text-center py-24 bg-card/50 border border-dashed border-border rounded-3xl">
                    <Info size={48} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-muted text-xs uppercase font-black tracking-widest">No credits added yet.</p>
                </div>
            )}
        </div>
    );
};

export default Credits;
