import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { RosterSection } from '../types';
import { RosterTable } from './RosterTable';

interface SectionCardProps {
  section: RosterSection;
  canModerate?: boolean;
  onAddChild?: (parentId: number) => void;
  onEdit?: (section: RosterSection) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({ section, canModerate, onAddChild, onEdit }) => {
  // For now content is placeholder
  const mockMembers: any[] = []; 

  if (section.type === 'master') {
    return (
      <div className="div-leadership w-full border border-border bg-card mb-4 group relative">
        <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
          <span className="text-[9px] font-bold tracking-widest text-muted uppercase">{section.name}</span>
          <div className="flex items-center gap-2">
            {canModerate && (
                <button 
                    onClick={() => onEdit?.(section)}
                    className="p-1 hover:bg-surface rounded text-muted hover:text-text"
                >
                    <MoreHorizontal size={12} />
                </button>
            )}
          </div>
        </div>
        {/* Placeholder for content */}
        <RosterTable members={mockMembers} isLeadership accentColor={section.color || 'var(--accent)'} />
      </div>
    );
  }

  return (
    <div className="bureau-card flex-1 border border-border rounded-lg overflow-hidden bg-card shadow-[var(--sh)] flex flex-col group relative">
      <div className="bureau-card-top flex h-[24px] items-stretch border-b border-border bg-surface shrink-0">
        <div className="w-[5px] shrink-0" style={{ backgroundColor: section.color || 'var(--accent)' }} />
        <div className="flex-1 flex items-center px-2 justify-center gap-1.5 overflow-hidden">
          <span className="font-bold text-[11px] text-text uppercase truncate">
            {section.name}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {canModerate && (
                <>
                    {!section.parent_id && (
                        <button 
                            onClick={() => onAddChild?.(section.id)}
                            className="p-0.5 hover:bg-bg rounded text-muted hover:text-accent"
                        >
                            <Plus size={10} />
                        </button>
                    )}
                    <button 
                        onClick={() => onEdit?.(section)}
                        className="p-0.5 hover:bg-bg rounded text-muted hover:text-text"
                    >
                        <MoreHorizontal size={10} />
                    </button>
                </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-sections / Children */}
      {section.children && section.children.map(child => (
        <div key={child.id} className="unit-section">
          <div className="section-header py-0.5 px-2 border-b border-t border-border bg-border/10 flex items-center gap-1.5 shrink-0 group/child relative">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: child.color || section.color || 'var(--accent)' }} />
            <span className="text-[9px] font-bold text-text uppercase text-center flex-1 truncate">
              {child.name}
            </span>
            {canModerate && (
                <button 
                    onClick={() => onEdit?.(child)}
                    className="absolute right-1 opacity-0 group-hover/child:opacity-100 p-0.5 hover:bg-bg rounded text-muted hover:text-text transition-opacity"
                >
                    <MoreHorizontal size={10} />
                </button>
            )}
          </div>
          {/* Placeholder for child content */}
          <RosterTable members={mockMembers} accentColor={child.color || section.color || 'var(--accent)'} />
        </div>
      ))}

      {/* If it's a root section but has no children, maybe show empty state or just the header with empty table */}
      {(!section.children || section.children.length === 0) && (
        <RosterTable members={mockMembers} accentColor={section.color || 'var(--accent)'} />
      )}
    </div>
  );
};
