import React from 'react';
import Login from './Login';
import { Shield, Users, Globe, Moon, Sun } from 'lucide-react';

interface HomeProps {
    onLogin: (token: string, user: any) => void;
    isDark: boolean;
    toggleTheme: () => void;
}

const Home: React.FC<HomeProps> = ({ onLogin, isDark, toggleTheme }) => {
    return (
        <div className="min-h-screen bg-bg text-text selection:bg-accent/30 transition-colors duration-200">
            {/* Theme Toggle for Landing Page */}
            <div className="fixed top-6 right-6 z-[500]">
                <button 
                    onClick={toggleTheme}
                    className="p-2.5 bg-surface border border-border rounded-xl shadow-lg hover:border-accent transition-all text-muted hover:text-accent"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side: Marketing/Info */}
                <div className="flex-1 flex flex-col justify-center p-8 lg:p-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
                    
                    <div className="max-w-xl relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                                <Shield className="text-accent" size={32} />
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-text">
                                Faction <span className="text-accent">Panel</span>
                            </h1>
                        </div>
                        
                        <h2 className="text-5xl font-extrabold mb-6 leading-tight text-text">
                            Manage your organization <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">
                                with precision.
                            </span>
                        </h2>
                        
                        <p className="text-muted text-lg mb-12 leading-relaxed">
                            A centralized hub for factions, departments, and organizations. 
                            Streamline your operations, manage rosters, and coordinate across multiple universes.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex gap-4">
                                <div className="p-2 bg-surface border border-border rounded-lg h-fit">
                                    <Users size={20} className="text-accent" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-text uppercase text-xs tracking-widest mb-1">Roster Management</h4>
                                    <p className="text-muted text-sm">Real-time personnel tracking and hierarchy visualization.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-2 bg-surface border border-border rounded-lg h-fit">
                                    <Globe size={20} className="text-accent" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-text uppercase text-xs tracking-widest mb-1">Multi-Universe</h4>
                                    <p className="text-muted text-sm">Support for multiple independent faction environments.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="lg:w-[500px] flex items-center justify-center p-8 bg-surface/50 backdrop-blur-xl border-l border-border relative">
                    <div className="w-full max-w-sm">
                        <Login onLogin={onLogin} isEmbedded={true} />
                        
                        <div className="mt-8 pt-8 border-t border-border/50 text-center">
                            <p className="text-muted text-[9px] uppercase tracking-[0.2em] font-bold">
                                &copy; 2026 Faction Panel. System Operations v1.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
