import React from 'react';
import { MoreHorizontal, Plus, Calculator } from 'lucide-react';
import { RosterSection } from '../types';
import { RosterTable } from './RosterTable';
import api from '../api';
import toast from 'react-hot-toast';
import { hexToRgb } from '../utils';

interface SectionCardProps {
  section: RosterSection;
  user?: any;
  canModerate?: boolean;
  permissions?: any;
  columns?: any[];
  rosterColumns?: any[];
  datasets?: any[];
  recordData?: any[];
  flags?: any[];
  allContents?: any[];
  editMode?: boolean;
  rosterColor?: string;
  onAddChild?: (parentId: number) => void;
  onEdit?: (section: RosterSection) => void;
  onManageCounts?: (section: RosterSection) => void;
  calculateCount?: (count: any, scope: 'roster' | 'section', targetSection?: any) => number;
  onRefresh?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({ 
  section, 
  user,
  canModerate, 
  permissions,
  columns, 
  rosterColumns,
  datasets,
  recordData,
  flags,
  allContents,
  editMode,
  rosterColor,
  onAddChild, 
  onEdit,
  onManageCounts,
  calculateCount,
  onRefresh
}) => {
  const canEditSection = canModerate || permissions?.add_sections;
  const canAddChildSection = canModerate || permissions?.add_sections;

  const renderChild = (child: RosterSection) => {
    const isSubsection = child.type === 'subsection';
    const childColor = child.color || section.color || rosterColor || 'var(--accent)';
    const childColumns = child.use_roster_columns ? rosterColumns : (child.columns || rosterColumns);
    
    if (isSubsection) {
      return (
        <div 
          key={child.id} 
          className="unit-section border-t border-border bg-card group/child relative"
          style={{ 
            '--accent': childColor,
            '--accent-rgb': childColor.startsWith('#') ? hexToRgb(childColor) : undefined
          } as React.CSSProperties}
        >
          <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
            <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-[9px] font-bold text-text uppercase truncate">{child.name}</span>
            </div>
            {canEditSection && (
                <button 
                    onClick={() => onEdit?.(child)}
                    className="p-1 hover:bg-surface rounded text-muted hover:text-accent opacity-0 group-hover/child:opacity-100 transition-opacity"
                >
                    <MoreHorizontal size={12} />
                </button>
            )}
          </div>
          <RosterTable 
            contents={child.contents || []} 
            allContents={allContents}
            user={user}
            accentColor={childColor} 
            columns={childColumns} 
            datasets={datasets}
            recordData={recordData}
            flags={flags}
            editMode={editMode}
            canModerate={canModerate}
            permissions={permissions}
            onAddRow={() => handleAddRow(child.id)}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onBulkDeleteRow={handleBulkDeleteRows}
          />
        </div>
      );
    }

    // Regular section style (compact)
    return (
      <div 
        key={child.id} 
        className="unit-section group/child relative"
        style={{ 
          '--accent': childColor,
          '--accent-rgb': childColor.startsWith('#') ? hexToRgb(childColor) : undefined
        } as React.CSSProperties}
      >
        <div className="section-header py-0.5 px-2 border-b border-border bg-border/10 flex items-center gap-1.5 shrink-0 group/child relative">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: childColor }} />
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
          allContents={allContents}
          user={user}
          accentColor={childColor} 
          columns={childColumns} 
          datasets={datasets}
          recordData={recordData}
          flags={flags}
          editMode={editMode}
          canModerate={canModerate}
          permissions={permissions}
          onAddRow={() => handleAddRow(child.id)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
          onBulkDeleteRow={handleBulkDeleteRows}
        />
      </div>
    );
  };

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

  const handleUpdateRow = async (id: number, data: any, force = false, lastUpdatedAt?: string | null) => {
    try {
      await api.put(`/contents/${id}`, { 
        content: data,
        force,
        last_updated_at: lastUpdatedAt
      });
      onRefresh?.();
      return true;
    } catch (err: any) {
      if (err.response?.status === 409) {
        const conflictData = err.response.data;
        toast((t) => (
          <div className="flex flex-col gap-2 min-w-[250px]">
            <p className="font-bold text-danger uppercase text-[10px] tracking-widest">Conflict Detected</p>
            <p className="text-[9px] opacity-80 uppercase leading-tight">
                {conflictData.updated_by} updated this row while you were editing.
            </p>
            <div className="flex gap-2 justify-end mt-1">
                <button 
                    onClick={() => {
                        toast.dismiss(t.id);
                        onRefresh?.();
                    }}
                    className="px-2 py-1 bg-surface border border-border rounded text-[8px] font-black uppercase"
                >
                    Discard & Refresh
                </button>
                <button 
                    onClick={async () => {
                        toast.dismiss(t.id);
                        await handleUpdateRow(id, data, true);
                    }}
                    className="px-2 py-1 bg-danger text-white rounded text-[8px] font-black uppercase"
                >
                    Force Overwrite
                </button>
            </div>
          </div>
        ), { duration: Infinity, position: 'top-center' });
        return false;
      }
      toast.error('Failed to save changes');
      console.error('Failed to update row', err);
      throw err;
    }
  };

  const performDeleteRow = async (id: number, silent = false) => {
    let loadToast = null;
    if (!silent) loadToast = toast.loading('Deleting row...');
    
    try {
      await api.delete(`/contents/${id}`);
      if (!silent && loadToast) toast.success('Row deleted', { id: loadToast });
      return true;
    } catch (err) {
      if (!silent && loadToast) toast.error('Failed to delete row', { id: loadToast });
      console.error('Failed to delete row', err);
      return false;
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
              const success = await performDeleteRow(id);
              if (success) onRefresh?.();
            }}
            className="px-2 py-1 bg-danger text-white hover:bg-danger/90 rounded text-[9px] font-bold uppercase transition shadow-lg shadow-danger/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  };

  const handleBulkDeleteRows = async (ids: number[]) => {
    const loadToast = toast.loading(`Deleting ${ids.length} rows...`);
    try {
        let successCount = 0;
        for (const id of ids) {
            const success = await performDeleteRow(id, true);
            if (success) successCount++;
        }
        toast.success(`Successfully deleted ${successCount} rows`, { id: loadToast });
        onRefresh?.();
    } catch (err) {
        toast.error('Bulk deletion encountered an error', { id: loadToast });
    }
  };

  if (section.type === 'master' || section.type === 'subsection') {
    const effectiveColor = section.color || rosterColor || 'var(--accent)';
    return (
      <div 
        className="div-leadership w-full border border-border bg-card mb-4 group relative"
        style={{ 
          '--accent': effectiveColor,
          '--accent-rgb': effectiveColor.startsWith('#') ? hexToRgb(effectiveColor) : undefined
        } as React.CSSProperties}
      >
        <div className="section-header py-0.5 px-2 border-b border-border bg-border/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-text uppercase">{section.name}</span>
            {!section.parent_id && section.counts && section.counts.length > 0 && (
                <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                    {section.counts.map((count: any) => (
                        <div key={count.id} className="flex items-center gap-1.5">
                            <span className="text-[7px] font-black text-muted uppercase tracking-widest">{count.name}</span>
                            <span className="text-[9px] font-black tabular-nums" style={{ color: count.color }}>
                                {calculateCount?.(count, 'section', section)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!section.parent_id && canEditSection && (
                <button 
                    onClick={() => onManageCounts?.(section)}
                    className="p-1 hover:bg-surface rounded text-muted hover:text-accent transition-colors"
                    title="Manage Section Counts"
                >
                    <Calculator size={11} className="opacity-60" />
                </button>
            )}
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
          allContents={allContents}
          user={user}
          isLeadership={section.type === 'master'} 
          accentColor={effectiveColor} 
          columns={columns} 
          datasets={datasets}
          recordData={recordData}
          flags={flags}
          editMode={editMode}
          canModerate={canModerate}
          permissions={permissions}
          onAddRow={() => handleAddRow(section.id)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
          onBulkDeleteRow={handleBulkDeleteRows}
        />
      </div>
    );
  }

  const effectiveColor = section.color || rosterColor || 'var(--accent)';

  return (
    <div 
      className="bureau-card border border-border rounded-lg bg-card shadow-[var(--sh)] flex flex-col group relative"
      style={{ 
        '--accent': effectiveColor,
        '--accent-rgb': effectiveColor.startsWith('#') ? hexToRgb(effectiveColor) : undefined
      } as React.CSSProperties}
    >
      <div className="bureau-card-top flex h-[24px] items-stretch border-b border-border bg-surface shrink-0 rounded-t-lg overflow-hidden">
        <div className="w-[5px] shrink-0" style={{ backgroundColor: effectiveColor }} />
        <div className="flex-1 flex items-center px-2 justify-center gap-1.5 overflow-hidden">
          <div className="flex items-center gap-3">
              <span className="font-bold text-[11px] text-text uppercase truncate">
                {section.name}
              </span>
              {!section.parent_id && section.counts && section.counts.length > 0 && (
                  <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                      {section.counts.map((count: any) => (
                          <div key={count.id} className="flex items-center gap-1.5">
                              <span className="text-[7px] font-black text-muted uppercase tracking-widest">{count.name}</span>
                              <span className="text-[9px] font-black tabular-nums" style={{ color: count.color }}>
                                  {calculateCount?.(count, 'section', section)}
                              </span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {canEditSection && (
                <>
                    {!section.parent_id && (
                        <button 
                            onClick={() => onManageCounts?.(section)}
                            className="px-1.5 py-0.5 hover:bg-bg rounded text-muted hover:text-accent flex items-center gap-1 transition-colors"
                            title="Manage Section Counts"
                        >
                            <span className="text-[7px] font-black uppercase tracking-widest">counts</span>
                        </button>
                    )}
                    {!section.parent_id && canAddChildSection && (
                        <button 
                            onClick={() => onAddChild?.(section.id)}
                            className="px-1.5 py-0.5 hover:bg-bg rounded text-muted hover:text-accent flex items-center gap-1 transition-colors"
                        >
                            <span className="text-[7px] font-black uppercase tracking-widest">section</span>
                            <Plus size={8} />
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
      <div className="sections-container w-full divide-y divide-border">
        {section.type === 'content' && (
            <div className="p-4 bg-card/30">
                <div 
                    className="prose prose-invert max-w-none text-[11px] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: section.content_html || '' }}
                />
            </div>
        )}

        {section.layout_settings?.rows?.map((row: any, rowIdx: number) => (
          <div 
            key={`row-${rowIdx}`} 
            className="grid w-full items-start divide-x divide-border"
            style={{ 
              gridTemplateColumns: `repeat(${row.columns || 1}, minmax(0, 1fr))` 
            }}
          >
            {row.section_ids?.map((sId: number) => {
              const child = section.children?.find((s: any) => s.id === sId);
              if (!child) return <div key={`empty-${sId}`} className="border-r border-border last:border-r-0" />;
              return renderChild(child);
            })}
          </div>
        ))}

        {/* Fallback for children not in custom rows */}
        {(section.children?.filter((s: any) => !section.layout_settings?.rows?.some((r: any) => r.section_ids?.includes(s.id))).length ?? 0) > 0 && (
            <div 
                className="grid w-full items-start divide-x divide-border"
                style={{ 
                    gridTemplateColumns: `repeat(${section.subsections_per_row || 1}, minmax(0, 1fr))` 
                }}
            >
                {section.children?.filter((s: any) => {
                    const inCustomRow = section.layout_settings?.rows?.some((r: any) => r.section_ids?.includes(s.id));
                    return !inCustomRow;
                }).map((child: any) => renderChild(child))}
            </div>
        )}
      </div>

      {/* If it's a root section but has no children */}
      {(!section.children || section.children.length === 0) && section.type !== 'content' && (
        <RosterTable 
          contents={section.contents || []} 
          allContents={allContents}
          user={user}
          accentColor={effectiveColor} 
          columns={columns} 
          datasets={datasets}
          recordData={recordData}
          flags={flags}
          editMode={editMode}
          canModerate={canModerate}
          permissions={permissions}
          onAddRow={() => handleAddRow(section.id)}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
          onBulkDeleteRow={handleBulkDeleteRows}
        />
      )}
    </div>
  );
};
