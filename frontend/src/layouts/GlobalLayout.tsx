import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

interface GlobalLayoutProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
    pageName?: string;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ isDark, toggleTheme, user, onLogout, pageName = "Faction Panel" }) => {
    return (
        <div className="min-h-screen bg-bg text-text transition-colors duration-200 flex flex-col">
            <Header 
                isDark={isDark} 
                toggleTheme={toggleTheme} 
                user={user} 
                onLogout={onLogout} 
                factionName={pageName}
                branding={{ 
                    header_link_to_faction: false, 
                    hide_panel_header: false, 
                    header_bg_color: null, 
                    header_gradient_enabled: false, 
                    header_gradient_color: null, 
                    header_gradient_direction: 'to-r',
                    shortname: ''
                }}
            />
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default GlobalLayout;
