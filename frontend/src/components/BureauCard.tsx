import React from 'react';
import { Fingerprint } from 'lucide-react';
import { Bureau } from '../types';
import { RosterTable } from './RosterTable';

interface BureauCardProps {
  bureau: Bureau;
}

export const BureauCard: React.FC<BureauCardProps> = ({ bureau }) => {
  const memberCount = bureau.leadership.length + bureau.units.reduce((acc, u) => acc + u.members.length, 0);

  return (
    <div className="bureau-card min-w-[450px] flex-1 border border-border rounded-lg overflow-hidden bg-card shadow-[var(--sh)] flex flex-col">
      <div className="bureau-card-top flex h-[24px] items-stretch border-b border-border bg-surface shrink-0">
        <div className="w-[5px] shrink-0" style={{ backgroundColor: bureau.color }} />
        <div className="w-6 shrink-0 flex items-center justify-center border-r border-border bg-bg text-[12px] text-muted">
          <Fingerprint size={12} />
        </div>
        <div className="flex-1 flex items-center px-2 justify-center gap-1.5 overflow-hidden">
          <span className="font-bold text-[11px] text-text uppercase truncate">
            {bureau.name}
          </span>
          <span className="text-[9px] font-medium text-accent shrink-0">
            {memberCount}
          </span>
        </div>
      </div>

      <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center shrink-0">
        <span className="text-[8px] font-bold tracking-widest text-muted uppercase">Leadership</span>
      </div>
      
      <RosterTable members={bureau.leadership} isLeadership accentColor={bureau.color} />

      {bureau.units.map(unit => (
        <div key={unit.id} className="unit-section">
          <div className="section-header py-0.5 px-2 border-b border-t border-border bg-border/10 flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bureau.color }} />
            <span className="text-[9px] font-bold text-text uppercase text-center flex-1 truncate">
              {unit.name}
            </span>
          </div>
          <RosterTable members={unit.members} accentColor={bureau.color} />
        </div>
      ))}
    </div>
  );
};
