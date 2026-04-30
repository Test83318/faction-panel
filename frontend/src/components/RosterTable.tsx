import React from 'react';
import { Member } from '../types';

interface RosterTableProps {
  members: Member[];
  isLeadership?: boolean;
  accentColor?: string;
}

export const RosterTable: React.FC<RosterTableProps> = ({ members, isLeadership, accentColor }) => {
  return (
    <div className="rt-wrap overflow-x-auto">
      <table className={`rt-table ${isLeadership ? 'bg-border/5' : ''}`}>
        <colgroup>
          <col className="w-[18px]" />
          <col className="w-[22%]" />
          <col className="w-[28%]" />
          <col className="w-[28%]" />
          <col className="w-[18%]" />
          <col className="w-[18px]" />
        </colgroup>
        <thead>
          <tr>
            <th className="rt-th" style={{ borderLeft: `3px solid ${accentColor}` }}>#</th>
            <th className="rt-th">Rank</th>
            <th className="rt-th">Name</th>
            <th className="rt-th">Position</th>
            <th className="rt-th">Callsign</th>
            <th className="rt-th"></th>
          </tr>
        </thead>
        <tbody>
          {members && members.map((member, idx) => (
            <tr key={member.id} className="rt-tr">
              <td className="rt-td text-muted opacity-50" style={{ borderLeft: `3px solid ${accentColor}` }}>
                {idx + 1}
              </td>
              <td className="rt-td">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="font-bold leading-tight" style={{ color: member.rankColor }}>{member.rank}</span>
                  {member.isActing && (
                    <span className="text-[6px] text-[#C98A1E] font-bold tracking-widest leading-none mt-[-1px]">ACTING</span>
                  )}
                </div>
              </td>
              <td className="rt-td !p-0">
                <button className="rt-name-btn flex items-center justify-center w-full h-full min-h-[18px] uppercase font-medium hover:bg-accent/10 transition-colors">
                  {member.name}
                  {member.isAlt && <span className="text-[6px] text-accent font-extrabold ml-1 leading-none self-end mb-0.5">ALT</span>}
                  {member.isNpc && <span className="text-[6px] text-muted font-extrabold ml-1 leading-none self-end mb-0.5">NPC</span>}
                </button>
              </td>
              <td className="rt-td opacity-80">{member.position}</td>
              <td className="rt-td">{member.callsign}</td>
              <td className="rt-td"></td>
            </tr>
          ))}
          {(!members || members.length === 0) && (
            <tr>
              <td colSpan={6} className="rt-td text-muted italic opacity-40 text-center py-2 uppercase text-[9px]">
                Empty Position
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
