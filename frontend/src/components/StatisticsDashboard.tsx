import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, BarChart3, PieChart, LineChart, Table as TableIcon, RefreshCw, MoreVertical, Settings2, Trash2, Shield, AlertTriangle, Clock, ChevronLeft, Layout, Hash, Target } from 'lucide-react';
import api from '../api';
import { StatisticsModel, StatisticsWidget } from '../types';
import toast from 'react-hot-toast';
import { StatisticsWidgetModal } from './StatisticsWidgetModal';
import { StatisticsPermissionsModal } from './StatisticsPermissionsModal';
import { motion, AnimatePresence, Reorder } from 'motion/react';

const getChartColor = (idx: number, totalCount: number, customColor?: string) => {
    if (customColor) return customColor;
    const basePalette = [
      '#6366f1', // Indigo
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#3b82f6', // Blue
      '#84cc16', // Lime
      '#a855f7', // Purple
      '#14b8a6', // Teal
      '#f97316', // Orange
    ];
    if (idx < basePalette.length) {
        return basePalette[idx];
    }
    const hue = (idx * 137.5) % 360;
    return `hsl(${hue}, 70%, 60%)`;
};

interface StatisticsWidgetCardProps {
  widget: StatisticsWidget;
  model: StatisticsModel;
  shortname: string;
  onRecalculate: (id: number) => void;
  onConfigure: (widget: StatisticsWidget) => void;
  onDelete: (id: number) => void;
}

export const StatisticsWidgetCard: React.FC<StatisticsWidgetCardProps> = ({
  widget,
  model,
  shortname,
  onRecalculate,
  onConfigure,
  onDelete,
}) => {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const rawData = Array.isArray(widget.cache_result)
    ? widget.cache_result
    : (widget.cache_result ? Object.values(widget.cache_result) : []);
  const visibleData = rawData.filter((item: any) => !hiddenSeries.includes(item.name));

  const getNumericValue = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const displayValue = (val: any): string => {
    if (val === null || val === undefined) return '0';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num % 1 !== 0 
        ? num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
        : num.toLocaleString();
  };

  const total = visibleData.reduce((acc: number, cur: any) => acc + getNumericValue(cur.value), 0);

  const renderWidgetContent = () => {
    if (rawData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <AlertTriangle size={32} />
          <span className="text-[10px] font-black uppercase mt-2">No data available</span>
        </div>
      );
    }

    if (visibleData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-40">
          <AlertTriangle size={32} className="text-accent" />
          <span className="text-[10px] font-black uppercase mt-2 text-text">All series filtered out</span>
          <button 
            onClick={() => setHiddenSeries([])}
            className="mt-3 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded text-[8px] font-black uppercase border border-accent/20 transition-all animate-in fade-in"
          >
            Reset Filters
          </button>
        </div>
      );
    }

    if (widget.type === 'stat') {
        return (
            <div className="grid grid-cols-1 gap-4 py-2">
                {rawData.map((item: any, idx: number) => {
                    const isHidden = hiddenSeries.includes(item.name);
                    const color = getChartColor(idx, rawData.length, item.color);
                    return (
                        <div 
                            key={`${item.name || ''}-${idx}`} 
                            onClick={() => {
                                if (isHidden) {
                                    setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                                } else {
                                    if (hiddenSeries.length < rawData.length - 1) {
                                        setHiddenSeries([...hiddenSeries, item.name]);
                                    } else {
                                        toast.error("At least one series must remain visible");
                                    }
                                }
                            }}
                            className={`relative group overflow-hidden bg-surface/30 border rounded-2xl p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5 cursor-pointer ${
                                isHidden ? 'border-border/30 opacity-40 hover:opacity-60 bg-surface/10 line-through' : 'border-border/50 hover:border-accent/40'
                            }`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                                <Hash size={120} />
                            </div>
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: isHidden ? '#6b7280' : color }} />
                                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">{item.name}</span>
                                </div>
                                <div className="px-2 py-0.5 bg-accent/10 rounded text-accent text-[8px] font-black uppercase tracking-widest">Live Metric</div>
                            </div>
                            <div className="flex items-end gap-3 relative z-10">
                                <motion.span 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: isHidden ? 0.3 : 1 }}
                                    className="text-5xl font-black text-text tracking-tighter tabular-nums"
                                >
                                    {displayValue(item.value)}
                                </motion.span>
                                <div className="flex flex-col mb-1.5">
                                    <span className="text-[10px] font-black text-accent uppercase tracking-widest leading-none">Value</span>
                                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest mt-1">Calculated</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (widget.type === 'radar') {
        const max = Math.max(...visibleData.map((i: any) => getNumericValue(i.value))) || 1;
        const radius = 80;
        const centerX = 100;
        const centerY = 100;
        const count = visibleData.length;

        const getPoint = (idx: number, val: number) => {
            const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
            const r = (val / max) * radius;
            return {
                x: centerX + r * Math.cos(angle),
                y: centerY + r * Math.sin(angle)
            };
        };

        const points = visibleData.map((item: any, idx: number) => {
            const p = getPoint(idx, getNumericValue(item.value));
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
                                points={visibleData.map((_: any, i: number) => {
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
                        {visibleData.map((_: any, i: number) => {
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
                        {visibleData.length >= 3 && (
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
                        )}

                        {/* Point Circles & Line if < 3 */}
                        {visibleData.length < 3 && (
                            <motion.polyline
                                points={points}
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Labels */}
                        {visibleData.map((item: any, i: number) => {
                            const p = getPoint(i, max * 1.15);
                            return (
                                <text
                                    key={`${item.name || ''}-${i}`}
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
                    {rawData.map((item: any, idx: number) => {
                        const isHidden = hiddenSeries.includes(item.name);
                        const color = getChartColor(idx, rawData.length, item.color);
                        return (
                            <button 
                                key={`${item.name || ''}-${idx}`}
                                onClick={() => {
                                    if (isHidden) {
                                        setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                                    } else {
                                        if (hiddenSeries.length < rawData.length - 1) {
                                            setHiddenSeries([...hiddenSeries, item.name]);
                                        } else {
                                            toast.error("At least one series must remain visible");
                                        }
                                    }
                                }}
                                className={`flex items-center justify-between p-2 bg-surface/30 rounded-xl border text-left transition-all ${
                                    isHidden ? 'border-border/30 opacity-30 line-through' : 'border-border/50 hover:border-accent/40'
                                }`}
                            >
                                <span className="text-[8px] font-black text-muted uppercase tracking-widest truncate max-w-[80px] flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isHidden ? '#6b7280' : color }} />
                                    <span className="truncate">{item.name}</span>
                                </span>
                                <span className="text-[10px] font-black text-text">{displayValue(item.value)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (widget.type === 'pie') {
      const isLargeDataset = visibleData.length > 20;
      const gap = (visibleData.length > 1 && !isLargeDataset) ? Math.max(0.5, 3 - visibleData.length * 0.1) : 0;
      const totalGap = gap * visibleData.length;
      const availablePercent = 100 - totalGap;
      let cumulativePercent = 0;

      return (
        <div className="flex flex-col items-center gap-8 py-4">
          <div className="relative w-48 h-48 shrink-0 group">
            <motion.svg 
                initial={{ scale: 0.8, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: -90 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                viewBox="0 0 40 40" 
                className="w-full h-full overflow-visible"
            >
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
              <AnimatePresence>
                {visibleData.map((item: any, idx: number) => {
                    const val = getNumericValue(item.value);
                    const itemPercent = (val / (total || 1)) * 100;
                    const percent = (itemPercent / 100) * availablePercent;
                    
                    const displayPercent = (percent < 0.5 && val > 0) ? 0.5 : percent;
                    const strokeDashoffset = -cumulativePercent;
                    cumulativePercent += displayPercent + gap;

                    const rawIdx = rawData.findIndex((i: any) => i.name === item.name);
                    const color = getChartColor(rawIdx, rawData.length, item.color);

                    return (
                      <motion.circle
                        key={`${item.name || ''}-${idx}`}
                        initial={{ opacity: 0, strokeWidth: 3 }}
                        animate={{ opacity: 1, strokeWidth: 5 }}
                        exit={{ opacity: 0, strokeWidth: 3 }}
                        transition={{ duration: 0.3 }}
                        r="16"
                        cx="20"
                        cy="20"
                        fill="transparent"
                        stroke={color}
                        strokeDasharray={`${displayPercent} 100`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap={isLargeDataset ? "butt" : "round"}
                        className="cursor-pointer transition-all duration-300 hover:stroke-[7]"
                        style={{
                            filter: isLargeDataset ? undefined : `drop-shadow(0 0 4px ${color}44)`
                        }}
                      />
                    );
                })}
              </AnimatePresence>
            </motion.svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.span 
                    key={total}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-black text-text tracking-tighter"
                >
                    {total}
                </motion.span>
                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] -mt-1">Active Total</span>
            </div>
          </div>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {rawData.map((item: any, idx: number) => {
              const isHidden = hiddenSeries.includes(item.name);
              const color = getChartColor(idx, rawData.length, item.color);
              const val = getNumericValue(item.value);
              return (
                <button 
                  key={`${item.name || ''}-${idx}`}
                  type="button"
                  onClick={() => {
                    if (isHidden) {
                      setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                    } else {
                      if (hiddenSeries.length < rawData.length - 1) {
                        setHiddenSeries([...hiddenSeries, item.name]);
                      } else {
                        toast.error("At least one series must remain visible");
                      }
                    }
                  }}
                  className={`flex items-center justify-between p-3 bg-surface/40 rounded-2xl border transition-all text-left group ${
                    isHidden 
                      ? 'border-border/30 opacity-40 hover:opacity-60 bg-surface/10 line-through' 
                      : 'border-border/50 hover:border-accent/30 hover:bg-surface/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg transition-all" 
                        style={{ 
                            backgroundColor: isHidden ? '#6b7280' : color, 
                            boxShadow: isHidden ? 'none' : `0 0 10px ${color}44` 
                        }} 
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-text uppercase truncate tracking-tight">{item.name}</span>
                      <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                        {!isHidden && total > 0 ? ((val / total) * 100).toFixed(1) : 0}% Distribution
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-4">
                    <span className="text-sm font-black text-text tabular-nums leading-none">{displayValue(item.value)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (widget.type === 'line') {
        const max = Math.max(...visibleData.map((i: any) => getNumericValue(i.value))) || 1;
        const padding = 20;
        const width = 400;
        const height = 200;
        
        const getX = (idx: number) => {
            if (visibleData.length <= 1) return width / 2;
            return (idx / (visibleData.length - 1)) * (width - padding * 2) + padding;
        };
        const getY = (val: number) => height - ((val / (max || 1)) * (height - padding * 2) + padding);

        const points = visibleData.map((item: any, idx: number) => `${getX(idx)},${getY(getNumericValue(item.value))}`).join(' ');
        
        const firstRawIdx = rawData.findIndex((i: any) => i.name === visibleData[0]?.name);
        const mainColor = getChartColor(firstRawIdx, rawData.length, visibleData[0]?.color);

        return (
            <div className="py-2">
                <div className="relative h-[200px] w-full bg-surface/10 rounded-2xl border border-border/40 overflow-hidden shadow-inner">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
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
                        {visibleData.length > 1 && (
                            <motion.path
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6 }}
                                d={`M ${getX(0)},${height} ${visibleData.map((item: any, idx: number) => `L ${getX(idx)},${getY(getNumericValue(item.value))}`).join(' ')} L ${getX(visibleData.length - 1)},${height} Z`}
                                fill={`url(#gradient-${widget.id})`}
                            />
                        )}
                        
                        {/* Line */}
                        {visibleData.length > 1 && (
                            <motion.path
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.0, ease: "easeInOut" }}
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
                        {visibleData.map((item: any, idx: number) => {
                            const rawIdx = rawData.findIndex((i: any) => i.name === item.name);
                            const color = getChartColor(rawIdx, rawData.length, item.color);
                            const val = getNumericValue(item.value);
                            return (
                                <g key={`${item.name || ''}-${idx}`}>
                                    <circle
                                        cx={getX(idx)}
                                        cy={getY(val)}
                                        r="5"
                                        fill={color}
                                        className="cursor-help"
                                    />
                                    <circle
                                        cx={getX(idx)}
                                        cy={getY(val)}
                                        r="3"
                                        fill="var(--card)"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {rawData.map((item: any, idx: number) => {
                        const isHidden = hiddenSeries.includes(item.name);
                        const color = getChartColor(idx, rawData.length, item.color);
                        return (
                            <button 
                                key={`${item.name || ''}-${idx}`}
                                type="button"
                                onClick={() => {
                                    if (isHidden) {
                                        setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                                    } else {
                                        if (hiddenSeries.length < rawData.length - 1) {
                                            setHiddenSeries([...hiddenSeries, item.name]);
                                        } else {
                                            toast.error("At least one series must remain visible");
                                        }
                                    }
                                }}
                                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                                    isHidden ? 'border-border/30 opacity-30 line-through bg-surface/10' : 'border-border/50 hover:bg-surface/50 hover:border-accent/40 bg-surface/30'
                                }`}
                            >
                                 <span className="text-[8px] font-black uppercase text-muted tracking-widest text-center leading-tight flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isHidden ? '#6b7280' : color }} />
                                    {item.name}
                                </span>
                                <span className="text-xs font-black text-text tabular-nums">{displayValue(item.value)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (widget.type === 'bar') {
      const max = Math.max(...visibleData.map((i: any) => getNumericValue(i.value))) || 1;
      return (
        <div className="space-y-3 py-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-300">
          {rawData.map((item: any, idx: number) => {
            const isHidden = hiddenSeries.includes(item.name);
            const color = getChartColor(idx, rawData.length, item.color);
            const val = getNumericValue(item.value);
            const pct = max > 0 ? (val / max) * 100 : 0;
            return (
              <button 
                key={`${item.name || ''}-${idx}`}
                type="button"
                onClick={() => {
                  if (isHidden) {
                    setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                  } else {
                    if (hiddenSeries.length < rawData.length - 1) {
                      setHiddenSeries([...hiddenSeries, item.name]);
                    } else {
                      toast.error("At least one series must remain visible");
                    }
                  }
                }}
                className={`w-full space-y-1 text-left group transition-all duration-300 ${isHidden ? 'opacity-35 line-through' : 'hover:opacity-90'}`}
              >
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-muted flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isHidden ? '#6b7280' : color }} />
                    {item.name}
                  </span>
                  <span className="text-text">{displayValue(item.value)}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden border border-border/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isHidden ? '0%' : `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: isHidden ? '#374151' : color }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (widget.type === 'table') {
        return (
            <div className="border border-border rounded overflow-hidden mt-2 max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-[10px] text-left">
                    <thead className="bg-surface border-b border-border sticky top-0">
                        <tr>
                            <th className="px-3 py-2 font-black uppercase tracking-widest text-muted">Metric</th>
                            <th className="px-3 py-2 font-black uppercase tracking-widest text-muted text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rawData.map((item: any, idx: number) => {
                            const isHidden = hiddenSeries.includes(item.name);
                            const color = getChartColor(idx, rawData.length, item.color);
                            return (
                                <tr 
                                    key={`${item.name || ''}-${idx}`}
                                    onClick={() => {
                                        if (isHidden) {
                                            setHiddenSeries(hiddenSeries.filter(h => h !== item.name));
                                        } else {
                                            if (hiddenSeries.length < rawData.length - 1) {
                                                setHiddenSeries([...hiddenSeries, item.name]);
                                            } else {
                                                toast.error("At least one series must remain visible");
                                            }
                                        }
                                    }}
                                    className={`hover:bg-surface/50 cursor-pointer transition-all duration-200 ${
                                        isHidden ? 'opacity-30 line-through bg-surface/10' : ''
                                    }`}
                                >
                                    <td className="px-3 py-2 font-bold uppercase text-text/80 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isHidden ? '#6b7280' : color }} />
                                        {item.name}
                                    </td>
                                    <td className="px-3 py-2 font-black tabular-nums text-right text-text">{displayValue(item.value)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return null;
  };

  return (
    <Reorder.Item 
      value={widget}
      className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm group relative"
      style={{ gridColumn: `span ${widget.width || 6}` }}
    >
      <div className="px-4 py-3 border-b border-border bg-surface/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent/10 rounded text-accent cursor-grab active:cursor-grabbing">
              {widget.type === 'pie' && <PieChart size={14} />}
              {widget.type === 'bar' && <BarChart3 size={14} />}
              {widget.type === 'line' && <LineChart size={14} />}
              {widget.type === 'table' && <TableIcon size={14} />}
              {widget.type === 'stat' && <Hash size={14} />}
              {widget.type === 'radar' && <Target size={14} />}
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
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-1.5 rounded transition-colors ${menuOpen ? 'bg-surface text-text' : 'text-muted hover:bg-surface hover:text-text'}`}
              >
                  <MoreVertical size={14} />
              </button>
              {menuOpen && (
                  <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md shadow-xl p-1 z-20 min-w-[140px]">
                          <button 
                              onClick={() => { onRecalculate(widget.id); setMenuOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded"
                          >
                              <RefreshCw size={12} /> Recalculate
                          </button>
                          <button 
                              onClick={() => { onConfigure(widget); setMenuOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-text hover:bg-surface rounded"
                          >
                              <Settings2 size={12} /> Configure
                          </button>
                          <button 
                              onClick={() => { onDelete(widget.id); setMenuOpen(false); }}
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

      <div className="p-5 flex-1 flex flex-col justify-center">
        {renderWidgetContent()}
      </div>
    </Reorder.Item>
  );
};

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
          <StatisticsWidgetCard 
            key={widget.id}
            widget={widget}
            model={model}
            shortname={shortname}
            onRecalculate={handleRecalculateWidget}
            onConfigure={(w) => setShowWidgetModal(w)}
            onDelete={handleDeleteWidget}
          />
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
