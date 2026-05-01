import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { RosterSection } from '../types';
import { RosterTable } from './RosterTable';
import api from '../api';
import toast from 'react-hot-toast';

interface SectionCardProps {
  section: RosterSection;
  canModerate?: boolean;
  permissions?: any;
  columns?: any[];
  editMode?: boolean;
  onAddChild?: (parentId: number) => void;
  onEdit?: (section: RosterSection) => void;
  onRefresh?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({ 
  section, 
  canModerate, 
  permissions,
  columns, 
  editMode,
  onAddChild, 
  onEdit,
  onRefresh
}) => {
  const canEditSection = canModerate || permissions?.add_sections;
  const canAddChildSection = canModerate || permissions?.add_sections;

  const handleAddRow = async (sectionId: number) => {
    const loadToast = toast.loading('Adding row...');
    try {
      await api.post(`/sections/${sectionId}/contents`, { type: 'predefined', content: {} });
      toast.success('Row added', { id: loadToast });
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to add row', { id: loadToast });
      console.error('Failed to add row', err);
    }
  };

  const handleUpdateRow = async (id: number, data: any) => {
    const loadToast = toast.loading('Saving changes...');
    try {
      await api.put(`/contents/${id}`, { content: data });
      toast.success('Changes saved', { id: loadToast });
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to save changes', { id: loadToast });
      console.error('Failed to update row', err);
    }
  };

  const handleDeleteRow = async (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-1 text-left">
        <p className="font-bold">Delete this row?</p>
        <p className="text-[10px] opacity-80 uppercase tracking-tighter">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const loadToast = toast.loading('Deleting row...');
              try {
                await api.delete(`/contents/${id}`);
                toast.success('Row deleted', { id: loadToast });
                onRefresh?.();
              } catch (err) {
                toast.error('Failed to delete row', { id: loadToast });
                console.error('Failed to delete row', err);
              }
            }}
            className="px-2 py-1 bg-danger text-white hover:bg-danger/90 rounded text-[9px] font-bold uppercase transition shadow-lg shadow-danger/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  if (section.type === 'master') {
    return (
      <div className="div-leadership w-full border border-border bg-card mb-4 group relative">
        <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
          <span className="text-[9px] font-bold tracking-widest text-muted uppercase">{section.name}</span>
          <div className="flex items-center gap-2">
            {canEditSection && (
                <button 
                    onClick={() => onEdit?.(section)}
                    className="p-1 hover:bg-surface rounded text-muted hover:text-text"
                >
                    <MoreHorizontal size={12} />
                </button>
            )}
          </div>
        </div>
        <RosterTable 
          contents={section.contents || []} 
          isLeadership 
          accentColor={section.color || 'var(--accent)'} 
          columns={columns} 
          editMode={editMode}
          canModerate={canModerate}
          permissions={permissions}
          onAddRow={() => handleAddRow(section.id)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
        />
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
            {canEditSection && (
                <>
                    {!section.parent_id && canAddChildSection && (
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
            {canEditSection && (
                <button 
                    onClick={() => onEdit?.(child)}
                    className="absolute right-1 opacity-0 group-hover/child:opacity-100 p-0.5 hover:bg-bg rounded text-muted hover:text-text transition-opacity"
                >
                    <MoreHorizontal size={10} />
                </button>
            )}
          </div>
          <RosterTable 
            contents={child.contents || []} 
            accentColor={child.color || section.color || 'var(--accent)'} 
            columns={columns} 
            editMode={editMode}
            canModerate={canModerate}
            permissions={permissions}
            onAddRow={() => handleAddRow(child.id)}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
          />
        </div>
      ))}

      {/* If it's a root section but has no children */}
      {(!section.children || section.children.length === 0) && (
        <RosterTable 
          contents={section.contents || []} 
          accentColor={section.color || 'var(--accent)'} 
          columns={columns} 
          editMode={editMode}
          canModerate={canModerate}
          permissions={permissions}
          onAddRow={() => handleAddRow(section.id)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
        />
      )}
    </div>
  );
};
