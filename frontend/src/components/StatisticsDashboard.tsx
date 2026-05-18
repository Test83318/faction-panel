import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, BarChart3, PieChart, LineChart, Table as TableIcon, RefreshCw, MoreVertical, Settings2, Trash2, Shield, AlertTriangle, Clock, ChevronLeft, Layout, Hash, Target } from 'lucide-react';
import api from '../api';
import { StatisticsModel, StatisticsWidget } from '../types';
import toast from 'react-hot-toast';
import { StatisticsWidgetModal } from './StatisticsWidgetModal';
import { StatisticsPermissionsModal } from './StatisticsPermissionsModal';
import { motion, AnimatePresence, Reorder } from 'motion/react';

interface StatisticsDashboardProps {
  shortname: string;
  user: any;
  permissions: string[];
  rosters: any[];
  datasets: any[];
  recordData: any[];
}

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ shortname, user, permissions, rosters, datasets, recordData }) => {
  const { modelId } = useParams();
  const [model, setModel] = useState<StatisticsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWidgetModal, setShowWidgetModal] = useState<StatisticsWidget | boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const fetchModel = async () => {
    try {
      const res = await api.get(`/statistics/${modelId}`);
      setModel(res.data);
    } catch (err) {
      toast.error('Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModel();
  }, [modelId]);

  const handleRecalculateWidget = async (id: number) => {
    const loadToast = toast.loading('Recalculating widget...');
    try {
      const res = await api.post(`/statistics-widgets/${id}/recalculate`);
      setModel(prev => prev ? {
        ...prev,
        widgets: prev.widgets?.map(w => w.id === id ? res.data : w)
      } : null);
      toast.success('Widget updated', { id: loadToast });
    } catch (err) {
      toast.error('Failed to recalculate', { id: loadToast });
    }
  };

  const handleDeleteWidget = async (id: number) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    const loadToast = toast.loading('Deleting widget...');
    try {
      await api.delete(`/statistics-widgets/${id}`);
      setModel(prev => prev ? {
        ...prev,
        widgets: prev.widgets?.filter(w => w.id !== id)
      } : null);
      toast.success('Widget removed', { id: loadToast });
    } catch (err) {
      toast.error('Failed to delete widget', { id: loadToast });
    }
  };

  const handleReorder = async (newWidgets: StatisticsWidget[]) => {
      setModel(prev => prev ? { ...prev, widgets: newWidgets } : null);
      try {
          await api.put(`/statistics/${modelId}/widgets/reorder`, {
              widget_ids: newWidgets.map(w => w.id)
          });
      } catch (err) {
          toast.error('Failed to save order');
      }
  };

  const renderWidgetContent = (widget: StatisticsWidget) => {
    const data = widget.cache_result || [];
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <AlertTriangle size={32} />
          <span className="text-[10px] font-black uppercase mt-2">No data available</span>
        </div>
      );
    }

    const total = data.reduce((acc: number, cur: any) => acc + (cur.value || 0), 0);

    if (widget.type === 'stat') {
        const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        return (
            <div className="grid grid-cols-1 gap-4 py-2">
                {data.map((item: any, idx: number) => (
                    <div key={idx} className="relative group overflow-hidden bg-surface/30 border border-border/50 rounded-2xl p-6 hover:border-accent/40 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                            <Hash size={120} />
                        </div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: item.color || colors[idx % colors.length] }} />
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">{item.name}</span>
                            </div>
                            <div className="px-2 py-0.5 bg-accent/10 rounded text-accent text-[8px] font-black uppercase tracking-widest">Live Metric</div>
                        </div>
                        <div className="flex items-end gap-3 relative z-10">
                            <motion.span 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-5xl font-black text-text tracking-tighter tabular-nums"
                            >
                                {typeof item.value === 'number' && item.value % 1 !== 0 ? item.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : item.value.toLocaleString()}
                            </motion.span>
                            <div className="flex flex-col mb-1.5">
                                <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">Total</span>
                                <span className="text-[8px] font-bold text-muted uppercase tracking-widest mt-1">Calculated Now</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-1.5 text-success font-black text-[9px] uppercase tracking-widest">
                                <RefreshCw size={10} className="animate-spin-slow" /> Validated
                            </div>
                            <span className="text-[8px] font-bold text-muted uppercase tracking-widest">ID: {widget.id}{idx}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (widget.type === 'radar') {
        const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        const max = Math.max(...data.map((i: any) => i.value)) || 1;
        const radius = 80;
        const centerX = 100;
        const centerY = 100;
        const count = data.length;

        const getPoint = (idx: number, val: number) => {
            const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
            const r = (val / max) * radius;
            return {
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle)
            };
        };

        const points = data.map((item: any, idx: number) => {
            const p = getPoint(idx, item.value);
            return `${p.x},${p.y}`;
        }).join(' ');

        const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

        return (
            <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative w-64 h-64 shrink-0">
                    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id={`radar-grad-${widget.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        
                        {/* Grid */}
                        {gridLevels.map(level => (
                            <polygon
                                key={level}
                                points={data.map((_: any, i: number) => {
                                    const p = getPoint(i, max * level);
                                    return `${p.x},${p.y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth="0.5"
                                strokeDasharray="2 2"
                            />
                        ))}
                        
                        {/* Axes */}
                        {data.map((_: any, i: number) => {
                            const p = getPoint(i, max);
                            return (
                                <line
                                    key={i}
                                    x1={centerX} y1={centerY} x2={p.x} y2={p.y}
                                    stroke="var(--border)" strokeWidth="0.5" strokeOpacity="0.3"
                                />
                            );
                        })}

                        {/* Data Polygon */}
                        <motion.polygon
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            points={points}
                            fill={`url(#radar-grad-${widget.id})`}
                            stroke="var(--accent)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />

                        {/* Labels (placed outside the radar) */}
                        {data.map((item: any, i: number) => {
                            const p = getPoint(i, max * 1.15);
                            return (
                                <text
                                    key={i}
                                    x={p.x}
                                    y={p.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[6px] font-black uppercase fill-muted tracking-tighter"
                                >
                                    {item.name}
                                </text>
                            );
                        })}
                    </svg>
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                    {data.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-surface/30 rounded-xl border border-border/50">
                            <span className="text-[8px] font-black text-muted uppercase tracking-widest truncate max-w-[80px]">{item.name}</span>
                            <span className="text-[10px] font-black text-text">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (widget.type === 'pie') {
      const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
      let cumulativePercent = 0;
      const isLargeDataset = data.length > 20;
      const gap = (data.length > 1 && !isLargeDataset) ? 2 : 0; // Small gap between segments, disabled for large datasets
      const totalGap = gap * data.length;
      const availablePercent = 100 - totalGap;

      return (
        <div className="flex flex-col items-center gap-8 py-4">
          <div className="relative w-48 h-48 shrink-0 group">
            <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90 overflow-visible">
              {/* Background Track */}
              <circle
                r="16"
                cx="20"
                cy="20"
                fill="transparent"
                stroke="var(--border)"
                strokeWidth="4"
                strokeOpacity="0.2"
              />
              {data.map((item: any, idx: number) => {
                const itemPercent = (item.value / (total || 1)) * 100;
                const percent = (itemPercent / 100) * availablePercent;
                
                // If the slice is too small to be visible but has a value, give it a tiny minimum width
                const displayPercent = (percent < 0.5 && item.value > 0) ? 0.5 : percent;
                
                const strokeDashoffset = -cumulativePercent;
                
                // Track cumulative percent for next segment (including gap)
                cumulativePercent += displayPercent + gap;

                return (
                  <motion.circle
                    key={idx}
                    initial={isLargeDataset ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                    animate={isLargeDataset ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
                    transition={isLargeDataset ? { duration: 0.3 } : { duration: 1, delay: idx * (1 / data.length), ease: "easeOut" }}
                    r="16"
                    cx="20"
                    cy="20"
                    fill="transparent"
                    stroke={item.color || colors[idx % colors.length]}
                    strokeWidth="5"
                    strokeDasharray={`${displayPercent} 100`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap={isLargeDataset ? "butt" : "round"}
                    className="cursor-pointer transition-all duration-300 hover:stroke-[7]"
                    style={{
                        filter: isLargeDataset ? undefined : `drop-shadow(0 0 4px ${item.color || colors[idx % colors.length]}44)`
                    }}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.span 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-black text-text tracking-tighter"
                >
                    {total}
                </motion.span>
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] -mt-1">Total Items</span>
            </div>
          </div>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {data.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface/40 rounded-2xl border border-border/50 hover:border-accent/30 transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg" style={{ backgroundColor: item.color || colors[idx % colors.length], boxShadow: `0 0 10px ${item.color || colors[idx % colors.length]}44` }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-text uppercase truncate tracking-tight">{item.name}</span>
                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}% Distribution</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-4">
                  <span className="text-sm font-black text-text tabular-nums leading-none">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (widget.type === 'line') {
        const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        const mainColor = data[0]?.color || colors[0];
        const max = Math.max(...data.map((i: any) => i.value));
        const padding = 20;
        const width = 400;
        const height = 200;
        
        const getX = (idx: number) => {
            if (data.length <= 1) return width / 2;
            return (idx / (data.length - 1)) * (width - padding * 2) + padding;
        };
        const getY = (val: number) => height - ((val / (max || 1)) * (height - padding * 2) + padding);

        const points = data.map((item: any, idx: number) => `${getX(idx)},${getY(item.value)}`).join(' ');

        return (
            <div className="py-2">
                <div className="relative h-[200px] w-full bg-surface/10 rounded-2xl border border-border/40 overflow-hidden shadow-inner">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={mainColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={mainColor} stopOpacity="0" />
                            </linearGradient>
                            <filter id={`glow-${widget.id}`}>
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                            <line 
                                key={p}
                                x1={padding} y1={getY(max * p)} x2={width - padding} y2={getY(max * p)}
                                stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" strokeOpacity="0.3"
                            />
                        ))}

                        {/* Area */}
                        {data.length > 1 && (
                            <motion.path
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                                d={`M ${getX(0)},${height} ${data.map((item: any, idx: number) => `L ${getX(idx)},${getY(item.value)}`).join(' ')} L ${getX(data.length - 1)},${height} Z`}
                                fill={`url(#gradient-${widget.id})`}
                            />
                        )}
                        
                        {/* Line */}
                        {data.length > 1 && (
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                d={`M ${points}`}
                                fill="none"
                                stroke={mainColor}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter={`url(#glow-${widget.id})`}
                            />
                        )}
                        
                        {/* Dots */}
                        {data.map((item: any, idx: number) => (
                            <motion.g 
                                key={idx}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1 + (idx * 0.1) }}
                            >
                                <circle
                                    cx={getX(idx)}
                                    cy={getY(item.value)}
                                    r="5"
                                    fill={item.color || colors[idx % colors.length]}
                                    className="cursor-help"
                                />
                                <circle
                                    cx={getX(idx)}
                                    cy={getY(item.value)}
                                    r="3"
                                    fill="var(--card)"
                                />
                            </motion.g>
                        ))}
                    </svg>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 bg-surface/30 rounded-xl border border-border/50 flex flex-col items-center justify-center gap-1 hover:bg-surface/50 transition-all">
                            <span className="text-[8px] font-black uppercase text-muted tracking-widest text-center leading-tight">{item.name}</span>
                            <span className="text-xs font-black text-text tabular-nums">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (widget.type === 'bar') {
      const max = Math.max(...data.map((i: any) => i.value));
      return (
        <div className="space-y-3 py-2 max-h-64 overflow-y-auto pr-2">
          {data.map((item: any, idx: number) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                <span className="text-muted">{item.name}</span>
                <span className="text-text">{item.value}</span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden border border-border/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
                  className="h-full rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]"
                  style={{ backgroundColor: item.color || 'var(--accent)' }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (widget.type === 'table') {
        return (
            <div className="border border-border rounded overflow-hidden mt-2 max-h-64 overflow-y-auto">
                <table className="w-full text-[10px] text-left">
                    <thead className="bg-surface border-b border-border sticky top-0">
                        <tr>
                            <th className="px-3 py-2 font-black uppercase tracking-widest text-muted">Metric</th>
                            <th className="px-3 py-2 font-black uppercase tracking-widest text-muted text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-surface/50">
                                <td className="px-3 py-2 font-bold uppercase text-text/80 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || 'var(--accent)' }} />
                                    {item.name}
                                </td>
                                <td className="px-3 py-2 font-black tabular-nums text-right text-text">{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return null;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-accent" /></div>;
  if (!model) return <div>Dashboard not found</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <Link to={`/${shortname}/statistics`} className="p-2 bg-card border border-border rounded-lg hover:bg-surface transition-colors">
                <ChevronLeft size={20} />
            </Link>
            <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-text">{model.name}</h1>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">{model.description || 'Dashboard overview'}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {model.user_permissions?.modify_statistics && (
                <>
                    <button 
                        onClick={() => setShowPermissionsModal(true)}
                        className="px-4 py-2 bg-card hover:bg-surface text-text rounded font-black text-[10px] uppercase tracking-widest transition flex items-center gap-2 border border-border"
                    >
                        <Shield size={14} /> Permissions
                    </button>
                    <button 
                        onClick={() => setShowWidgetModal(true)}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded font-black text-[10px] uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-accent/20"
                    >
                        <Plus size={14} /> Add Widget
                    </button>
                </>
            )}
        </div>
      </div>

      <Reorder.Group 
        axis="y" 
        values={model.widgets || []} 
        onReorder={handleReorder}
        className="grid grid-cols-12 gap-6"
      >
        {model.widgets?.map(widget => (
          <Reorder.Item 
            key={widget.id} 
            value={widget}
            className={`bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm group relative`}
            style={{ gridColumn: `span ${widget.width || 6}` }}
          >
            <div className="px-4 py-3 border-b border-border bg-surface/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-accent/10 rounded text-accent cursor-grab active:cursor-grabbing">
                    {widget.type === 'pie' && <PieChart size={14} />}
                    {widget.type === 'bar' && <BarChart3 size={14} />}
                    {widget.type === 'line' && <LineChart size={14} />}
                    {widget.type === 'table' && <TableIcon size={14} />}
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-text">{widget.name}</h3>
                  <div className="flex items-center gap-2 text-[8px] font-bold text-muted uppercase">
                    <Clock size={8} />
                    <span>Updated: {widget.last_calculated_at ? new Date(widget.last_calculated_at).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {widget.is_intensive && (
                    <div className="px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded text-[7px] font-black uppercase tracking-widest">
                        Intensive
                    </div>
                )}
                {model.user_permissions?.modify_statistics && (
                    <div className="relative">
                    <button 
                        onClick={() => setActiveMenu(activeMenu === widget.id ? null : widget.id)}
                        className={`p-1.5 rounded transition-colors ${activeMenu === widget.id ? 'bg-surface text-text' : 'text-muted hover:bg-surface hover:text-text'}`}
                    >
                        <MoreVertical size={14} />
                    </button>
                    {activeMenu === widget.id && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-xl p-1 z-20 min-w-[140px]">
                                <button 
                                    onClick={() => { handleRecalculateWidget(widget.id); setActiveMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded"
                                >
                                    <RefreshCw size={12} /> Recalculate
                                </button>
                                <button 
                                    onClick={() => { setShowWidgetModal(widget); setActiveMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded"
                                >
                                    <Settings2 size={12} /> Configure
                                </button>
                                <button 
                                    onClick={() => { handleDeleteWidget(widget.id); setActiveMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-danger/70 hover:text-danger hover:bg-danger/5 rounded"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        </>
                    )}
                    </div>
                )}
              </div>
            </div>

            <div className="p-5 flex-1">
              {renderWidgetContent(widget)}
            </div>
          </Reorder.Item>
        ))}

        {(model.widgets || []).length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl opacity-50 bg-card/30">
            <Layout size={48} className="mb-4 text-muted" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-muted">No widgets added to this dashboard</p>
            {model.user_permissions?.modify_statistics && (
              <button 
                onClick={() => setShowWidgetModal(true)}
                className="mt-6 px-6 py-2 bg-accent text-white rounded font-black text-[10px] uppercase tracking-widest transition hover:bg-accent/90"
              >
                Add your first widget
              </button>
            )}
          </div>
        )}
      </Reorder.Group>

      {showWidgetModal && (
        <StatisticsWidgetModal 
            modelId={parseInt(modelId!)}
            widget={typeof showWidgetModal === 'object' ? showWidgetModal : undefined}
            rosters={rosters}
            datasets={datasets}
            recordData={recordData}
            onClose={() => setShowWidgetModal(false)}
            onSave={() => {
                setShowWidgetModal(false);
                fetchModel();
            }}
        />
      )}

      {showPermissionsModal && (
          <StatisticsPermissionsModal 
            model={model}
            shortname={shortname}
            onClose={() => setShowPermissionsModal(false)}
          />
      )}
    </div>
  );
};

export default StatisticsDashboard;
