import React from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

interface FactionLayoutProps {
    isDark: boolean;
    toggleTheme: () => void;
    user: any;
    onLogout: () => void;
    factionData: any;
    permissions: string[];
    canViewAdmin: boolean;
    canViewGroups: boolean;
    canViewRecords: boolean;
    canViewAuditLogs: boolean;
    siteVersion: string;
    children: React.ReactNode;
}

const FactionLayout: React.FC<FactionLayoutProps> = ({ 
    isDark, 
    toggleTheme, 
    user, 
    onLogout, 
    factionData,
    permissions,
    canViewAdmin,
    canViewGroups,
    canViewRecords,
    canViewAuditLogs,
    siteVersion,
    children
}) => {
    return (
        <div className="flex flex-col min-h-screen">
            <Header 
                isDark={isDark} 
                toggleTheme={toggleTheme} 
                factionName={factionData.name} 
                bannerLogoDark={factionData.header_image_dark}
                bannerLogoLight={factionData.header_image_light}
                branding={{
                    header_link_to_faction: factionData.header_link_to_faction,
                    hide_panel_header: factionData.hide_panel_header,
                    header_bg_color: factionData.header_bg_color,
                    header_gradient_enabled: factionData.header_gradient_enabled,
                    header_gradient_color: factionData.header_gradient_color,
                    header_gradient_direction: factionData.header_gradient_direction,
                    shortname: factionData.shortname
                }}
                user={user} 
                userRole={factionData.user_primary_role}
                onLogout={onLogout} 
            />
            <div className="flex flex-1 relative">
                <Sidebar 
                    shortname={factionData.shortname} 
                    canViewAdmin={canViewAdmin} 
                    canViewGroups={canViewGroups} 
                    canViewRecords={canViewRecords} 
                    canViewAuditLogs={canViewAuditLogs}
                    user={user} 
                    siteVersion={siteVersion} 
                    customFooterText={factionData.custom_footer_text}
                />
                <div className="flex flex-col flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default FactionLayout;
