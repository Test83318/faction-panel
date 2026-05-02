import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import Loading from './Loading';
import toast from 'react-hot-toast';

interface GtawCallbackProps {
    onLogin: (token: string, user: any) => void;
}

const GtawCallback: React.FC<GtawCallbackProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const processedRef = React.useRef(false);

    useEffect(() => {
        if (processedRef.current) return;

        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');

            if (!code) {
                toast.error('No authorization code received');
                navigate('/login');
                return;
            }

            processedRef.current = true;

            try {
                const response = await api.post('/auth/gtaw/callback', { code });
                onLogin(response.data.access_token, response.data.user);
                
                // Get redirect path from state or local storage if needed
                const redirectPath = localStorage.getItem('gtaw_auth_redirect') || '/';
                localStorage.removeItem('gtaw_auth_redirect');
                
                toast.success('Successfully logged in via GTA:W');
                navigate(redirectPath);
            } catch (err: any) {
                console.error('GTA:W Auth Error:', err);
                toast.error(err.response?.data?.message || 'GTA:W Authentication failed');
                navigate('/login');
            }
        };

        handleCallback();
    }, [location, navigate, onLogin]);

    return <Loading message="Finalizing GTA:W Authentication..." />;
};

export default GtawCallback;
