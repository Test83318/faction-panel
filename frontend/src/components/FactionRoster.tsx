import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import toast from 'react-hot-toast';
import api from '../api';
import { Roster as RosterType } from '../types';
import { Plus, Pencil, MoreVertical, Layout, GripVertical, ChevronLeft, ChevronRight, Trash2, ShieldAlert, Shield, Settings2, Database, Menu, Flag, FileCode2 } from 'lucide-react';
import { SectionCard } from './SectionCard';
import RosterLayoutModal from './RosterLayoutModal';
import SectionLayoutModal from './SectionLayoutModal';
import GlobalVariablesModal from './GlobalVariablesModal';
import FlagManagerModal from './FlagManagerModal';
import { RosterPermissionsModal } from './RosterPermissionsModal';
import { ColumnsModal } from './ColumnsModal';
import { RosterTemplateModal } from './RosterTemplateModal';
import { hexToRgb } from '../utils';

interface FactionRosterProps {
    user: any;
    activeDivision: any;
    totalMembers: number;
    rosters: any[];
    setRosters: (rosters: any[]) => void;
    activeDivId: number | null;
    setActiveDivId: (id: number | null) => void;
    permissions: string[];
    shortname: string | undefined;
    fetchRosters: () => Promise<void>;
    datasets: any[];
    recordData: any[];
    flags: any[];
    onlineUsers?: any[];
}

const FactionRoster: React.FC<FactionRosterProps> = ({ 
    user,
    activeDivision, 
    totalMembers, 
    rosters, 
    setRosters, 
    activeDivId, 
    setActiveDivId, 
    permissions, 
    shortname, 
    fetchRosters, 
    datasets, 
    recordData, 
    flags,
    onlineUsers = []
}) => {
  const canCreate = permissions.includes('create_roster');
  const canModifyVariables = permissions.includes('modify_roster_variables');
  const canModifyFlags = permissions.includes('modify_roster_flags');
  const isGlobalMod = permissions.includes('global_roster_moderation');
  
  const rosterPerms = activeDivision?.user_roster_permissions || {};
  const canModerate = isGlobalMod || rosterPerms.modify_roster || rosterPerms.add_sections || rosterPerms.remove_sections || rosterPerms.manage_columns || rosterPerms.manage_layout;
  const canAddSections = isGlobalMod || rosterPerms.add_sections;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState<any | null>(null);
  const [showSectionColumnsModal, setShowSectionColumnsModal] = useState<any | null>(null);
  const [showSectionLayoutModal, setShowSectionLayoutModal] = useState<any | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<RosterType | null>(null);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showFlagsModal, setShowFlagsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState<RosterType | null>(null);
  const [showRosterContextMenu, setShowRosterContextMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(() => {
        // Only poll if not currently editing a roster structure or major settings
        if (!showCreateModal && !showSectionModal && !showColumnsModal && !showSectionColumnsModal && !showSectionLayoutModal && !showLayoutModal) {
            fetchRosters();
        }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [showCreateModal, showSectionModal, showColumnsModal, showSectionColumnsModal, showSectionLayoutModal, showLayoutModal, fetchRosters]);

  const allContents = useMemo(() => {
    const contents: any[] = [];
    rosters.forEach(r => {
        const getSectionContents = (sec: any): any[] => {
            let items = (sec.contents || []).map((c: any) => ({ ...c, roster_id: r.id }));
            if (sec.children) {
                sec.children.forEach((child: any) => {
                    items = [...items, ...getSectionContents(child)];
                });
            }
            return items;
        };
        (r.rootSections || []).forEach((s: any) => {
            contents.push(...getSectionContents(s));
        });
    });
    return contents;
  }, [rosters]);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0 });
  
  const [newRoster, setNewRoster] = useState({ id: null as number | null, name: '', shortname: '', color: '#3b82f6' });
  
  const [sectionData, setSectionData] = useState({ 
    id: null as number | null,
    roster_id: null as number | null,
    name: '', 
    shortname: '', 
    color: '', 
    type: 'section' as 'master' | 'section' | 'subsection',
    parent_id: null as number | null,
    columns: null as any[] | null,
    children: [] as any[],
    layout_settings: null as any,
    subsections_per_row: 1,
    content_html: '' as string | null
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadToast = toast.loading(newRoster.id ? 'Saving roster...' : 'Creating roster...');
    try {
      if (newRoster.id) {
        await api.put(`/rosters/${newRoster.id}`, newRoster);
        toast.success('Roster updated', { id: loadToast });
      } else {
        await api.post(`/factions/${shortname}/rosters`, newRoster);
        toast.success('Roster created', { id: loadToast });
      }
      await fetchRosters();
      setShowCreateModal(false);
      setNewRoster({ id: null, name: '', shortname: '', color: '#3b82f6' });
    } catch (err) {
      toast.error('Failed to save roster', { id: loadToast });
      console.error('Failed to save roster', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRoster = (roster: any) => {
    setNewRoster({
      id: roster.id,
      name: roster.name,
      shortname: roster.shortname,
      color: roster.color
    });
    setShowCreateModal(true);
    setActiveMenuId(null);
  };

  const handleReorder = async (newOrder: any[]) => {
    setRosters(newOrder);
    try {
        await api.put(`/factions/${shortname}/rosters/reorder`, {
            roster_ids: newOrder.map(r => r.id)
        });
        toast.success('Order saved');
    } catch (err) {
        toast.error('Failed to save order');
        console.error('Failed to reorder rosters', err);
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadToast = toast.loading(sectionData.id ? 'Saving section...' : 'Creating section...');
    try {
      if (sectionData.id) {
        await api.put(`/sections/${sectionData.id}`, sectionData);
        toast.success('Section updated', { id: loadToast });
      } else {
        const rosterId = sectionData.roster_id || activeDivId;
        await api.post(`/rosters/${rosterId}/sections`, sectionData);
        toast.success('Section created', { id: loadToast });
      }
      await fetchRosters();
      setShowSectionModal(false);
      setSectionData({ 
        id: null, 
        roster_id: null,
        name: '', 
        shortname: '', 
        color: '', 
        type: 'section', 
        parent_id: null, 
        columns: null, 
        children: [], 
        layout_settings: null, 
        subsections_per_row: 1,
        content_html: '' 
      });
    } catch (err) {
      toast.error('Failed to save section', { id: loadToast });
      console.error('Failed to save section', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const roster = rosters.find(r => r.id === id);
    if (!roster) return;

    toast((t) => (
      <div className="flex flex-col gap-1 text-left">
        <p className="font-bold">Delete roster "{roster.name}"?</p>
        <p className="text-[10px] opacity-80 uppercase tracking-tighter">This action cannot be undone and will delete all sections and contents.</p>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const loadToast = toast.loading('Deleting roster...');
              try {
                await api.delete(`/rosters/${id}`);
                toast.success('Roster deleted', { id: loadToast });
                await fetchRosters();
                setActiveMenuId(null);
              } catch (err) {
                toast.error('Failed to delete roster', { id: loadToast });
                console.error('Failed to delete roster', err);
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

  const handleDeleteSection = async (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-1 text-left">
        <p className="font-bold">Delete this section?</p>
        <p className="text-[10px] opacity-80 uppercase tracking-tighter">This action cannot be undone and will delete all content within this section.</p>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const loadToast = toast.loading('Deleting section...');
              try {
                await api.delete(`/sections/${id}`);
                toast.success('Section deleted', { id: loadToast });
                await fetchRosters();
                setShowSectionModal(false);
              } catch (err) {
                toast.error('Failed to delete section', { id: loadToast });
                console.error('Failed to delete section', err);
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

  const handleAddChildSection = (parentId: number) => {
    let parentRosterId = activeDivId;
    if (activeDivision?.root_sections) {
      const findParent = (sections: any[]): any => {
        for (const s of sections) {
          if (s.id === parentId) return s;
          if (s.children) {
            const found = findParent(s.children);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = findParent(activeDivision.root_sections);
      if (parent) parentRosterId = parent.roster_id;
    }

    setSectionData({
        id: null,
        roster_id: parentRosterId,
        name: '',
        shortname: '',
        color: '',
        type: 'section',
        parent_id: parentId,
        columns: null,
        children: [],
        layout_settings: null,
        subsections_per_row: 1,
        content_html: ''
    });
    setShowSectionModal(true);
  };

  const handleEditSection = (section: any) => {
    setSectionData({
        id: section.id,
        roster_id: section.roster_id,
        name: section.name,
        shortname: section.shortname,
        color: section.color || '',
        type: section.type,
        parent_id: section.parent_id,
        columns: section.columns,
        children: Array.isArray(section.children) ? section.children : [],
        layout_settings: section.layout_settings,
        subsections_per_row: section.subsections_per_row || 1,
        content_html: section.content_html || ''
    });
    setShowSectionModal(true);
  };

  return (
    <div 
        className="flex flex-col h-full relative" 
        onClick={() => setActiveMenuId(null)}
        style={{
            '--accent': activeDivision?.color,
            '--accent-rgb': activeDivision?.color?.startsWith('#') ? hexToRgb(activeDivision.color) : undefined
        } as React.CSSProperties}
    >
      <main className="main flex-1 overflow-auto p-5 pb-16">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeDivId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center"
          >
            {activeDivision ? (
              <div className="div-top-section w-full flex flex-col items-center">
                <div className="div-hero w-full flex items-center p-1.5 pl-10 border border-border border-b-0 bg-card rounded-t-lg relative gap-2.5 h-[34px]">
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ backgroundColor: activeDivision.color }} />
                  <div className="flex-1 text-center text-text font-extrabold text-[15px] uppercase tracking-tighter">
                    {activeDivision.name}
                  </div>
                  <div className="flex items-center gap-3 pr-2">
                    {/* Online Viewers */}
                    <div className="flex items-center -space-x-1.5">
                        {(() => {
                            const activeViewers = onlineUsers.filter(u => u.current_roster_id === activeDivId);
                            const displayViewers = activeViewers.slice(0, 3);
                            const remainingCount = activeViewers.length - 3;
                            
                            return (
                                <>
                                    {displayViewers.map(u => (
                                        <div 
                                            key={u.id} 
                                            className="relative group/avatar"
                                        >
                                            <div 
                                                className="w-[18px] h-[18px] rounded-full border-[1.5px] bg-card overflow-hidden transition-transform group-hover/avatar:-translate-y-0.5 shadow-sm"
                                                style={{ borderColor: u.primary_role?.color || 'var(--border)' }}
                                            >
                                                <img 
                                                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random&color=fff&size=40`} 
                                                    alt={u.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-1.5 py-0.5 bg-black text-white text-[7px] font-bold uppercase rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl border border-white/10">
                                                {u.username}
                                            </div>
                                        </div>
                                    ))}
                                    {remainingCount > 0 && (
                                        <div 
                                            className="w-[18px] h-[18px] rounded-full border-[1.5px] border-border bg-surface flex items-center justify-center shadow-sm relative z-10 group/more"
                                            title={`${remainingCount} more users viewing`}
                                        >
                                            <span className="text-[7px] font-black text-muted">+{remainingCount}</span>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-1.5 py-0.5 bg-black text-white text-[7px] font-bold uppercase rounded opacity-0 group-hover/more:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl border border-white/10">
                                                {activeViewers.slice(3).map(u => u.username).join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {canModerate && (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setEditMode(!editMode)}
                                className={`px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${editMode ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'hover:bg-surface text-muted hover:text-accent'}`}
                                title={editMode ? 'Exit Editing Mode' : 'Enter Editing Mode'}
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
                                <Pencil size={11} />
                            </button>
                            {canAddSections && (
                                <button 
                                    onClick={() => {
                                        setSectionData({ id: null, roster_id: activeDivId, name: '', shortname: '', color: '', type: 'section', parent_id: null, columns: null, children: [], layout_settings: null, subsections_per_row: 1 });
                                        setShowSectionModal(true);
                                    }}
                                    className="px-2 py-1 hover:bg-surface rounded text-muted hover:text-accent transition-colors flex items-center gap-1"
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest">section</span>
                                    <Plus size={12} />
                                </button>
                            )}
                        </div>
                    )}
                  </div>
                  <div className="text-[9.5px] text-muted shrink-0 pr-4">
                    <strong className="text-accent">{totalMembers}</strong> PERSONNEL
                  </div>
                </div>

                {activeDivision.root_sections?.filter((s: any) => s.type === 'master').map((section: any) => (
                    <SectionCard 
                        key={section.id} 
                        section={section} 
                        user={user}
                        canModerate={isGlobalMod}
                        permissions={rosterPerms}
                        onEdit={handleEditSection}
                        columns={section.columns || rosters.find((r: any) => r.id === activeDivId)?.columns}
                        datasets={datasets}
                        recordData={recordData}
                        allContents={allContents}
                        editMode={editMode}
                        rosterColor={activeDivision.color}
                        onRefresh={fetchRosters}
                    />
                ))}

                <div className="sections-container w-full space-y-4">
                  {activeDivision.layout_settings?.rows?.map((row: any, rowIdx: number) => (
                    <div 
                      key={rowIdx} 
                      className="grid gap-4 w-full items-start"
                      style={{ 
                        gridTemplateColumns: `repeat(${row.columns || 2}, minmax(300px, 1fr))` 
                      }}
                    >
                      {row.section_ids?.map((sId: number) => {
                        const section = activeDivision.root_sections?.find((s: any) => s.id === sId);
                        if (!section || section.type === 'master') return null;
                        return (
                          <SectionCard 
                            key={section.id} 
                            section={section} 
                            canModerate={isGlobalMod}
                            permissions={rosterPerms}
                            onAddChild={handleAddChildSection}
                            onEdit={handleEditSection}
                            columns={section.columns || rosters.find((r: any) => r.id === activeDivId)?.columns}
                            datasets={datasets}
                            allContents={allContents}
                            editMode={editMode}
                            rosterColor={activeDivision.color}
                            onRefresh={fetchRosters}
                          />
                        );
                      })}
                    </div>
                  ))}

                  <div 
                    className="grid gap-4 w-full items-start"
                    style={{ 
                      gridTemplateColumns: `repeat(${activeDivision.default_sections_per_row || 2}, minmax(300px, 1fr))` 
                    }}
                  >
                    {activeDivision.root_sections?.filter((s: any) => {
                      if (s.type === 'master') return false;
                      const inCustomRow = activeDivision.layout_settings?.rows?.some((r: any) => r.section_ids?.includes(s.id));
                      return !inCustomRow;
                    }).map((section: any) => (
                      <SectionCard 
                        key={section.id} 
                        section={section} 
                        user={user}
                        canModerate={isGlobalMod}
                        permissions={rosterPerms}
                        onAddChild={handleAddChildSection}
                        onEdit={handleEditSection}
                        columns={section.columns || rosters.find((r: any) => r.id === activeDivId)?.columns}
                        datasets={datasets}
                        recordData={recordData}
                        allContents={allContents}
                        editMode={editMode}
                        rosterColor={activeDivision.color}
                        onRefresh={fetchRosters}
                      />
                    ))}
                  </div>
                </div>

                {(!activeDivision.root_sections || activeDivision.root_sections.length === 0) && (
                    <div className="w-full flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-b-lg bg-card/50">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">No sections defined</p>
                        {canModerate && (
                            <button 
                                onClick={() => {
                                    setSectionData({ id: null, roster_id: activeDivId, name: '', shortname: '', color: '', type: 'section', parent_id: null, columns: null, children: [], layout_settings: null, subsections_per_row: 1 });
                                    setShowSectionModal(true);
                                }}
                                className="mt-4 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded font-bold text-[10px] uppercase tracking-widest transition-all"
                            >
                                Add First Section
                            </button>
                        )}
                    </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-muted text-center">
                <ShieldAlert size={48} className="opacity-10 mb-4" />
                <p className="uppercase tracking-widest text-sm font-black mb-2">No rosters defined yet</p>
                {canCreate && (
                  <p className="text-[10px] font-bold opacity-60 max-w-xs leading-relaxed uppercase tracking-tighter">
                    You have permission to manage rosters. <br />
                    Press the <span className="text-accent font-black">+</span> at the bottom of the page to start.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="tabs-bar bg-card border-t border-border flex items-center px-2.5 h-[var(--tab-h)] sticky bottom-0 z-[210]">
        <Reorder.Group 
            axis="x" 
            values={rosters} 
            onReorder={handleReorder}
            className="flex items-center flex-1 overflow-x-auto scrollbar-none gap-1 h-full"
        >
          {rosters.map((roster: any) => (
            <Reorder.Item 
                key={roster.id} 
                value={roster}
                className="flex items-center group relative h-full shrink-0"
            >
              <div 
                onClick={() => setActiveDivId(roster.id)}
                className={`tab pl-4 py-2 cursor-pointer transition-all text-[10px] font-bold uppercase h-full flex items-center gap-1.5 relative border-t-2 ${
                  canModerate ? 'pr-1' : 'pr-4'
                } ${
                  activeDivId === roster.id 
                    ? 'border-accent text-accent bg-accent/5' 
                    : 'border-transparent text-muted hover:text-text hover:bg-surface'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roster.color }} />
                <span>{roster.name}</span>

                {canModerate && (
                    <div className="flex items-center">
                        <div className={`transition-opacity flex items-center ${activeMenuId === roster.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             <button 
                                type="button"
                                className={`text-muted hover:text-accent cursor-pointer p-0.5 rounded hover:bg-accent/10 ${activeMenuId === roster.id ? 'text-accent bg-accent/10' : ''}`} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (activeMenuId === roster.id) {
                                        setActiveMenuId(null);
                                    } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenuPosition({ left: rect.left + rect.width / 2 });
                                        setActiveMenuId(roster.id);
                                    }
                                }} 
                             >
                                <MoreVertical size={12} />
                             </button>
                        </div>

                        {activeMenuId === roster.id && (
                            <div 
                                className="fixed bottom-[var(--tab-h)] mb-2 bg-card border border-border rounded-lg shadow-2xl p-1 z-[999] min-w-[140px]"
                                style={{ 
                                    left: menuPosition.left,
                                    transform: 'translateX(-50%)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(isGlobalMod || roster.user_roster_permissions?.modify_roster) && (
                                    <button 
                                        onClick={() => handleEditRoster(roster)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                    >
                                        <Settings2 size={12} /> Edit Roster
                                    </button>
                                )}
                                {(isGlobalMod || roster.user_roster_permissions?.manage_columns) && (
                                    <button 
                                        onClick={() => {
                                            setShowColumnsModal(roster);
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                    >
                                        <Settings2 size={12} /> Manage Columns
                                    </button>
                                )}
                                {(isGlobalMod || roster.user_roster_permissions?.manage_layout) && (
                                    <button 
                                        onClick={() => {
                                            setShowLayoutModal(roster);
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                    >
                                        <Layout size={12} /> Manage Layout
                                    </button>
                                )}
                                {(isGlobalMod || roster.user_roster_permissions?.modify_roster) && (
                                    <button 
                                        onClick={() => {
                                            setShowPermissionsModal(roster);
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                    >
                                        <Shield size={12} /> Permissions
                                    </button>
                                )}
                                {(isGlobalMod || roster.user_roster_permissions?.modify_roster) && (
                                    <button 
                                        onClick={() => handleDelete(roster.id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-danger/70 hover:text-danger hover:bg-danger/5 rounded transition-colors"
                                    >
                                        <Trash2 size={12} /> Remove Roster
                                    </button>
                                )}
                                <div className="border-t border-border mt-1 pt-1">
                                    <div className="px-3 py-1.5 text-[8px] font-black uppercase text-muted/50 tracking-widest flex items-center gap-2">
                                        <GripVertical size={10} /> Drag to reorder
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>
            </Reorder.Item>
          ))}

          {canCreate && (
            <div className="relative flex items-center gap-1 ml-2 shrink-0">
                <button 
                    onClick={() => {
                        setNewRoster({ id: null, name: '', shortname: '', color: '#3b82f6' });
                        setShowCreateModal(true);
                    }}
                    className="p-2 text-muted hover:text-accent transition-colors"
                    title="Create New Roster"
                >
                    <Plus size={16} />
                </button>
                {canModifyVariables && (
                    <div className="relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!showRosterContextMenu) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPosition({ left: rect.left + rect.width / 2 });
                                }
                                setShowRosterContextMenu(!showRosterContextMenu);
                            }}
                            className={`p-2 transition-colors ${showRosterContextMenu ? 'text-accent' : 'text-muted hover:text-accent'}`}
                            title="Global Options"
                        >
                            <Menu size={16} />
                        </button>
                        {showRosterContextMenu && (
                            <div 
                                className="fixed bottom-[var(--tab-h)] mb-2 bg-card border border-border rounded-lg shadow-2xl p-1 z-[999] min-w-[160px]"
                                onClick={(e) => e.stopPropagation()}
                                style={{ 
                                    left: menuPosition.left,
                                    transform: 'translateX(-50%)' 
                                }}
                            >
                                <button 
                                    onClick={() => {
                                        setShowVariablesModal(true);
                                        setShowRosterContextMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                >
                                    <Database size={12} /> Global Variables
                                </button>
                                {canModifyFlags && (
                                    <button
                                        onClick={() => {
                                            setShowFlagsModal(true);
                                            setShowRosterContextMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded transition-colors"
                                    >
                                        <Flag size={12} /> Flag Manager
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowTemplateModal(true);
                                        setShowRosterContextMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent-light hover:bg-accent/5 rounded transition-colors"
                                >
                                    <FileCode2 size={12} /> Roster Template
                                </button>
                                </div>                        )}
                    </div>
                )}
            </div>
          )}
        </Reorder.Group>

        {rosters.length > 5 && (
          <div className="flex border-l border-border pl-2 gap-1 h-full items-center">
            <button className="p-1.5 text-muted hover:text-text"><ChevronLeft size={16} /></button>
            <button className="p-1.5 text-muted hover:text-text"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showColumnsModal && (
        <ColumnsModal 
          target={showColumnsModal} 
          type="roster"
          shortname={shortname!}
          onClose={() => setShowColumnsModal(null)} 
          onSave={() => {
            setShowColumnsModal(null);
            fetchRosters();
          }} 
        />
      )}

      {showSectionColumnsModal && (
        <ColumnsModal 
          target={showSectionColumnsModal} 
          parentColumns={rosters.find((r: any) => r.id === (showSectionColumnsModal.roster_id || activeDivId))?.columns}
          type="section"
          shortname={shortname!}
          onClose={() => setShowSectionColumnsModal(null)} 
          onSave={() => {
            setShowSectionColumnsModal(null);
            fetchRosters();
          }} 
        />
      )}

      {showPermissionsModal && (
        <RosterPermissionsModal
          roster={showPermissionsModal}
          shortname={shortname}
          onClose={() => setShowPermissionsModal(null)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
          <div className="bg-card p-6 rounded-lg max-w-sm w-full border border-border shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-text">
                {newRoster.id ? <Settings2 size={18} /> : <Plus size={18} />} 
                {newRoster.id ? 'Edit Roster' : 'Create New Roster'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Roster Name</label>
                <input 
                  value={newRoster.name} 
                  onChange={e => setNewRoster({ ...newRoster, name: e.target.value })} 
                  className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" 
                  required 
                  placeholder="e.g. Central Patrol Division" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Short Name (Max 6 Chars)</label>
                <input 
                  value={newRoster.shortname} 
                  onChange={e => setNewRoster({ ...newRoster, shortname: e.target.value.slice(0, 6).toUpperCase() })} 
                  className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition uppercase" 
                  required 
                  placeholder="e.g. CPD" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Roster Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={newRoster.color} 
                    onChange={e => setNewRoster({ ...newRoster, color: e.target.value })} 
                    className="w-10 h-10 bg-surface border border-border rounded p-1 cursor-pointer" 
                  />
                  <input 
                    value={newRoster.color} 
                    onChange={e => setNewRoster({ ...newRoster, color: e.target.value })} 
                    className="flex-1 bg-surface border border-border p-2 rounded text-sm text-text focus:border-accent outline-none transition font-mono" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">
                  {isSaving ? 'Saving...' : (newRoster.id ? 'Save Changes' : 'Create Roster')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
          <div className="bg-card p-6 rounded-lg max-w-md w-full border border-border shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-text">
                {sectionData.id ? 'Edit Section' : 'Add New Section'}
            </h2>
            <form onSubmit={handleSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Section Name</label>
                <input 
                  value={sectionData.name} 
                  onChange={e => setSectionData({ ...sectionData, name: e.target.value })} 
                  className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition" 
                  required 
                  placeholder="e.g. Division Leadership" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Short Name (Max 6)</label>
                    <input 
                      value={sectionData.shortname} 
                      onChange={e => setSectionData({ ...sectionData, shortname: e.target.value.slice(0, 6).toUpperCase() })} 
                      className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition uppercase" 
                      required 
                      placeholder="e.g. DIVLDR" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Type</label>
                    <select 
                        value={sectionData.type}
                        onChange={e => setSectionData({ ...sectionData, type: e.target.value as any })}
                        className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition"
                    >
                        {!sectionData.parent_id && <option value="master">Master</option>}
                        <option value="section">Section</option>
                        <option value="subsection">Subsection</option>
                        <option value="content">Content (HTML)</option>
                    </select>
                  </div>
              </div>

              {sectionData.type === 'content' && (
                <div>
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">HTML Content</label>
                    <textarea 
                        value={sectionData.content_html || ''} 
                        onChange={e => setSectionData({ ...sectionData, content_html: e.target.value })} 
                        className="w-full bg-surface border border-border p-3 rounded text-sm text-text focus:border-accent outline-none transition font-mono min-h-[200px]" 
                        placeholder="<div>Styling HTML goes here...</div>"
                    />
                    <p className="text-[8px] text-muted mt-1 uppercase font-bold tracking-widest">You can use standard HTML and inline CSS.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Custom Color (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={sectionData.color || '#3b82f6'} 
                    onChange={e => setSectionData({ ...sectionData, color: e.target.value })} 
                    className="w-10 h-10 bg-surface border border-border rounded p-1 cursor-pointer" 
                  />
                  <input 
                    value={sectionData.color} 
                    onChange={e => setSectionData({ ...sectionData, color: e.target.value })} 
                    className="flex-1 bg-surface border border-border p-2 rounded text-sm text-text focus:border-accent outline-none transition font-mono" 
                    placeholder="Inherit from roster"
                  />
                </div>
              </div>

              {sectionData.id && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="block text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2 opacity-50">Management Actions</label>
                  <div className="flex flex-wrap gap-2">
                    <button 
                        type="button" 
                        onClick={() => {
                            setShowSectionColumnsModal(sectionData);
                            setShowSectionModal(false);
                        }} 
                        className="flex-1 px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded font-bold text-[9px] uppercase tracking-widest transition flex items-center justify-center gap-1.5 min-w-[100px]"
                    >
                        <Settings2 size={11} /> Columns
                    </button>
                    {sectionData.type !== 'subsection' && (
                        <button 
                            type="button" 
                            onClick={() => {
                                setShowSectionLayoutModal(sectionData);
                                setShowSectionModal(false);
                            }} 
                            className="flex-1 px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded font-bold text-[9px] uppercase tracking-widest transition flex items-center justify-center gap-1.5 min-w-[100px]"
                        >
                            <Layout size={11} /> Layout
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={() => handleDeleteSection(sectionData.id!)} 
                        className="px-3 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded font-bold text-[9px] uppercase tracking-widest transition min-w-[80px]"
                    >
                        Delete
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSectionModal(false)} className="flex-1 px-4 py-3 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVariablesModal && (
          <GlobalVariablesModal 
            shortname={shortname} 
            onClose={() => setShowVariablesModal(false)} 
          />
      )}

      {showFlagsModal && (
          <FlagManagerModal 
            shortname={shortname} 
            onClose={() => setShowFlagsModal(false)} 
          />
      )}

      {showLayoutModal && (
          <RosterLayoutModal 
            roster={showLayoutModal}
            onClose={() => setShowLayoutModal(null)}
            onSave={() => {
                setShowLayoutModal(null);
                fetchRosters();
            }}
          />
      )}

      {showSectionLayoutModal && (
          <SectionLayoutModal 
            section={showSectionLayoutModal}
            rosterId={showSectionLayoutModal.roster_id || activeDivId}
            onClose={() => setShowSectionLayoutModal(null)}
            onSave={() => {
                setShowSectionLayoutModal(null);
                fetchRosters();
            }}
          />
      )}

      {showTemplateModal && (
          <RosterTemplateModal 
            shortname={shortname!}
            onClose={() => setShowTemplateModal(false)}
          />
      )}
    </div>
  );
};

export default FactionRoster;
