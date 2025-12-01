import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ThemeTrend } from '../types';
import { SlidersHorizontal, X, Calendar, Layers, Check, TrendingUp, PieChart } from 'lucide-react';

interface TrendChartProps {
  data: ThemeTrend[];
}

const THEME_CONFIG: Record<string, { color: string, label: string }> = {
  AI: { color: '#3b82f6', label: 'AI' },
  Climate: { color: '#10b981', label: 'Climate' },
  Fintech: { color: '#f59e0b', label: 'Fintech' },
  Healthcare: { color: '#e11d48', label: 'Healthcare' },
  SaaS: { color: '#8b5cf6', label: 'SaaS' },
  Consumer: { color: '#14b8a6', label: 'Consumer' }
};

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(Object.keys(THEME_CONFIG));
  
  // Date Range State
  const [yearRange, setYearRange] = useState<{start: number, end: number}>({ start: 2015, end: 2025 });

  // Initialize range from data once loaded
  useEffect(() => {
    if (data.length > 0) {
      const min = Math.min(...data.map(d => d.year));
      const max = Math.max(...data.map(d => d.year));
      setYearRange({ start: min, end: max });
    }
  }, [data]);

  // Filter Data based on time range
  const filteredData = useMemo(() => {
    return data.filter(d => d.year >= yearRange.start && d.year <= yearRange.end);
  }, [data, yearRange]);

  // Dynamic Stats Calculation
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { dominant: "N/A", growth: "N/A", avgShare: 0 };

    // 1. Find Dominant Theme (Highest Avg Share in range)
    let maxAvg = 0;
    let dominantTheme = "N/A";
    
    selectedThemes.forEach(theme => {
        const sum = filteredData.reduce((acc, curr) => acc + (curr[theme as keyof ThemeTrend] as number || 0), 0);
        const avg = sum / filteredData.length;
        if (avg > maxAvg) {
            maxAvg = avg;
            dominantTheme = theme;
        }
    });

    // 2. Find Fastest Growing (End - Start)
    let maxGrowth = -100;
    let growthTheme = "N/A";
    const startData = filteredData[0];
    const endData = filteredData[filteredData.length - 1];

    if (startData && endData) {
        selectedThemes.forEach(theme => {
            const startVal = startData[theme as keyof ThemeTrend] as number || 0;
            const endVal = endData[theme as keyof ThemeTrend] as number || 0;
            const growth = endVal - startVal;
            if (growth > maxGrowth) {
                maxGrowth = growth;
                growthTheme = theme;
            }
        });
    }

    return {
        dominant: dominantTheme,
        growth: growthTheme,
        avgShare: maxAvg.toFixed(1)
    };
  }, [filteredData, selectedThemes]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => {
        if (prev.includes(theme)) {
            // Don't allow unselecting the last one
            if (prev.length === 1) return prev;
            return prev.filter(t => t !== theme);
        }
        return [...prev, theme];
    });
  };

  const minYearLimit = data.length > 0 ? Math.min(...data.map(d => d.year)) : 2000;
  const maxYearLimit = data.length > 0 ? Math.max(...data.map(d => d.year)) : new Date().getFullYear();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[500px]">
      
      {/* LEFT: Chart Area */}
      <div className={`relative flex-1 p-6 transition-all duration-300 ${isPanelOpen ? 'md:w-2/3' : 'w-full'}`}>
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="text-lg font-semibold text-slate-800">Market Trends</h3>
                <p className="text-sm text-slate-500">Thematic market share from {yearRange.start} to {yearRange.end}</p>
            </div>
            
            {!isPanelOpen && (
                <button 
                    onClick={() => setIsPanelOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-xs font-medium print:hidden"
                >
                    <SlidersHorizontal size={14} /> Customize
                </button>
            )}
        </div>

        <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                    dataKey="year" 
                    stroke="#94a3b8" 
                    style={{ fontSize: '12px' }} 
                    tickMargin={10}
                />
                <YAxis 
                    stroke="#94a3b8" 
                    style={{ fontSize: '12px' }} 
                    unit="%" 
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', padding: 0 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                
                {Object.keys(THEME_CONFIG).map((theme) => (
                    selectedThemes.includes(theme) && (
                        <Line 
                            key={theme}
                            type="monotone" 
                            dataKey={theme} 
                            stroke={THEME_CONFIG[theme].color} 
                            strokeWidth={3} 
                            dot={false} 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1000}
                        />
                    )
                ))}
              </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT: Control Panel */}
      <div className={`bg-white border-l border-slate-200 overflow-y-auto custom-scrollbar transition-all duration-300 flex-shrink-0 ${isPanelOpen ? 'w-full md:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-5 space-y-6 min-w-[320px]">
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-indigo-600" /> Chart Controls
                </h4>
                <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 print:hidden">
                    <X size={18} />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><PieChart size={16} /></div>
                    <div className="text-lg font-bold text-slate-800">{stats.dominant}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Dominant Theme</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><TrendingUp size={16} /></div>
                    <div className="text-lg font-bold text-indigo-600">{stats.growth}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Fastest Growth</div>
                </div>
            </div>

            {/* Time Range */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Time Horizon
                </label>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
                        <span>{yearRange.start}</span>
                        <span>{yearRange.end}</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-full">
                            <label className="text-[10px] text-slate-400 mb-1 block">Start Year</label>
                            <input 
                                type="number" 
                                min={minYearLimit} 
                                max={yearRange.end - 1} 
                                value={yearRange.start}
                                onChange={(e) => {
                                    const val = Math.max(minYearLimit, Math.min(parseInt(e.target.value), yearRange.end - 1));
                                    setYearRange(p => ({ ...p, start: val }));
                                }}
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="w-full">
                            <label className="text-[10px] text-slate-400 mb-1 block">End Year</label>
                            <input 
                                type="number" 
                                min={yearRange.start + 1} 
                                max={maxYearLimit} 
                                value={yearRange.end}
                                onChange={(e) => {
                                    const val = Math.min(maxYearLimit, Math.max(parseInt(e.target.value), yearRange.start + 1));
                                    setYearRange(p => ({ ...p, end: val }));
                                }}
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Theme Toggles */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers size={14} /> Visible Themes
                </label>
                <div className="space-y-2">
                    {Object.entries(THEME_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => toggleTheme(key)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-xs font-medium ${
                                selectedThemes.includes(key) 
                                    ? 'bg-white border-slate-300 shadow-sm text-slate-700' 
                                    : 'bg-slate-50 border-transparent text-slate-400 opacity-60'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div 
                                    className={`w-3 h-3 rounded-full transition-colors`} 
                                    style={{ backgroundColor: selectedThemes.includes(key) ? config.color : '#cbd5e1' }} 
                                />
                                {config.label}
                            </div>
                            {selectedThemes.includes(key) && <Check size={14} className="text-slate-400" />}
                        </button>
                    ))}
                </div>
                {selectedThemes.length < Object.keys(THEME_CONFIG).length && (
                    <button 
                        onClick={() => setSelectedThemes(Object.keys(THEME_CONFIG))}
                        className="mt-3 text-[10px] text-indigo-600 font-medium hover:underline w-full text-center"
                    >
                        Reset to Show All
                    </button>
                )}
            </div>

        </div>
      </div>

    </div>
  );
};