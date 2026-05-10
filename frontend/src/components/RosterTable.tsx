import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RosterContent } from '../types';
import { Plus, Trash2, Check, X, Pencil, Tag, ExternalLink } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { hexToRgb } from '../utils';

export interface RosterColumn {
  id: string;
  name: string;
  type: string;
  options?: any[];
  checkboxes?: any[];
  tags?: any[];
  flags?: number[];
  dataset_id?: number | null;
  source_column_id?: string | null;
  linked_database_id?: number | null;
  data_field_id?: string | null;
  database_field_id?: string | null;
}

interface RosterTableProps {
  contents: RosterContent[];
  allContents?: RosterContent[];
  user?: any;
  columns?: RosterColumn[];
  datasets?: any[];
  recordData?: any[];
  isLeadership?: boolean;
  accentColor?: string;
  editMode?: boolean;
  canModerate?: boolean;
  permissions?: any;
  flags?: any[];
  onUpdateRow?: (id: number, data: any, force?: boolean, lastUpdatedAt?: string | null) => void;
  onDeleteRow?: (id: number) => void;
  onBulkDeleteRow?: (ids: number[]) => void;
  onAddRow?: () => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({ 
  contents, 
  allContents,
  user,
  columns, 
  datasets = [],
  recordData = [],
  isLeadership, 
  accentColor, 
  editMode,
  canModerate,
  permissions,
  flags = [],
  onUpdateRow,
  onDeleteRow,
  onBulkDeleteRow,
  onAddRow
}) => {  const { shortname } = useParams();
  const canEditDefined = canModerate || permissions?.edit_defined_fields;
  const canEditPredefined = canModerate || permissions?.edit_predefined;
  const canEditAny = canEditDefined || canEditPredefined;

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [savingRows, setSavingRows] = useState<Map<number, string>>(new Map());
  const [editData, setEditData] = useState<any>({});
  const [rowColor, setRowColor] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [rowCountToAdd, setRowCountToAdd] = useState(1);
  const [activeTagMenu, setActiveTagMenu] = useState<{ rowId: number, colId: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultRowColors = [
    { name: 'None', value: null },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#10b981' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Teal', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
  ];

  const evaluateFlag = React.useCallback((row: RosterContent, col: RosterColumn, flag: any) => {
    if (!flag.rules || flag.rules.length === 0) return false;

    // Determine current value, accounting for unsaved edits
    const isThisRowEditing = editingRowId === row.id;
    const currentRowContent = isThisRowEditing ? { ...(row.content || {}), ...editData } : (row.content || {});
    const rawValue = currentRowContent[col.id];
    
    // If value is null or undefined, don't flag (except for specific rules if needed)
    if (rawValue === null || rawValue === undefined || rawValue === '') return false;
    
    const value = rawValue.toString().toLowerCase().trim();

    return flag.rules.some((rule: any) => {
        switch (rule.type) {
            case 'equals':
                return value === (rule.value || '').toLowerCase().trim();
            case 'not_equals':
                return value !== (rule.value || '').toLowerCase().trim();
            case 'contains':
                return value.includes((rule.value || '').toLowerCase().trim());
            case 'in_dataset':
                const dataset = datasets.find(d => Number(d.id) === Number(rule.dataset_id));
                return dataset?.options?.some((opt: any) => opt.value.toLowerCase().trim() === value);
            case 'not_in_dataset':
                const datasetNot = datasets.find(d => Number(d.id) === Number(rule.dataset_id));
                return !datasetNot?.options?.some((opt: any) => opt.value.toLowerCase().trim() === value);
            case 'exists_elsewhere':
                let pool: any[] = [];
                const safeAllContents = allContents || [];
                
                if (rule.scope === 'global') {
                    pool = safeAllContents;
                } else if (rule.scope === 'roster') {
                    // Try to find the roster ID for the current row
                    const currentRosterId = row.roster_id || safeAllContents.find(c => Number(c.id) === Number(row.id))?.roster_id;
                    if (!currentRosterId) return false;
                    pool = safeAllContents.filter(c => Number(c.roster_id) === Number(currentRosterId));
                } else {
                    pool = contents;
                }

                const excludedIds = (flag.excluded_roster_ids || []).map((id: any) => Number(id));

                return pool.some(c => {
                    // Use loose equality for IDs to avoid flagging yourself
                    if (Number(c.id) === Number(row.id)) return false;
                    
                    // Skip if from an excluded roster
                    if (c.roster_id && excludedIds.includes(Number(c.roster_id))) return false;

                    const targetContent = c.content || {};

                    if (rule.target_col) {
                        return (targetContent[rule.target_col] || '').toString().toLowerCase().trim() === value;
                    }
                    
                    // If no target col, check all column values for a match
                    return Object.values(targetContent).some(v => {
                        if (v === null || v === undefined) return false;
                        const vStr = v.toString().toLowerCase().trim();
                        return vStr === value && vStr !== '';
                    });
                });
            default:
                return false;
        }
    });
  }, [datasets, contents, allContents, editingRowId, editData]);
  const activeCols = columns && columns.length > 0 ? columns : [
    { id: 'rank', name: 'Rank', type: 'dropdown', checkboxes: ['Acting'] },
    { id: 'name', name: 'Name', type: 'text', checkboxes: ['LOA'] },
    { id: 'position', name: 'Position', type: 'text', checkboxes: [] },
    { id: 'callsign', name: 'Callsign', type: 'text', checkboxes: [] }
  ];

  const handleBulkAdd = () => {
    const count = Math.min(Math.max(1, rowCountToAdd), 20);
    for(let i = 0; i < count; i++) {
        onAddRow?.();
    }
    setRowCountToAdd(1);
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    
    if (onBulkDeleteRow) {
        toast((t) => (
            <div className="flex flex-col gap-1 text-left">
                <p className="font-bold text-xs uppercase">Delete {selectedRowIds.length} rows?</p>
                <p className="text-[9px] opacity-80 uppercase tracking-tighter">This action cannot be undone.</p>
                <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id);
                            await onBulkDeleteRow(selectedRowIds);
                            setSelectedRowIds([]);
                        }}
                        className="px-2 py-1 bg-danger text-white hover:bg-danger/90 rounded text-[9px] font-bold uppercase transition shadow-lg shadow-danger/20"
                    >
                        Delete All
                    </button>
                </div>
            </div>
        ), { duration: 6000, position: 'top-center' });
        return;
    }

    toast((t) => (
        <div className="flex flex-col gap-1 text-left">
            <p className="font-bold text-xs uppercase">Delete {selectedRowIds.length} rows?</p>
            <p className="text-[9px] opacity-80 uppercase tracking-tighter">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => toast.dismiss(t.id)} className="px-2 py-1 bg-surface hover:bg-bg border border-border rounded text-[9px] font-bold uppercase transition">Cancel</button>
                <button 
                    onClick={async () => {
                        toast.dismiss(t.id);
                        const loadToast = toast.loading(`Deleting ${selectedRowIds.length} rows...`);
                        try {
                            for (const id of selectedRowIds) {
                                await onDeleteRow?.(id);
                            }
                            setSelectedRowIds([]);
                            toast.success('Bulk deletion complete', { id: loadToast });
                        } catch (err) {
                            toast.error('Partial failure during bulk delete', { id: loadToast });
                        }
                    }}
                    className="px-2 py-1 bg-danger text-white hover:bg-danger/90 rounded text-[9px] font-bold uppercase transition shadow-lg shadow-danger/20"
                >
                    Delete All
                </button>
            </div>
        </div>
    ), { duration: 6000, position: 'top-center' });
  };

  const toggleSelectRow = (id: number) => {
    setSelectedRowIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === contents.length) {
        setSelectedRowIds([]);
    } else {
        setSelectedRowIds(contents.map(c => c.id));
    }
  };

  useEffect(() => {
    if (editingRowId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingRowId]);

  const handleStartEdit = (row: RosterContent, colId: string) => {
    if (!canEditAny) return;

    // Passive locking
    api.post(`/contents/${row.id}/lock`, { col_id: colId }).catch(() => {});
    
    setEditingRowId(row.id);
    setEditingColId(colId);
    setEditData(row.content || {});
    setRowColor(row.color || null);
    setLastUpdatedAt(row.updated_at || null);
  };

  const handleSaveEdit = async (rowId: number) => {
    if (editingRowId !== rowId) return;
    
    const dataToSave = { content: { ...editData }, color: rowColor };
    const colId = editingColId;
    const updatedAt = lastUpdatedAt;

    setEditingRowId(null);
    setEditingColId(null);
    setRowColor(null);
    setLastUpdatedAt(null);
    setActiveTagMenu(null);
    setShowColorPicker(null);
    
    if (colId) {
        setSavingRows(prev => new Map(prev).set(rowId, colId));
    }

    try {
        await onUpdateRow?.(rowId, dataToSave, false, updatedAt);
    } catch (err: any) {
        console.error('Failed to save row', err);
    } finally {
        setSavingRows(prev => {
            const next = new Map(prev);
            next.delete(rowId);
            return next;
        });
    }
  };

  const handleCancelEdit = async () => {
    const id = editingRowId;
    setEditingRowId(null);
    setEditingColId(null);
    setRowColor(null);
    setLastUpdatedAt(null);
    setEditData({});
    setActiveTagMenu(null);
    setShowColorPicker(null);
    
    if (id) {
        api.post(`/contents/${id}/unlock`).catch(() => {});
    }
  };

  const handleRowBlur = (e: React.FocusEvent, rowId: number) => {
    const nextFocus = e.relatedTarget as Node;
    if (!e.currentTarget.contains(nextFocus)) {
      handleSaveEdit(rowId);
    }
  };

  const updateField = (colId: string, value: any) => {
    let newData = { ...editData, [colId]: value };

    // Auto-apply checkboxes/tags if this column is linked to a database
    const col = activeCols.find(c => c.id === colId);
    if (col && col.dataset_id) {
        const dataset = datasets.find(d => d.id === col.dataset_id);
        if (dataset && dataset.record_database_id) {
            const db = recordData.find(d => d.id === dataset.record_database_id);
            if (db && db.entries) {
                // Find matching entry
                const fieldId = col.database_field_id || db.database_structure?.[0]?.id;
                const entry = db.entries.find((e: any) => {
                    const entryValue = (fieldId === 'id') ? String(e.entry_id) : e.data?.[fieldId];
                    return entryValue === value;
                });

                if (entry) {
                    // Re-evaluate checkboxes
                    if (col.checkboxes && col.checkboxes.length > 0) {
                        const cbKey = `${col.id}_cb`;
                        const currentCbs = [...(newData[cbKey] || [])];
                        let changed = false;

                        col.checkboxes.forEach((cb: any) => {
                            if (typeof cb === 'object' && (cb.auto_apply || cb.auto_apply_field)) {
                                const db_column = cb.auto_apply_field || cb.auto_apply?.db_column;
                                const match_value = cb.auto_apply_value !== undefined ? cb.auto_apply_value : cb.auto_apply?.match_value;
                                
                                const dbVal = (db_column === 'id') ? String(entry.entry_id) : entry.data?.[db_column];
                                
                                let isMatch = false;
                                if (match_value) {
                                    isMatch = dbVal && dbVal.toString().toLowerCase().includes(match_value.toLowerCase());
                                } else {
                                    isMatch = !!dbVal;
                                }
                                
                                if (isMatch && !currentCbs.includes(cb.label)) {
                                    currentCbs.push(cb.label);
                                    changed = true;
                                } else if (!isMatch && currentCbs.includes(cb.label)) {
                                    const idx = currentCbs.indexOf(cb.label);
                                    currentCbs.splice(idx, 1);
                                    changed = true;
                                }
                            }
                        });

                        if (changed) newData[cbKey] = currentCbs;
                    }

                    // Re-evaluate tags
                    if (col.tags && col.tags.length > 0) {
                        const tagKey = `${col.id}_tags`;
                        const currentTags = [...(newData[tagKey] || [])];
                        let changed = false;

                        col.tags.forEach((tag: any) => {
                            if (typeof tag === 'object' && (tag.auto_apply || tag.auto_apply_field)) {
                                const db_column = tag.auto_apply_field || tag.auto_apply?.db_column;
                                const match_value = tag.auto_apply_value !== undefined ? tag.auto_apply_value : tag.auto_apply?.match_value;
                                
                                const dbVal = (db_column === 'id') ? String(entry.entry_id) : entry.data?.[db_column];
                                
                                let isMatch = false;
                                if (match_value) {
                                    isMatch = dbVal && dbVal.toString().toLowerCase().includes(match_value.toLowerCase());
                                } else {
                                    isMatch = !!dbVal;
                                }
                                
                                if (isMatch && !currentTags.includes(tag.label)) {
                                    currentTags.push(tag.label);
                                    changed = true;
                                } else if (!isMatch && currentTags.includes(tag.label)) {
                                    const idx = currentTags.indexOf(tag.label);
                                    currentTags.splice(idx, 1);
                                    changed = true;
                                }
                            }
                        });

                        if (changed) newData[tagKey] = currentTags;
                    }
                }
            }
        }
    }

    setEditData(newData);
  };

  const toggleCheckbox = (colId: string, cb: string) => {
    const key = `${colId}_cb`;
    const current = editData[key] || [];
    const next = current.includes(cb) ? current.filter((c: string) => c !== cb) : [...current, cb];
    setEditData({ ...editData, [key]: next });
  };

  const toggleTag = (colId: string, tag: string) => {
    const key = `${colId}_tags`;
    const current = editData[key] || [];
    const next = current.includes(tag) ? current.filter((t: string) => t !== tag) : [...current, tag];
    setEditData({ ...editData, [key]: next });
  };

  const isColEditable = (col: RosterColumn) => {
    const isHidden = col.type.includes('hidden');
    const canViewHidden = canModerate || permissions?.view_hidden_data;
    
    if (isHidden && !canViewHidden) return false;

    if (editMode && canEditPredefined) return true;
    if (col.type.startsWith('predefined_') || col.type.includes('predefined')) {
        return canEditPredefined;
    }
    return canEditDefined;
  };

  const [focusedColId, setFocusedColId] = useState<string | null>(null);

  const renderCell = (row: RosterContent, col: RosterColumn) => {
    const isEditing = editingRowId === row.id;
    const isSaving = savingRows.has(row.id);
    const value = isEditing ? editData[col.id] : (row.content?.[col.id] || '');
    const checked = isEditing ? (editData[`${col.id}_cb`] || []) : (row.content?.[`${col.id}_cb`] || []);
    const appliedTags = isEditing ? (editData[`${col.id}_tags`] || []) : (row.content?.[`${col.id}_tags`] || []);

    const isLocked = !isEditing && row.editing_by && row.editing_by !== user?.id && row.editing_at && (new Date().getTime() - new Date(row.editing_at).getTime() < 60000);

    const isHiddenType = col.type.includes('hidden');
    const canViewHidden = canModerate || permissions?.view_hidden_data;
    
    const showValue = !isHiddenType || canViewHidden;

    const boundDataset = col.dataset_id ? datasets.find(d => d.id === col.dataset_id) : null;
    const datasetOptions = boundDataset?.options || [];
    
    let effectiveOptions = boundDataset 
      ? datasetOptions.map((o: any) => ({ label: o.value, color: o.color, bold: o.is_bold })) 
      : (col.options || []);

    // ... (rest of dynamic dataset logic)
    
    if (isSaving && col.id === savingRows.get(row.id)) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded animate-pulse flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-accent animate-bounce" />
                    <span className="text-[7px] font-black text-accent uppercase tracking-widest">Saving</span>
                </div>
            </div>
        );
    }

    if (isLocked && col.id === (row.editing_col || activeCols[0].id)) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="px-2 py-0.5 bg-danger/10 border border-danger/20 rounded flex items-center gap-1.5 group/lock relative">
                    <div className="w-1 h-1 rounded-full bg-danger" />
                    <span className="text-[7px] font-black text-danger uppercase tracking-widest">Editing</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-white text-[7px] font-bold uppercase rounded opacity-0 group-hover/lock:opacity-100 transition-opacity whitespace-nowrap z-[100]">
                        {row.editor?.username || 'Another user'} is editing
                    </div>
                </div>
            </div>
        );
    }

    // If dynamic dataset, pull from recordData
    if (boundDataset?.record_database_id) {
        const db = recordData.find(d => d.id === boundDataset.record_database_id);
        if (db && db.entries) {
            effectiveOptions = db.entries.map((entry: any) => {
                let fieldId = col.database_field_id;
                // Fallback to first field if no specific field is set or if it's pointing to a template name
                if (!fieldId || ['table', 'compact', 'cards', 'detailed', 'rows'].includes(fieldId)) {
                    fieldId = db.database_structure?.[0]?.id;
                }

                const field = db.database_structure?.find((f: any) => f.id === fieldId);
                
                let label = '';
                if (fieldId === 'id') label = String(entry.entry_id);
                else if (fieldId === 'created_at') label = new Date(entry.created_at).toLocaleDateString();
                else {
                    // Try ID first, then fallback to Name (for legacy data)
                    label = entry.data?.[fieldId || ''] || entry.data?.[field?.name || ''] || `Entry #${entry.entry_id}`;
                }
                
                return { label, color: null, bold: false, entryId: entry.entry_id, dbShortcode: db.record_shortcode || db.id };
            });
        }
    }

    // Handle Database Data Column Type
    if (col.type === 'database_data' && col.source_column_id) {
        const sourceCol = activeCols.find(c => c.id === col.source_column_id);
        const sourceValue = isEditing ? editData[sourceCol?.id || ''] : (row.content?.[sourceCol?.id || ''] || '');
        
        if (sourceValue) {
            // Find the database linked to the source column's dataset
            const sourceDataset = datasets.find(d => d.id === sourceCol?.dataset_id);
            const db = recordData.find(d => d.id === sourceDataset?.record_database_id);
            
            if (db && db.entries) {
                // Find entry that matches sourceValue (by the source column's referenced field)
                const entry = db.entries.find((e: any) => {
                    let fieldId = sourceCol?.database_field_id;
                    if (!fieldId || ['table', 'compact', 'cards', 'detailed', 'rows'].includes(fieldId)) {
                        fieldId = db.database_structure?.[0]?.id;
                    }

                    const label = (fieldId === 'id') ? String(e.entry_id) : 
                                 (fieldId === 'created_at') ? new Date(e.created_at).toLocaleDateString() :
                                 e.data?.[fieldId || ''];
                    
                    return label === sourceValue;
                });

                if (entry) {
                    const fieldId = col.data_field_id;
                    let displayValue = '-';
                    if (fieldId === 'id') displayValue = entry.entry_id;
                    else if (fieldId === 'created_at') displayValue = new Date(entry.created_at).toLocaleDateString();
                    else displayValue = entry.data?.[fieldId || ''] || '-';

                    return (
                        <div className="flex flex-col items-center justify-center h-full gap-0.5 py-1 transition-all whitespace-nowrap opacity-60 italic relative group/cell">
                            <span className="text-[10px] uppercase font-bold text-accent">
                                {displayValue}
                            </span>
                            <Link 
                                to={`/${shortname}/records?database=${db.record_shortcode || db.id}&record=${entry.entry_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute -top-1 -right-1 p-1 bg-card border border-border rounded text-muted hover:text-accent opacity-0 group-hover/cell:opacity-100 transition-all z-10 shadow-sm"
                            >
                                <ExternalLink size={8} />
                            </Link>
                        </div>
                    );
                }
            }
        }

        return (
            <div className="flex flex-col items-center justify-center h-full gap-0.5 py-1 transition-all whitespace-nowrap opacity-20">
                <span className="text-[10px] uppercase font-bold">-</span>
            </div>
        );
    }

    const selectedOpt = effectiveOptions.find(o => o.label === value);
    const textStyle: React.CSSProperties = {
      color: selectedOpt?.color || 'inherit',
      fontWeight: selectedOpt?.bold ? 'bold' : 'normal',
    };

    const activeFlags = flags.filter(f => (col.flags || []).some(flagId => Number(flagId) === Number(f.id)) && evaluateFlag(row, col, f));

    if (isEditing && isColEditable(col)) {
      if (col.type === 'dropdown' || col.type === 'predefined_dropdown' || col.type === 'hidden_dropdown' || col.type === 'predefined_hidden_dropdown') {
        return (
          <div className="flex flex-col items-center justify-center h-full w-full gap-0.5 relative group/cell overflow-visible">
            <select 
              value={value} 
              onChange={e => updateField(col.id, e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
              <option value="">- Select -</option>
              {effectiveOptions.map((opt: any) => (
                <option key={opt.label} value={opt.label} style={{ color: opt.color || 'inherit' }}>{opt.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 overflow-visible">
                <div className="text-[10px] uppercase font-medium transition-colors" style={textStyle}>
                {value || <span className="opacity-20 italic">Select...</span>}
                </div>
                {activeFlags.length > 0 && (
                    <div className="flex items-center gap-0.5">
                        {activeFlags.map(f => (
                            <div key={f.id} className="group/flag-icon relative flex items-center justify-center">
                                {React.createElement((LucideIcons as any)[f.icon] || LucideIcons.HelpCircle, { 
                                    size: 10, 
                                    style: { color: f.color } 
                                })}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/flag-icon:opacity-100 transition-all pointer-events-none z-[9999] shadow-2xl text-white backdrop-blur-sm">
                                    {f.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {col.tags && col.tags.length > 0 && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTagMenu(activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id ? null : { rowId: row.id, colId: col.id });
                        }}
                        className={`p-1 rounded hover:bg-accent/10 transition-colors relative z-20 ${activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id ? 'text-accent' : 'text-muted'}`}
                    >
                        <Pencil size={10} />
                    </button>
                )}
            </div>
            {col.checkboxes && col.checkboxes.length > 0 && (
              <div className="flex flex-wrap gap-1 relative z-20">
                {col.checkboxes.map(cb => {
                  const label = typeof cb === 'string' ? cb : cb.label;
                  const color = typeof cb === 'string' ? null : cb.color;
                  const isChecked = checked.includes(label);
                  
                  return (
                    <button 
                      key={label}
                      onClick={() => toggleCheckbox(col.id, label)}
                      className={`text-[6px] font-black px-1 rounded border transition-colors uppercase ${
                        isChecked ? (color ? '' : 'bg-accent border-accent text-white') : 'bg-transparent border-border text-muted hover:border-accent'
                      }`}
                      style={isChecked && color ? { backgroundColor: color, borderColor: color, color: '#fff' } : {}}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] p-2 min-w-[120px] animate-in fade-in slide-in-from-top-1">
                    <div className="text-[8px] font-black uppercase text-muted mb-2 tracking-widest border-b border-border/50 pb-1">Manage Tags</div>
                    <div className="space-y-1">
                        {col.tags?.map(tag => {
                            const label = typeof tag === 'string' ? tag : tag.label;
                            const color = typeof tag === 'string' ? null : tag.color;
                            const isTagged = appliedTags.includes(label);
                            return (
                                <button 
                                    key={label}
                                    onClick={() => toggleTag(col.id, label)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[9px] font-bold uppercase transition-colors ${isTagged ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5 text-muted'}`}
                                >
                                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: color || '#fff' }} />
                                    {label}
                                    {isTagged && <Check size={8} className="ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
        );
      }

      const sourceForSuggestions = (allContents && allContents.length > 0) ? allContents : contents;
      const existingValues = sourceForSuggestions
        .map(c => c.content?.[col.id])
        .filter(v => v && typeof v === 'string' && v.trim() !== '');
      
      const uniqueExisting = Array.from(new Set(existingValues));
      const suggestionPool = [...effectiveOptions];
      
      uniqueExisting.forEach(val => {
        if (typeof val === 'string' && !suggestionPool.some(opt => opt.label.toLowerCase() === val.toLowerCase())) {
          suggestionPool.push({ label: val, color: 'inherit', bold: false });
        }
      });

      const searchTerm = (value || '').toLowerCase();
      const filteredSuggestions = (focusedColId === col.id && searchTerm.length >= 1) 
        ? suggestionPool.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm)
          ).slice(0, 8) 
        : [];

      return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-0.5 relative overflow-visible">
          <div className="relative w-full flex flex-row items-center justify-center px-1 overflow-visible">
            <input 
              ref={col.id === activeCols[0].id ? inputRef : null}
              value={value} 
              autoComplete="off"
              onChange={e => {
                updateField(col.id, e.target.value);
              }}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(row.id)}
              onClick={() => setFocusedColId(col.id)}
              onFocus={() => setFocusedColId(col.id)}
              onBlur={() => setTimeout(() => setFocusedColId(null), 200)} 
              className="flex-1 bg-transparent border-none text-[10px] text-center uppercase font-medium outline-none focus:ring-0 p-0 text-text placeholder:opacity-10"
              style={textStyle}
              placeholder="..."
            />
            {activeFlags.length > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                    {activeFlags.map(f => (
                        <div key={f.id} className="group/flag-icon relative flex items-center justify-center">
                            {React.createElement((LucideIcons as any)[f.icon] || LucideIcons.HelpCircle, { 
                                size: 10, 
                                style: { color: f.color } 
                            })}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/flag-icon:opacity-100 transition-all pointer-events-none z-[9999] shadow-2xl text-white backdrop-blur-sm">
                                {f.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {col.tags && col.tags.length > 0 && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveTagMenu(activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id ? null : { rowId: row.id, colId: col.id });
                    }}
                    className={`shrink-0 p-1 rounded hover:bg-accent/10 transition-colors ml-1 ${activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id ? 'text-accent' : 'text-muted'}`}
                >
                    <Pencil size={10} />
                </button>
            )}
            {filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card border border-border rounded-lg shadow-[0_10px_40px_-5px_rgba(0,0,0,0.5)] z-[9999] overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="px-2 py-1 bg-surface/50 text-[7px] font-black text-muted/50 uppercase tracking-widest border-b border-border/30 mb-0.5">Suggestions</div>
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {filteredSuggestions.map((opt: any) => (
                            <button 
                                key={opt.label}
                                onMouseDown={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                    updateField(col.id, opt.label);
                                    setFocusedColId(null);
                                }}
                                className="w-full text-left px-2 py-2 hover:bg-accent/10 rounded flex items-center justify-between transition-colors group/opt"
                            >
                                <span className={`text-[9px] uppercase tracking-tight ${opt.bold ? 'font-black' : 'font-bold'}`} style={{ color: opt.color || 'inherit' }}>
                                    {opt.label}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-accent/20 group-hover/opt:bg-accent transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {activeTagMenu?.rowId === row.id && activeTagMenu?.colId === col.id && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] p-2 min-w-[120px] animate-in fade-in slide-in-from-top-1">
                    <div className="text-[8px] font-black uppercase text-muted mb-2 tracking-widest border-b border-border/50 pb-1">Manage Tags</div>
                    <div className="space-y-1">
                        {col.tags?.map(tag => {
                            const label = typeof tag === 'string' ? tag : tag.label;
                            const color = typeof tag === 'string' ? null : tag.color;
                            const isTagged = appliedTags.includes(label);
                            return (
                                <button 
                                    key={label}
                                    onClick={() => toggleTag(col.id, label)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[9px] font-bold uppercase transition-colors ${isTagged ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5 text-muted'}`}
                                >
                                    <div className="w-2 h-2 rounded-[1px]" style={{ backgroundColor: color || '#fff' }} />
                                    {label}
                                    {isTagged && <Check size={8} className="ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>
          {col.checkboxes && col.checkboxes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {col.checkboxes.map(cb => {
                const label = typeof cb === 'string' ? cb : cb.label;
                const color = typeof cb === 'string' ? null : cb.color;
                const isChecked = checked.includes(label);

                return (
                  <button 
                    key={label}
                    onClick={() => toggleCheckbox(col.id, label)}
                    className={`text-[6px] font-black px-1 rounded border transition-colors uppercase ${
                      isChecked ? (color ? '' : 'bg-accent border-accent text-white') : 'bg-transparent border-border text-muted hover:border-accent'
                    }`}
                    style={isChecked && color ? { backgroundColor: color, borderColor: color, color: '#fff' } : {}}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div 
        className={`flex flex-col items-center justify-center h-full gap-0.5 py-1 transition-all whitespace-nowrap overflow-visible relative group/cell ${canEditAny ? 'cursor-pointer hover:bg-accent/5' : ''}`}
        onClick={() => canEditAny && handleStartEdit(row)}
      >
        <div className="flex items-center gap-1.5 px-1 overflow-visible">
            <span 
                className={`text-[10px] uppercase font-medium transition-all ${!showValue ? 'blur-[3px] select-none opacity-50 font-black tracking-widest' : ''}`} 
                style={textStyle}
            >
                {showValue ? (value || '-') : '??????'}
            </span>
            {activeFlags.length > 0 && (
                <div className="flex items-center gap-0.5">
                    {activeFlags.map(f => (
                        <div key={f.id} className="group/flag-icon relative flex items-center justify-center">
                            {React.createElement((LucideIcons as any)[f.icon] || LucideIcons.HelpCircle, { 
                                size: 10, 
                                style: { color: f.color } 
                            })}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/flag-icon:opacity-100 transition-all pointer-events-none z-[9999] shadow-2xl text-white backdrop-blur-sm">
                                {f.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {appliedTags.length > 0 && (
                <div className="flex items-center gap-0.5">
                    {appliedTags.map((t: string) => {
                        const colTag = col.tags?.find(ct => (typeof ct === 'string' ? ct : ct.label) === t);
                        const color = (colTag && typeof colTag !== 'string') ? colTag.color : '#fff';
                        return (
                            <div 
                                key={t} 
                                className="group/tag-icon relative flex items-center justify-center"
                            >
                                <div className="w-1.5 h-1.5 rounded-[1px] opacity-80" style={{ backgroundColor: color }} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black/90 border border-white/10 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/tag-icon:opacity-100 transition-all pointer-events-none z-[9999] shadow-2xl text-white backdrop-blur-sm">
                                    {t}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        {checked.length > 0 && (
          <div className="flex gap-0.5">
            {checked.map((cbLabel: string) => {
              const colCb = col.checkboxes?.find(c => (typeof c === 'string' ? c : c.label) === cbLabel);
              const color = (colCb && typeof colCb !== 'string') ? colCb.color : null;
              
              return (
                <span 
                  key={cbLabel} 
                  className="text-[6px] text-accent font-black tracking-widest bg-accent/10 px-1 rounded uppercase"
                  style={color ? { color: color, backgroundColor: `${color}1A` } : {}}
                >
                  {cbLabel}
                </span>
              );
            })}
          </div>
        )}
        {selectedOpt?.entryId && (
            <Link 
                to={`/${shortname}/records?database=${selectedOpt.dbShortcode}&record=${selectedOpt.entryId}`}
                onClick={(e) => e.stopPropagation()}
                className="absolute -top-1 -right-1 p-1 bg-card border border-border rounded text-muted hover:text-accent opacity-0 group-hover/cell:opacity-100 transition-all z-10 shadow-sm"
            >
                <ExternalLink size={8} />
            </Link>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`rt-wrap ${editingRowId ? 'z-[5000]' : 'overflow-x-auto'}`}
      style={{ 
        '--accent': accentColor,
        '--accent-rgb': accentColor?.startsWith('#') ? hexToRgb(accentColor) : undefined
      } as React.CSSProperties}
    >
      <table className={`rt-table ${isLeadership ? 'bg-border/5' : ''}`}>
        <colgroup>
          <col className="w-[24px]" />
          {activeCols.map((col) => (
            <col key={col.id} style={{ width: `${100 / activeCols.length}%` }} />
          ))}
          <col className="w-[32px]" />
        </colgroup>
        <thead>
          <tr>
            <th className="rt-th" style={{ borderLeft: `3px solid ${accentColor}` }}>
                {editMode ? (
                    <div className="flex items-center justify-center">
                        <input 
                            type="checkbox" 
                            checked={selectedRowIds.length === contents.length && contents.length > 0}
                            onChange={toggleSelectAll}
                            className="w-3 h-3 rounded border-border bg-bg text-accent focus:ring-accent accent-accent cursor-pointer"
                        />
                    </div>
                ) : '#'}
            </th>
            {activeCols.map((col) => (
              <th key={col.id} className="rt-th text-center">{col.name}</th>
            ))}
            <th className="rt-th"></th>
          </tr>
        </thead>
        <tbody>
          {contents.map((row, idx) => {
            const isEditing = editingRowId === row.id;
            const effectiveRowColor = isEditing ? rowColor : row.color;
            const rowStyle: React.CSSProperties = {
                zIndex: isEditing ? 5000 : 0,
                backgroundColor: effectiveRowColor ? `${effectiveRowColor}15` : undefined
            };

            return (
              <tr 
                key={row.id} 
                className={`rt-tr group/row ${isEditing ? 'bg-accent/5 z-[5000] relative' : ''} ${selectedRowIds.includes(row.id) ? 'bg-accent/5' : ''}`}
                onBlur={(e) => handleRowBlur(e, row.id)}
                style={rowStyle}
              >
                <td 
                  className="rt-td text-muted opacity-50 relative cursor-default" 
                  style={{ borderLeft: `3px solid ${effectiveRowColor || accentColor}` }}
                  onClick={() => editMode && toggleSelectRow(row.id)}
                >
                  {editMode ? (
                      <div className="flex items-center justify-center w-full h-full">
                          <input 
                              type="checkbox" 
                              checked={selectedRowIds.includes(row.id)}
                              readOnly
                              className={`w-3 h-3 rounded border-border bg-bg text-accent focus:ring-accent accent-accent transition-opacity ${selectedRowIds.includes(row.id) ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}
                          />
                          <span className={`absolute inset-0 flex items-center justify-center transition-opacity ${selectedRowIds.includes(row.id) ? 'opacity-0' : 'group-hover/row:opacity-0 opacity-100'}`}>
                              {idx + 1}
                          </span>
                      </div>
                  ) : (
                      idx + 1
                  )}
                </td>
                {activeCols.map((col) => (
                  <td 
                      key={col.id} 
                      className={`rt-td p-0 h-[34px] relative hover:z-[100] transition-colors ${isEditing && editingColId === col.id ? 'bg-accent/5 ring-1 ring-inset ring-accent/30 z-[5001]' : 'hover:bg-surface/50'}`}
                      style={{ zIndex: isEditing && editingColId === col.id ? 5001 : 0 }}
                      onClick={() => !isEditing && isColEditable(col) && handleStartEdit(row, col.id)}
                >
                  {renderCell(row, col)}
                </td>
              ))}
              <td className="rt-td p-0">
                <div className="flex items-center justify-center gap-1">
                  {isEditing ? (
                    <div className="flex flex-col items-center gap-1 relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowColorPicker(showColorPicker === row.id ? null : row.id);
                            }}
                            className="p-1 hover:bg-surface rounded transition-colors text-muted hover:text-accent"
                            title="Row Color"
                        >
                            <div className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: rowColor || 'transparent' }} />
                        </button>
                        
                        {showColorPicker === row.id && (
                            <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-2xl p-3 z-[6000] min-w-[180px] animate-in fade-in slide-in-from-bottom-2">
                                <div className="text-[8px] font-black uppercase text-muted mb-2 tracking-widest border-b border-border/50 pb-1">Row Color</div>
                                <div className="grid grid-cols-4 gap-1.5 mb-3">
                                    {defaultRowColors.map(c => (
                                        <button 
                                            key={c.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRowColor(c.value);
                                                setShowColorPicker(null);
                                            }}
                                            className={`w-full aspect-square rounded-md border transition-all ${rowColor === c.value ? 'ring-2 ring-accent ring-offset-2 ring-offset-card' : 'border-border hover:border-accent'}`}
                                            style={{ backgroundColor: c.value || 'transparent' }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="color" 
                                        value={rowColor || '#ffffff'} 
                                        onChange={e => setRowColor(e.target.value)}
                                        className="w-8 h-8 bg-surface border border-border rounded p-1 cursor-pointer" 
                                    />
                                    <input 
                                        value={rowColor || ''} 
                                        onChange={e => setRowColor(e.target.value)}
                                        className="flex-1 bg-surface border border-border px-2 py-1 text-[10px] text-text rounded focus:border-accent outline-none font-mono uppercase" 
                                        placeholder="Hex (#...)"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-0.5">
                            <button onClick={() => handleSaveEdit(row.id)} className="p-0.5 text-green-500 hover:bg-green-500/10 rounded transition-colors" title="Save"><Check size={10} /></button>
                            <button onClick={handleCancelEdit} className="p-0.5 text-danger hover:bg-danger/10 rounded transition-colors" title="Cancel"><X size={10} /></button>
                        </div>
                    </div>
                  ) : (
                    <>
                      {editMode && (
                        <button onClick={() => onDeleteRow?.(row.id)} className="p-1 text-danger/50 hover:text-danger hover:bg-danger/10 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
          {editMode && (
            <tr>
              <td 
                colSpan={activeCols.length + 2} 
                className="rt-td p-2 h-auto"
              >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {selectedRowIds.length > 0 && (
                            <button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1 bg-danger/10 hover:bg-danger/20 text-danger text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-danger/20"
                            >
                                <Trash2 size={12} /> Delete Selected ({selectedRowIds.length})
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-bg border border-border rounded-lg overflow-hidden h-7">
                            <input 
                                type="number" 
                                min="1" 
                                max="20"
                                value={rowCountToAdd}
                                onChange={e => setRowCountToAdd(parseInt(e.target.value) || 1)}
                                className="w-10 bg-transparent text-center text-[10px] font-bold outline-none border-r border-border"
                            />
                            <button 
                                onClick={handleBulkAdd}
                                className="px-3 py-1 text-accent hover:bg-accent/10 text-[9px] font-black uppercase tracking-widest transition-all h-full"
                            >
                                Add Rows
                            </button>
                        </div>
                        <button 
                            onClick={() => onAddRow?.()}
                            className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-accent/20"
                        >
                            <Plus size={12} /> Add One
                        </button>
                    </div>
                </div>
              </td>
            </tr>
          )}
          {contents.length === 0 && !editMode && (
             <tr>
                <td colSpan={activeCols.length + 2} className="rt-td text-muted italic opacity-40 text-center py-4 uppercase text-[9px] tracking-widest">
                    No data available in this section
                </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
