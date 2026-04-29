import React from 'react';
import Login from './Login';
import { Shield, Users, Database, Globe } from 'lucide-react';

interface HomeProps {
    onLogin: (token: string, user: any) => void;
}

const Home: React.FC<HomeProps> = ({ onLogin }) => {
    return (
        <div className="min-h-screen bg-gray-900 text-white selection:bg-blue-500/30">
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side: Marketing/Info */}
                <div className="flex-1 flex flex-col justify-center p-8 lg:p-24 bg-gradient-to-br from-gray-900 to-blue-900/20">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                                <Shield className="text-blue-500" size={32} />
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                                Faction <span className="text-blue-500">Panel</span>
                            </h1>
                        </div>
                        
                        <h2 className="text-5xl font-extrabold mb-6 leading-tight">
                            Manage your organization <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                                with precision.
                            </span>
                        </h2>
                        
                        <p className="text-gray-400 text-lg mb-12 leading-relaxed">
                            A centralized hub for factions, departments, and organizations. 
                            Streamline your operations, manage rosters, and coordinate across multiple universes.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex gap-4">
                                <div className="p-2 bg-gray-800 rounded-lg h-fit">
                                    <Users size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Roster Management</h4>
                                    <p className="text-gray-500 text-sm">Real-time personnel tracking and hierarchy visualization.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-2 bg-gray-800 rounded-lg h-fit">
                                    <Globe size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Multi-Universe</h4>
                                    <p className="text-gray-500 text-sm">Support for multiple independent faction environments.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="lg:w-[500px] flex items-center justify-center p-8 bg-gray-800/50 backdrop-blur-xl border-l border-gray-700/50">
                    <div className="w-full max-w-sm">
                        <Login onLogin={onLogin} isEmbedded={true} />
                        
                        <div className="mt-8 pt-8 border-t border-gray-700/50 text-center">
                            <p className="text-gray-500 text-xs uppercase tracking-widest">
                                &copy; 2026 Faction Panel. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
