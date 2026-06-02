import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Bell, Plus, Trash2, Edit, Settings, Shield, Users, 
  Lock, PlusCircle, X, ChevronDown, Check, Info, HelpCircle
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import Loading from './Loading';

interface FactionNotificationsProps {
  shortname: string;
  user: any;
  permissions: string[];
}

export const FactionNotifications: React.FC<FactionNotificationsProps> = ({ shortname, user }) => {
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [canConfigure, setCanConfigure] = useState(false);
  const [factionData, setFactionData] = useState<any>(null);

  // Modal State
  const [showModal, setShowModal] = useState<any | 'create' | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('database_entry_created');
  const [targetId, setTargetId] = useState<string>('');
  const [conditions, setConditions] = useState<any[]>([]);
  const [readType, setReadType] = useState('user_bound');
  const [textTemplate, setTextTemplate] = useState('');
  const [schemePermissions, setSchemePermissions] = useState<any[]>([]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const factionRes = await api.get(`/factions/${shortname}`);
      setFactionData(factionRes.data.faction);

      const res = await api.get(`/factions/${shortname}/notification-schemes`);
      setSchemes(res.data.schemes);
      setRoles(res.data.roles);
      setGroups(res.data.groups);
      setDatabases(res.data.databases);
      setRosters(res.data.rosters);
      setCanConfigure(res.data.can_configure);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load notifications configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [shortname]);

  const handleOpenModal = (scheme: any = null) => {
    if (scheme) {
      setShowModal(scheme);
      setName(scheme.name);
      setTriggerType(scheme.trigger_type);
      setTargetId(scheme.target_id ? String(scheme.target_id) : '');
      setConditions(scheme.conditions || []);
      setReadType(scheme.read_type);
      setTextTemplate(scheme.text_template || '');
      // Format permissions for editing
      const formattedPerms = (scheme.permissions || []).map((p: any) => ({
        role_id: p.role_id ? String(p.role_id) : '',
        group_id: p.group_id ? String(p.group_id) : '',
        permissions: p.permissions || []
      }));
      setSchemePermissions(formattedPerms);
    } else {
      setShowModal('create');
      setName('');
      setTriggerType('database_entry_created');
      setTargetId('');
      setConditions([]);
      setReadType('user_bound');
      setTextTemplate('');
      setSchemePermissions([
        { role_id: '', group_id: '', permissions: ['receive', 'read'] } // Public default
      ]);
    }
  };

  const handleCloseModal = () => {
    setShowModal(null);
  };

  const handleAddCondition = () => {
    setConditions(prev => [...prev, { column_id: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConditionChange = (index: number, key: string, val: string) => {
    setConditions(prev => prev.map((cond, idx) => idx === index ? { ...cond, [key]: val } : cond));
  };

  const handleAddPermissionRow = () => {
    setSchemePermissions(prev => [...prev, { role_id: '', group_id: '', permissions: ['receive', 'read'] }]);
  };

  const handleRemovePermissionRow = (index: number) => {
    setSchemePermissions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePermissionChange = (index: number, key: 'role_id' | 'group_id', val: string) => {
    setSchemePermissions(prev => prev.map((perm, idx) => {
      if (idx !== index) return perm;
      if (key === 'role_id') {
        return { ...perm, role_id: val, group_id: '' };
      } else {
        return { ...perm, group_id: val, role_id: '' };
      }
    }));
  };

  const handleToggleCheckbox = (index: number, permType: string) => {
    setSchemePermissions(prev => prev.map((perm, idx) => {
      if (idx !== index) return perm;
      const current = perm.permissions;
      const next = current.includes(permType) 
        ? current.filter((p: string) => p !== permType)
        : [...current, permType];
      return { ...perm, permissions: next };
    }));
  };

  // Get dynamic column list based on trigger and target selection
  const getAvailableFields = () => {
    if (triggerType.startsWith('database_entry')) {
      const selectedDb = databases.find(db => String(db.id) === targetId);
      return selectedDb ? selectedDb.database_structure || [] : [];
    } else if (triggerType.startsWith('roster_row')) {
      const selectedRoster = rosters.find(r => String(r.id) === targetId);
      return selectedRoster ? selectedRoster.columns || [] : [];
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Scheme name is required');
      return;
    }

    const payload = {
      name,
      trigger_type: triggerType,
      target_id: targetId ? parseInt(targetId) : null,
      conditions: conditions.filter(c => c.column_id),
      read_type: readType,
      text_template: textTemplate || null,
      permissions: schemePermissions.map(p => ({
        role_id: p.role_id ? parseInt(p.role_id) : null,
        group_id: p.group_id ? parseInt(p.group_id) : null,
        permissions: p.permissions
      }))
    };

    try {
      if (showModal === 'create') {
        await api.post(`/factions/${shortname}/notification-schemes`, payload);
        toast.success('Notification scheme created!');
      } else {
        await api.put(`/notification-schemes/${showModal.id}`, payload);
        toast.success('Notification scheme updated!');
      }
      handleCloseModal();
      fetchSchemes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save scheme.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this notification scheme?')) return;
    try {
      await api.delete(`/notification-schemes/${id}`);
      toast.success('Notification scheme deleted!');
      fetchSchemes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete scheme.');
    }
  };

  const getTriggerLabel = (type: string) => {
    const map: Record<string, string> = {
      database_entry_created: 'Database Entry Created',
      database_entry_updated: 'Database Entry Updated',
      roster_row_created: 'Roster Row Created',
      roster_row_updated: 'Roster Row Updated',
      faction_updated: 'Faction Settings Updated'
    };
    return map[type] || type;
  };

  const getTargetName = (type: string, tid: number | null) => {
    if (!tid) return 'All / None';
    if (type.startsWith('database_entry')) {
      return databases.find(db => db.id === tid)?.name || `Database #${tid}`;
    } else if (type.startsWith('roster_row')) {
      return rosters.find(r => r.id === tid)?.name || `Roster #${tid}`;
    }
    return 'All / None';
  };

  if (loading) return <Loading message="Loading Notifications Configuration..." />;

  const allowBranding = factionData?.allow_branding;
  const availableFields = getAvailableFields();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Faction Notifications</h2>
          <p className="text-muted font-bold uppercase tracking-widest text-[10px] mt-1">
            Setup notification schemes to keep your members updated about roster changes or database entries
          </p>
        </div>
        {canConfigure && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3.5 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-all shadow-lg shadow-accent/20"
          >
            <Plus size={14} />
            Create Notification Scheme
          </button>
        )}
      </div>

      {schemes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Bell size={48} className="mx-auto text-muted/30 mb-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-text">No schemes configured</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Automated notifications aren't setup yet. Click the button above to build your first notification rule.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schemes.map(scheme => {
            const hasManagePerm = canConfigure || (scheme.permissions || []).some(
              (p: any) => p.permissions?.includes('manage') && (
                (p.role_id && user?.roles?.some((r: any) => r.id === p.role_id)) ||
                (p.group_id && user?.groups?.some((g: any) => g.id === p.group_id))
              )
            );

            return (
              <div key={scheme.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-colors flex flex-col justify-between group relative overflow-hidden">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-text truncate max-w-[180px]">{scheme.name}</span>
                    <span className="text-[8px] font-black uppercase bg-border px-2 py-0.5 rounded text-muted">
                      {scheme.read_type === 'global' ? 'Global Read' : 'User Read'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div>
                      <span className="text-[8px] font-black uppercase text-muted tracking-widest block">Trigger Type</span>
                      <span className="text-[10px] font-bold text-text/80">{getTriggerLabel(scheme.trigger_type)}</span>
                    </div>

                    {scheme.target_id && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-muted tracking-widest block">Target</span>
                        <span className="text-[10px] font-bold text-text/80">{getTargetName(scheme.trigger_type, scheme.target_id)}</span>
                      </div>
                    )}

                    {scheme.conditions && scheme.conditions.length > 0 && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-muted tracking-widest block">Conditions ({scheme.conditions.length})</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scheme.conditions.map((c: any, idx: number) => (
                            <span key={idx} className="text-[8px] font-bold px-1.5 py-0.5 bg-border/40 text-muted rounded">
                              {c.column_id} {c.operator} {c.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-4 mt-6">
                  {hasManagePerm && (
                    <>
                      <button
                        onClick={() => handleOpenModal(scheme)}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-accent hover:border-accent/20 transition-all"
                        title="Edit Scheme"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(scheme.id)}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-red-500 hover:border-red-500/20 transition-all"
                        title="Delete Scheme"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 border-b border-border bg-surface/30 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Bell size={16} className="text-accent" />
                {showModal === 'create' ? 'Create Notification Scheme' : `Edit Notification Scheme: ${showModal.name}`}
              </h3>
              <button onClick={handleCloseModal} className="text-muted hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted block">Scheme Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. New Database Entries"
                    className="w-full bg-border/20 border border-border/80 focus:border-accent rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                    required
                  />
                </div>

                {/* Read Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted block font-bold">Read Behavior</label>
                  <select
                    value={readType}
                    onChange={e => setReadType(e.target.value)}
                    className="w-full bg-border/20 border border-border/80 focus:border-accent rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                  >
                    <option value="user_bound">User-bound (Individual read statuses)</option>
                    <option value="global">Global (Once marked read, it is read for all)</option>
                  </select>
                </div>

                {/* Trigger Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted block">Trigger Event</label>
                  <select
                    value={triggerType}
                    onChange={e => {
                      setTriggerType(e.target.value);
                      setTargetId('');
                      setConditions([]);
                    }}
                    className="w-full bg-border/20 border border-border/80 focus:border-accent rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                  >
                    <option value="database_entry_created">Database Entry Created</option>
                    <option value="database_entry_updated">Database Entry Updated</option>
                    <option value="roster_row_created">Roster Row Created</option>
                    <option value="roster_row_updated">Roster Row Updated</option>
                    <option value="faction_updated">Faction Settings Updated</option>
                  </select>
                </div>

                {/* Target Source */}
                {triggerType !== 'faction_updated' && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block">
                      {triggerType.startsWith('database_entry') ? 'Target Database' : 'Target Roster'}
                    </label>
                    <select
                      value={targetId}
                      onChange={e => {
                        setTargetId(e.target.value);
                        setConditions([]);
                      }}
                      className="w-full bg-border/20 border border-border/80 focus:border-accent rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                      required
                    >
                      <option value="">Select target...</option>
                      {triggerType.startsWith('database_entry') 
                        ? databases.map(db => <option key={db.id} value={db.id}>{db.name}</option>)
                        : rosters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                      }
                    </select>
                  </div>
                )}
              </div>

              {/* Conditions Builder */}
              {targetId && (
                <div className="space-y-3 border-t border-border/50 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted block">Trigger Conditions</label>
                      <span className="text-[8px] text-muted font-bold block mt-0.5">Filter when notifications fire (optional)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCondition}
                      className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-1 bg-border hover:bg-border/80 rounded transition-colors"
                    >
                      <PlusCircle size={10} /> Add Condition
                    </button>
                  </div>

                  {conditions.length === 0 ? (
                    <div className="text-[10px] text-muted italic font-bold p-3 border border-dashed border-border rounded-lg text-center">
                      No filters applied. Fires on every entry/row event.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conditions.map((cond, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-surface/30 p-2 rounded-lg border border-border/60">
                          {/* Column Select */}
                          <select
                            value={cond.column_id}
                            onChange={e => handleConditionChange(idx, 'column_id', e.target.value)}
                            className="flex-1 bg-border/20 border border-border/80 focus:border-accent rounded px-2 py-1 text-[10px] font-bold"
                            required
                          >
                            <option value="">Select Field...</option>
                            {availableFields.map((f: any) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>

                          {/* Operator */}
                          <select
                            value={cond.operator}
                            onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                            className="w-28 bg-border/20 border border-border/80 focus:border-accent rounded px-2 py-1 text-[10px] font-bold"
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Does Not Equal</option>
                            <option value="contains">Contains</option>
                          </select>

                          {/* Value */}
                          <input
                            type="text"
                            value={cond.value}
                            onChange={e => handleConditionChange(idx, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-border/20 border border-border/80 focus:border-accent rounded px-2 py-1 text-[10px] font-bold"
                            required
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(idx)}
                            className="p-1 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text Template */}
              <div className="space-y-2 border-t border-border/50 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block flex items-center gap-1.5">
                      Notification Text Template
                      {!allowBranding && <Lock size={10} className="text-muted" />}
                    </label>
                    <span className="text-[8px] text-muted font-bold block mt-0.5">Customize the generated text for premium custom-branded factions</span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={textTemplate}
                    onChange={e => setTextTemplate(e.target.value)}
                    disabled={!allowBranding}
                    rows={3}
                    placeholder={
                      !allowBranding 
                        ? 'Custom templates are locked. Reverting to default notification content.'
                        : 'e.g. A new database entry has been made: {entry.name}'
                    }
                    className="w-full bg-border/20 border border-border/80 focus:border-accent rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  />
                  {!allowBranding && (
                    <div className="absolute inset-0 bg-surface/10 backdrop-blur-[0.5px] rounded-lg flex items-center justify-center p-4">
                      <div className="bg-card border border-border rounded-lg p-2 flex items-center gap-2 max-w-xs shadow-lg text-[9px] font-black uppercase text-muted tracking-wide text-center">
                        <Lock size={12} className="text-accent shrink-0" />
                        Premium Custom Branding Required
                      </div>
                    </div>
                  )}
                </div>

                {allowBranding && (
                  <div className="bg-surface/40 p-2.5 rounded-lg border border-border text-[9px] font-bold text-muted space-y-1">
                    <span className="block font-black text-[8px] uppercase tracking-wider text-text">Available Dynamic Placeholders:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-1.5 py-0.5 bg-border rounded cursor-pointer select-none hover:text-text" onClick={() => setTextTemplate(prev => prev + '{faction.name}')}>{`{faction.name}`}</span>
                      {triggerType.startsWith('database_entry') && (
                        <>
                          <span className="px-1.5 py-0.5 bg-border rounded cursor-pointer select-none hover:text-text" onClick={() => setTextTemplate(prev => prev + '{database.name}')}>{`{database.name}`}</span>
                          <span className="px-1.5 py-0.5 bg-border rounded cursor-pointer select-none hover:text-text" onClick={() => setTextTemplate(prev => prev + '{entry.FIELD_ID}')}>{`{entry.FIELD_ID}`}</span>
                        </>
                      )}
                      {triggerType.startsWith('roster_row') && (
                        <>
                          <span className="px-1.5 py-0.5 bg-border rounded cursor-pointer select-none hover:text-text" onClick={() => setTextTemplate(prev => prev + '{roster.name}')}>{`{roster.name}`}</span>
                          <span className="px-1.5 py-0.5 bg-border rounded cursor-pointer select-none hover:text-text" onClick={() => setTextTemplate(prev => prev + '{roster.FIELD_ID}')}>{`{roster.FIELD_ID}`}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Configuration */}
              <div className="space-y-3 border-t border-border/50 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block">Scheme Permissions</label>
                    <span className="text-[8px] text-muted font-bold block mt-0.5">Control which groups and ranks can receive, read, or manage this scheme</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPermissionRow}
                    className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-1 bg-border hover:bg-border/80 rounded transition-colors"
                  >
                    <PlusCircle size={10} /> Add Access Row
                  </button>
                </div>

                <div className="space-y-2">
                  {schemePermissions.map((perm, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-4 items-center bg-surface/30 p-3 rounded-lg border border-border/60">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Selector (Role/Group) */}
                        <div className="flex gap-2">
                          <select
                            value={perm.role_id ? 'role' : perm.group_id ? 'group' : 'public'}
                            onChange={e => {
                              const type = e.target.value;
                              if (type === 'role') {
                                handlePermissionChange(idx, 'role_id', roles[0]?.id ? String(roles[0].id) : '');
                              } else if (type === 'group') {
                                handlePermissionChange(idx, 'group_id', groups[0]?.id ? String(groups[0].id) : '');
                              } else {
                                setSchemePermissions(prev => prev.map((p, i) => i === idx ? { role_id: '', group_id: '', permissions: p.permissions } : p));
                              }
                            }}
                            className="bg-border/20 border border-border/80 rounded px-2 py-1 text-[10px] font-bold"
                          >
                            <option value="public">Public / Guest</option>
                            <option value="role">Rank / Role</option>
                            <option value="group">Group</option>
                          </select>

                          {perm.role_id !== undefined && perm.role_id !== '' && (
                            <select
                              value={perm.role_id}
                              onChange={e => handlePermissionChange(idx, 'role_id', e.target.value)}
                              className="flex-1 bg-border/20 border border-border/80 rounded px-2 py-1 text-[10px] font-bold"
                            >
                              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          )}

                          {perm.group_id !== undefined && perm.group_id !== '' && (
                            <select
                              value={perm.group_id}
                              onChange={e => handlePermissionChange(idx, 'group_id', e.target.value)}
                              className="flex-1 bg-border/20 border border-border/80 rounded px-2 py-1 text-[10px] font-bold"
                            >
                              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          )}
                        </div>

                        {/* Checkboxes */}
                        <div className="flex gap-4 items-center justify-start sm:justify-end">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold uppercase tracking-wider text-muted hover:text-text transition-colors">
                            <input
                              type="checkbox"
                              checked={perm.permissions.includes('receive')}
                              onChange={() => handleToggleCheckbox(idx, 'receive')}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            Receive
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold uppercase tracking-wider text-muted hover:text-text transition-colors">
                            <input
                              type="checkbox"
                              checked={perm.permissions.includes('read')}
                              onChange={() => handleToggleCheckbox(idx, 'read')}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            Read
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold uppercase tracking-wider text-muted hover:text-text transition-colors">
                            <input
                              type="checkbox"
                              checked={perm.permissions.includes('manage')}
                              onChange={() => handleToggleCheckbox(idx, 'manage')}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            Manage
                          </label>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePermissionRow(idx)}
                        className="p-1.5 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-5 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-border hover:bg-border/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-accent/20"
                >
                  {showModal === 'create' ? 'Create Scheme' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactionNotifications;
