import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';

interface LoginProps {
    onLogin: (token: string, user: any) => void;
    isEmbedded?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isEmbedded = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', { username, password });
            onLogin(response.data.access_token, response.data.user);
            if (!isEmbedded) {
                navigate(redirectPath);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className={`${isEmbedded ? '' : 'max-w-md w-full p-10 bg-card rounded-2xl shadow-2xl border border-border'}`}>
            {!isEmbedded && <h2 className="text-3xl font-black text-text mb-8 text-center uppercase italic tracking-tighter">Faction <span className="text-accent">Panel</span></h2>}
            <div className="mb-8">
                <h3 className="text-2xl font-black text-text uppercase tracking-tighter italic">Welcome back</h3>
                <p className="text-muted text-[11px] font-bold uppercase tracking-widest mt-1">Please enter your details to sign in.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Username</label>
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
                    <label className="block text-muted mb-2 text-[10px] uppercase font-bold tracking-widest">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-surface text-text rounded-xl border border-border focus:border-accent outline-none transition-all text-sm"
                        placeholder="Enter password"
                        required
                    />
                </div>
                {error && <p className="text-danger text-[10px] font-bold uppercase tracking-widest bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl transition duration-200 disabled:opacity-50 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-accent/20"
                >
                    {loading ? 'Authenticating...' : 'Sign In System'}
                </button>
                {!isEmbedded && (
                    <div className="text-center pt-4">
                        <Link to={`/register${location.search}`} className="text-accent hover:text-accent/80 text-[10px] font-bold uppercase tracking-widest transition-colors">
                            Don't have an account? Register
                        </Link>
                    </div>
                )}
            </form>
        </div>
    );

    if (isEmbedded) return content;

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            {content}
        </div>
    );
};

export default Login;
