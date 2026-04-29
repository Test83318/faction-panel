import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

interface RegisterProps {
    onLogin: (token: string, user: any) => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);

    const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/auth/registration-status');
                setRegistrationEnabled(res.data.allow_registration);
            } catch (err) {
                console.error('Failed to check registration status');
            }
        };
        checkStatus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== passwordConfirmation) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/register', { 
                username, 
                password, 
                password_confirmation: passwordConfirmation 
            });
            onLogin(response.data.access_token, response.data.user);
            toast.success('Account created successfully!');
            navigate(redirectPath);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (!registrationEnabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg p-4 transition-colors duration-200">
                <div className="max-w-md w-full p-10 bg-card rounded-2xl shadow-2xl border border-border text-center">
                    <h2 className="text-3xl font-black text-text mb-6 uppercase italic tracking-tighter">Access Denied</h2>
                    <p className="text-muted text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                        Public registration is currently disabled by the system administrator. 
                        Please contact an organization leader for access.
                    </p>
                    <Link to="/" className="mt-8 inline-block px-8 py-3 bg-accent text-white font-bold rounded-xl uppercase tracking-widest text-[10px]">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4 transition-colors duration-200">
            <div className="max-w-md w-full p-10 bg-card rounded-2xl shadow-2xl border border-border">
                <h2 className="text-3xl font-black text-text mb-8 text-center uppercase italic tracking-tighter">
                    Faction <span className="text-accent">Panel</span>
                </h2>
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-text uppercase tracking-tighter italic">Create Account</h3>
                    <p className="text-muted text-[11px] font-bold uppercase tracking-widest mt-1">Join the network to manage organizations.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                            placeholder="Pick a username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                            placeholder="At least 8 characters"
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
                            placeholder="Repeat password"
                            required
                        />
                    </div>
                    {error && <p className="text-danger text-[10px] font-bold uppercase tracking-widest bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-black rounded-xl transition duration-200 disabled:opacity-50 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-accent/20"
                    >
                        {loading ? 'Creating Account...' : 'Register System'}
                    </button>
                    <div className="text-center pt-2">
                        <Link to={`/login${location.search}`} className="text-accent hover:text-accent/80 text-[10px] font-bold uppercase tracking-widest transition-colors">
                            Already have an account? Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
