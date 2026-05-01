import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings, Layers, Database } from 'lucide-react';

interface SidebarProps {
  shortname: string;
  canViewAdmin: boolean;
  canViewGroups: boolean;
  canViewRecords: boolean;
  user: any | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ shortname, canViewAdmin, canViewGroups, canViewRecords, user }) => {
  return (
    <aside className="sidebar">
      <div className="py-4 flex flex-col gap-1">
        <NavLink 
          to={`/${shortname}/roster`}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <Users size={14} />
          Faction Roster
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
          Management v1.0
        </div>
      </div>
    </aside>
  );
};
