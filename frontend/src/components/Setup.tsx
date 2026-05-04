import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';

const Setup: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/setup/status');
                if (res.data.is_setup) {
                    toast.error('System is already setup.');
                    navigate('/login');
                }
            } catch (err) {
                console.error('Failed to check setup status');
            } finally {
                setStatusLoading(false);
            }
        };
        checkStatus();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (password !== passwordConfirmation) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await api.post('/setup', { 
                username, 
                password, 
                password_confirmation: passwordConfirmation 
            });
            toast.success('Setup completed successfully!');
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Setup failed. Please check the backend logs.');
        } finally {
            setLoading(false);
        }
    };

    if (statusLoading) return <Loading message="Checking System Status..." />;

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            <div className="max-w-md w-full p-10 bg-card rounded-2xl shadow-2xl border border-border flex flex-col justify-center">
                <h2 className="text-3xl font-black text-text mb-8 text-center uppercase italic tracking-tighter">System <span className="text-accent">Setup</span></h2>
                
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-text uppercase tracking-tighter italic">First Time Setup</h3>
                    <p className="text-muted text-[11px] font-bold uppercase tracking-widest mt-1">Configure your superadmin account and initialize the database.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Superadmin Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Superadmin Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Confirm Password</label>
                        <input
                            type="password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                            placeholder="Confirm password"
                            required
                        />
                    </div>

                    {error && <p className="text-danger text-[10px] font-bold uppercase tracking-widest bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</p>}
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition duration-200 disabled:opacity-50 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-accent/20"
                    >
                        {loading ? 'Running Migrations & Setup...' : 'Initialize System'}
                    </button>

                    <p className="text-center text-[9px] text-muted font-bold uppercase tracking-[0.2em] pt-4">
                        This page will be disabled after initial setup.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Setup;
