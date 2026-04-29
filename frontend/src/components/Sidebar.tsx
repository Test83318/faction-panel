import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';

interface SidebarProps {
  shortname: string;
  canViewAdmin: boolean;
  user: any | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ shortname, canViewAdmin, user }) => {
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
