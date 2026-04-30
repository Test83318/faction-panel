import React, { useState, useRef, useEffect } from 'react';
import { RosterContent } from '../types';
import { Plus, Trash2, Check, X } from 'lucide-react';

export interface RosterColumn {
  id: string;
  name: string;
  type: string;
  options?: any[];
  checkboxes?: string[];
}

interface RosterTableProps {
  contents: RosterContent[];
  columns?: RosterColumn[];
  isLeadership?: boolean;
  accentColor?: string;
  editMode?: boolean;
  canModerate?: boolean;
  permissions?: any;
  onUpdateRow?: (id: number, data: any) => void;
  onDeleteRow?: (id: number) => void;
  onAddRow?: () => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({ 
  contents, 
  columns, 
  isLeadership, 
  accentColor, 
  editMode, 
  canModerate,
  permissions,
  onUpdateRow,
  onDeleteRow,
  onAddRow
}) => {
  const canEditDefined = canModerate || permissions?.edit_defined_fields;
  const canEditPredefined = canModerate || permissions?.edit_predefined;
  const canEditAny = canEditDefined || canEditPredefined;

  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCols = columns && columns.length > 0 ? columns : [
    { id: 'rank', name: 'Rank', type: 'dropdown', checkboxes: ['Acting'] },
    { id: 'name', name: 'Name', type: 'text', checkboxes: ['LOA'] },
    { id: 'position', name: 'Position', type: 'text', checkboxes: [] },
    { id: 'callsign', name: 'Callsign', type: 'text', checkboxes: [] }
  ];

  useEffect(() => {
    if (editingRowId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingRowId]);

  const handleStartEdit = (row: RosterContent) => {
    if (!canEditAny) return;
    setEditingRowId(row.id);
    setEditData(row.content || {});
  };

  const handleSaveEdit = (rowId: number) => {
    if (editingRowId !== rowId) return;
    onUpdateRow?.(rowId, editData);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditData({});
  };

  const handleRowBlur = (e: React.FocusEvent, rowId: number) => {
    const nextFocus = e.relatedTarget as Node;
    if (!e.currentTarget.contains(nextFocus)) {
      handleSaveEdit(rowId);
    }
  };

  const updateField = (colId: string, value: any) => {
    setEditData({ ...editData, [colId]: value });
  };

  const toggleCheckbox = (colId: string, cb: string) => {
    const key = `${colId}_cb`;
    const current = editData[key] || [];
    const next = current.includes(cb) ? current.filter((c: string) => c !== cb) : [...current, cb];
    setEditData({ ...editData, [key]: next });
  };

  const isColEditable = (col: RosterColumn) => {
    if (editMode && canEditPredefined) return true;
    if (col.type.startsWith('predefined_') || col.type.includes('predefined')) {
        return canEditPredefined;
    }
    return canEditDefined;
  };

  const renderCell = (row: RosterContent, col: RosterColumn) => {
    const isEditing = editingRowId === row.id;
    const value = isEditing ? editData[col.id] : (row.content?.[col.id] || '');
    const checked = isEditing ? (editData[`${col.id}_cb`] || []) : (row.content?.[`${col.id}_cb`] || []);

    const selectedOpt = col.options?.find(o => o.label === value);
    const textStyle: React.CSSProperties = {
      color: selectedOpt?.color || 'inherit',
      fontWeight: selectedOpt?.bold ? 'bold' : 'normal',
    };

    if (isEditing && isColEditable(col)) {
      if (col.type === 'dropdown' || col.type === 'predefined_dropdown') {
        return (
          <div className="flex flex-col items-center justify-center h-full w-full gap-0.5 relative group/cell">
            <select 
              value={value} 
              onChange={e => updateField(col.id, e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
              <option value="">- Select -</option>
              {col.options?.map((opt: any) => (
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              ))}
            </select>
            <div className="text-[10px] uppercase font-medium transition-colors" style={textStyle}>
              {value || <span className="opacity-20 italic">Select...</span>}
            </div>
            {col.checkboxes && col.checkboxes.length > 0 && (
              <div className="flex flex-wrap gap-1 relative z-20">
                {col.checkboxes.map(cb => (
                  <button 
                    key={cb}
                    onClick={() => toggleCheckbox(col.id, cb)}
                    className={`text-[6px] font-black px-1 rounded border transition-colors uppercase ${
                      checked.includes(cb) ? 'bg-accent border-accent text-white' : 'bg-transparent border-border text-muted hover:border-accent'
                    }`}
                  >
                    {cb}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-0.5 relative">
          <input 
            ref={col.id === activeCols[0].id ? inputRef : null}
            value={value} 
            onChange={e => updateField(col.id, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveEdit(row.id)}
            className="w-full bg-transparent border-none text-[10px] text-center uppercase font-medium outline-none focus:ring-0 p-0 text-text placeholder:opacity-10"
            style={textStyle}
            placeholder="..."
          />
          {col.checkboxes && col.checkboxes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {col.checkboxes.map(cb => (
                <button 
                  key={cb}
                  onClick={() => toggleCheckbox(col.id, cb)}
                  className={`text-[6px] font-black px-1 rounded border transition-colors uppercase ${
                    checked.includes(cb) ? 'bg-accent border-accent text-white' : 'bg-transparent border-border text-muted hover:border-accent'
                  }`}
                >
                  {cb}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div 
        className={`flex flex-col items-center justify-center h-full gap-0.5 py-1 transition-all ${canEditAny ? 'cursor-pointer hover:bg-accent/5' : ''}`}
        onClick={() => canEditAny && handleStartEdit(row)}
      >
        <span className="text-[10px] uppercase font-medium" style={textStyle}>{value || '-'}</span>
        {checked.length > 0 && (
          <div className="flex gap-0.5">
            {checked.map((cb: string) => (
              <span key={cb} className="text-[6px] text-accent font-black tracking-widest bg-accent/10 px-1 rounded uppercase">
                {cb}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rt-wrap overflow-x-auto">
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
            <th className="rt-th" style={{ borderLeft: `3px solid ${accentColor}` }}>#</th>
            {activeCols.map((col) => (
              <th key={col.id} className="rt-th text-center">{col.name}</th>
            ))}
            <th className="rt-th"></th>
          </tr>
        </thead>
        <tbody>
          {contents.map((row, idx) => (
            <tr 
              key={row.id} 
              className={`rt-tr group ${editingRowId === row.id ? 'bg-accent/5' : ''}`}
              onBlur={(e) => handleRowBlur(e, row.id)}
            >
              <td className="rt-td text-muted opacity-50" style={{ borderLeft: `3px solid ${accentColor}` }}>
                {idx + 1}
              </td>
              {activeCols.map((col) => (
                <td key={col.id} className="rt-td p-0 h-[34px]">
                  {renderCell(row, col)}
                </td>
              ))}
              <td className="rt-td p-0">
                <div className="flex items-center justify-center gap-1">
                  {editingRowId === row.id ? (
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleSaveEdit(row.id)} className="p-0.5 text-green-500 hover:bg-green-500/10 rounded transition-colors" title="Save"><Check size={10} /></button>
                      <button onClick={handleCancelEdit} className="p-0.5 text-danger hover:bg-danger/10 rounded transition-colors" title="Cancel"><X size={10} /></button>
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
          ))}
          {editMode && (
            <tr>
              <td 
                colSpan={activeCols.length + 2} 
                className="rt-td p-0 h-[24px]"
              >
                <button 
                  onClick={onAddRow}
                  className="w-full h-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted hover:text-accent hover:bg-accent/5 transition-all"
                >
                  <Plus size={10} /> Add Spot / Row
                </button>
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
