import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings, Layers, Database, HelpCircle } from 'lucide-react';

interface SidebarProps {
  shortname: string;
  canViewAdmin: boolean;
  canViewGroups: boolean;
  canViewRecords: boolean;
  user: any | null;
  siteVersion?: string;
  customFooterText?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ shortname, canViewAdmin, canViewGroups, canViewRecords, user, siteVersion = '1.0.0', customFooterText }) => {
  return (
    <aside className="sidebar border-r border-border bg-card flex flex-col sticky top-[var(--nav-h)] h-[calc(100vh-var(--nav-h))]">
      <div className="py-2 space-y-0.5">
        <NavLink 
          to={`/${shortname}/roster`}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Users size={14} />
          Personnel Roster
        </NavLink>

        {canViewRecords && (
          <NavLink 
            to={`/${shortname}/records`}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Database size={14} />
            Faction Records
          </NavLink>
        )}

        {canViewGroups && (
          <NavLink 
            to={`/${shortname}/groups`}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Layers size={14} />
            Group Management
          </NavLink>
        )}

        {canViewAdmin && (
          <NavLink 
            to={`/${shortname}/admin`}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={14} />
            Administration
          </NavLink>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-border">
        <div className="text-[9px] text-muted font-bold tracking-widest uppercase opacity-40">
          {customFooterText || `Antelope v${siteVersion}`}
        </div>
      </div>
    </aside>
  );
};
