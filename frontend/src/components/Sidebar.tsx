import React from 'react';
import { Users } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="py-4 flex flex-col gap-1">
        <button className="sidebar-item active">
          <Users size={14} />
          Faction Roster
        </button>
      </div>
      
      <div className="mt-auto p-4 border-t border-border">
        <div className="text-[9px] text-muted font-bold tracking-widest uppercase opacity-40">
          Management
        </div>
      </div>
    </aside>
  );
};
