import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SectionCard } from './components/SectionCard';
import { BureauCard } from './components/BureauCard';
import { RosterTable } from './components/RosterTable';
import { ColumnsModal } from './components/ColumnsModal';
import { RosterPermissionsModal } from './components/RosterPermissionsModal';
import Home from './components/Home';
import FactionManager from './components/FactionManager';
import Administration from './components/Administration';
import GroupManagement from './components/GroupManagement';
import Loading from './components/Loading';
import Invite from './components/Invite';
import Register from './components/Register';
import Login from './components/Login';
import api from './api';
import { INITIAL_DATA } from './constants';
import { Faction as FactionType, Roster as RosterType } from './types';
import { Plus, MoreVertical, GripVertical, ChevronLeft, ChevronRight, Trash2, ShieldAlert, Shield, Settings2, Pencil } from 'lucide-react';

const FactionRoster = ({ activeDivision, totalMembers, rosters, setRosters, activeDivId, setActiveDivId, permissions, shortname, fetchRosters }: any) => {
  const canCreate = permissions.includes('create_roster');
  const isGlobalMod = permissions.includes('global_roster_moderation');
  
  const rosterPerms = activeDivision?.user_roster_permissions || {};
  const canModerate = isGlobalMod || rosterPerms.modify_roster || rosterPerms.add_sections || rosterPerms.remove_sections || rosterPerms.manage_columns;
  const canAddSections = isGlobalMod || rosterPerms.add_sections;
  const canManageColumns = isGlobalMod || rosterPerms.manage_columns;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState<RosterType | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<RosterType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: 0 });
  
  const [newRoster, setNewRoster] = useState({ id: null as number | null, name: '', shortname: '', color: '#3b82f6' });
  
  const [sectionData, setSectionData] = useState({ 
    id: null as number | null,
    name: '', 
    shortname: '', 
    color: '', 
    type: 'section' as 'master' | 'section' | 'subsection',
    parent_id: null as number | null
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (newRoster.id) {
        await api.put(`/rosters/${newRoster.id}`, newRoster);
      } else {
        await api.post(`/factions/${shortname}/rosters`, newRoster);
      }
      await fetchRosters();
      setShowCreateModal(false);
      setNewRoster({ id: null, name: '', shortname: '', color: '#3b82f6' });
    } catch (err) {
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
    } catch (err) {
        console.error('Failed to reorder rosters', err);
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (sectionData.id) {
        await api.put(`/sections/${sectionData.id}`, sectionData);
      } else {
        await api.post(`/rosters/${activeDivId}/sections`, sectionData);
      }
      await fetchRosters();
      setShowSectionModal(false);
      setSectionData({ id: null, name: '', shortname: '', color: '', type: 'section', parent_id: null });
    } catch (err) {
      console.error('Failed to save section', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this roster?')) return;
    try {
      await api.delete(`/rosters/${id}`);
      await fetchRosters();
      setActiveMenuId(null);
    } catch (err) {
      console.error('Failed to delete roster', err);
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.delete(`/sections/${id}`);
      await fetchRosters();
      setShowSectionModal(false);
    } catch (err) {
      console.error('Failed to delete section', err);
    }
  };

  const handleAddChildSection = (parentId: number) => {
    setSectionData({ 
        id: null,
        name: '', 
        shortname: '', 
        color: '', 
        type: 'section', 
        parent_id: parentId 
    });
    setShowSectionModal(true);
  };

  const handleEditSection = (section: any) => {
    setSectionData({
        id: section.id,
        name: section.name,
        shortname: section.shortname,
        color: section.color || '',
        type: section.type,
        parent_id: section.parent_id
    });
    setShowSectionModal(true);
  };

  return (
    <div className="flex flex-col h-full relative" onClick={() => setActiveMenuId(null)}>
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
                                    setSectionData({ id: null, name: '', shortname: '', color: '', type: 'section', parent_id: null });
                                    setShowSectionModal(true);
                                }}
                                className="p-1 hover:bg-surface rounded text-muted hover:text-accent transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                  )}
                  <div className="text-[9.5px] text-muted shrink-0 pr-4">
                    <strong className="text-accent">{totalMembers}</strong> PERSONNEL
                  </div>
                </div>

                {activeDivision.root_sections?.filter((s: any) => s.type === 'master').map((section: any) => (
                    <SectionCard 
                        key={section.id} 
                        section={section} 
                        canModerate={isGlobalMod}
                        permissions={rosterPerms}
                        onEdit={handleEditSection}
                        columns={rosters.find((r: any) => r.id === activeDivId)?.columns}
                        editMode={editMode}
                        onRefresh={fetchRosters}
                    />
                ))}

                <div className="sections-container flex flex-wrap gap-4 justify-start items-start w-full">
                  {activeDivision.root_sections?.filter((s: any) => s.type !== 'master').map((section: any) => (
                    <div key={section.id} className="section-col flex flex-col min-w-[450px] flex-1 max-w-[calc(50%-8px)]">
                      <SectionCard 
                        section={section} 
                        canModerate={isGlobalMod}
                        permissions={rosterPerms}
                        onAddChild={handleAddChildSection}
                        onEdit={handleEditSection}
                        columns={rosters.find((r: any) => r.id === activeDivId)?.columns}
                        editMode={editMode}
                        onRefresh={fetchRosters}
                      />                    </div>
                  ))}
                </div>

                {/* Fallback for static/empty state if no sections exist yet */}
                {(!activeDivision.root_sections || activeDivision.root_sections.length === 0) && (
                    <div className="w-full flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-b-lg bg-card/50">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">No sections defined</p>
                        {canModerate && (
                            <button 
                                onClick={() => {
                                    setSectionData({ id: null, name: '', shortname: '', color: '', type: 'section', parent_id: null });
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
                                        setMenuPosition({ left: rect.right });
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
                                    transform: 'translateX(-100%)'
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
            <button 
              onClick={() => {
                setNewRoster({ id: null, name: '', shortname: '', color: '#3b82f6' });
                setShowCreateModal(true);
              }}
              className="p-2 text-muted hover:text-accent transition-colors ml-2 shrink-0"
              title="Create New Roster"
            >
              <Plus size={16} />
            </button>
          )}
        </Reorder.Group>

        {rosters.length > 5 && (
          <div className="flex border-l border-border pl-2 gap-1 h-full items-center">
            <button className="p-1.5 text-muted hover:text-text"><ChevronLeft size={16} /></button>
            <button className="p-1.5 text-muted hover:text-text"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Columns Modal */}
      {showColumnsModal && (
        <ColumnsModal 
          roster={showColumnsModal} 
          onClose={() => setShowColumnsModal(null)} 
          onSave={() => {
            setShowColumnsModal(null);
            fetchRosters();
          }} 
        />
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <RosterPermissionsModal
          roster={showPermissionsModal}
          shortname={shortname}
          onClose={() => setShowPermissionsModal(null)}
        />
      )}

      {/* Create/Edit Modal */}
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

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[600]">
          <div className="bg-card p-6 rounded-lg max-w-sm w-full border border-border shadow-2xl">
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
                    </select>
                  </div>
              </div>
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
              <div className="flex gap-3 pt-4">
                {sectionData.id && (
                    <button type="button" onClick={() => handleDeleteSection(sectionData.id!)} className="px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded font-bold text-xs uppercase tracking-widest transition">Delete</button>
                )}
                <div className="flex-1" />
                <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 bg-surface hover:bg-bg border border-border text-text rounded font-bold text-xs uppercase tracking-widest transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-bold text-xs uppercase tracking-widest transition disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

const Dashboard = ({ user, onLogout, isDark, toggleTheme }: any) => {
  const { shortname } = useParams();
  const location = useLocation();
  const [factionData, setFactionData] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDivId, setActiveDivId] = useState<number | null>(null);
  const [rosters, setRosters] = useState<any[]>([]);

  // Mock static data for now
  const [staticFaction] = useState<FactionType>(INITIAL_DATA[0]);

  const fetchRosters = async () => {
    try {
      const res = await api.get(`/factions/${shortname}/rosters`);
      setRosters(res.data);
      if (res.data.length > 0) {
        if (activeDivId === null || !res.data.find((r: any) => r.id === activeDivId)) {
          setActiveDivId(res.data[0].id);
        }
      } else {
        setActiveDivId(null);
      }
    } catch (err) {
      console.error('Failed to fetch rosters', err);
    }
  };

  useEffect(() => {
    const fetchFactionAndPermissions = async () => {
      try {
        const [factionRes, permsRes] = await Promise.all([
          api.get(`/factions/${shortname}`),
          api.get(`/factions/${shortname}/permissions`)
        ]);
        
        const faction = factionRes.data;
        setFactionData(faction);
        setPermissions(permsRes.data);
        
        await fetchRosters();

        // Apply faction color to CSS variables
        if (faction.color) {
          document.documentElement.style.setProperty('--accent', faction.color);
          const rgb = hexToRgb(faction.color);
          if (rgb) document.documentElement.style.setProperty('--accent-rgb', rgb);
        }

      } catch (err: any) {
        setError(err.response?.data?.message || 'Faction not found');
      } finally {
        setLoading(false);
      }
    };
    fetchFactionAndPermissions();

    // Reset accent color when leaving dashboard
    return () => {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-rgb');
    };
  }, [shortname]);

  if (loading) return <Loading message="Initializing Faction..." />;
  if (error) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
      <p className="mb-8">{error}</p>
      <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-accent hover:bg-accent/90 transition-colors rounded font-bold">Return to Faction Selector</button>
    </div>
  );

  // The active division is the one currently selected from the dynamic rosters
  const activeDivision = rosters.find(r => r.id === activeDivId) || null;
  
  const totalMembers = activeDivision ? (
    (activeDivision.leadership?.length || 0) + 
    (activeDivision.bureaus?.reduce((acc: number, b: any) => 
      acc + (b.leadership?.length || 0) + (b.units?.reduce((uAcc: number, u: any) => uAcc + (u.members?.length || 0), 0) || 0), 0) || 0)
  ) : 0;

  const canViewAdmin = user?.is_superadmin || permissions.includes('view_admin_page');
  const canViewGroups = user?.is_superadmin || permissions.includes('view_groups') || (rosters.length > 0); // Simplified check, GroupController handles strict access

  // Handle root faction path redirect
  if (location.pathname === `/${shortname}`) {
    return <Navigate to={`/${shortname}/roster`} replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        factionName={factionData.name} 
        user={user} 
        userRole={factionData.user_primary_role}
        onLogout={onLogout} 
      />

      <div className="flex flex-1 relative">
        <Sidebar shortname={shortname!} canViewAdmin={canViewAdmin} canViewGroups={canViewGroups} user={user} />

        <div className="flex flex-col flex-1 min-w-0">
          <Routes>
            <Route path="roster" element={
              <FactionRoster 
                activeDivision={activeDivision} 
                totalMembers={totalMembers} 
                rosters={rosters} 
                setRosters={setRosters}
                activeDivId={activeDivId} 
                setActiveDivId={setActiveDivId}
                permissions={permissions}
                shortname={shortname}
                fetchRosters={fetchRosters}
              />
            } />
            <Route path="groups" element={
              canViewGroups ? (
                <main className="main flex-1 overflow-auto p-5">
                  <GroupManagement shortname={shortname!} user={user} permissions={permissions} />
                </main>
              ) : <Navigate to={`/${shortname}/roster`} />
            } />
            <Route path="admin" element={
              canViewAdmin ? (
                <main className="main flex-1 overflow-auto p-5">
                  <Administration faction={factionData} user={user} permissions={permissions} />
                </main>
              ) : <Navigate to={`/${shortname}/roster`} />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const TitleUpdater = ({ user }: { user: any }) => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      document.title = 'Faction Panel';
      return;
    }

    const firstSegment = segments[0];

    if (['login', 'register', 'invite'].includes(firstSegment)) {
      document.title = `Faction Panel · ${firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)}`;
      return;
    }

    // Faction routes
    const shortname = firstSegment.toUpperCase();
    let page = segments[1] || 'Roster';

    const pageMap: Record<string, string> = {
      'admin': 'Administration',
      'roster': 'Roster'
    };

    const displayPage = pageMap[page] || (page.charAt(0).toUpperCase() + page.slice(1));
    document.title = `${shortname} · ${displayPage}`;
  }, [location, user]);

  return null;
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bp-rosters-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get('/user');
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('access_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('access_token', token);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bp-rosters-theme', theme);
  };

  if (loading) return <Loading message="Authenticating..." />;

  return (
    <Router>
      <TitleUpdater user={user} />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        }}
      />
      <Routes>
        <Route path="/" element={
          user ? (
            <FactionManager 
              isDark={isDark} 
              toggleTheme={toggleTheme} 
              user={user} 
              onLogout={handleLogout} 
            />
          ) : (
            <Home 
              onLogin={handleLogin} 
              isDark={isDark} 
              toggleTheme={toggleTheme} 
            />
          )
        } />
        <Route path="/invite/:code" element={<Invite user={user} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/:shortname/*" element={
          <Dashboard user={user} onLogout={handleLogout} isDark={isDark} toggleTheme={toggleTheme} />
        } />
      </Routes>
    </Router>
  );
}

