import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { ScoredCompany } from '../types';
import { BarChart3, Filter, SlidersHorizontal, X, MapPin, Calendar, PieChart as PieChartIcon } from 'lucide-react';

interface ScoreDistributionProps {
  companies: ScoredCompany[];
}

type ScoreMetric = 'comprehensive' | 'potential' | 'funding' | 'operations' | 'brandTrend';

const METRICS: { key: ScoreMetric; label: string; color: string }[] = [
  { key: 'comprehensive', label: 'Comprehensive', color: '#6366f1' }, // indigo
  { key: 'potential', label: 'Potential', color: '#8b5cf6' }, // violet
  { key: 'funding', label: 'Funding', color: '#10b981' }, // emerald
  { key: 'operations', label: 'Operations', color: '#3b82f6' }, // blue
  { key: 'brandTrend', label: 'Brand & Trend', color: '#f59e0b' }, // amber
];

const PROVINCES_LIST = ['All', 'Ontario', 'British Columbia', 'Quebec', 'Alberta', 'Other'];

export const ScoreDistribution: React.FC<ScoreDistributionProps> = ({ companies }) => {
  const [activeMetric, setActiveMetric] = useState<ScoreMetric>('comprehensive');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Filters
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [yearRange, setYearRange] = useState({ start: 2000, end: new Date().getFullYear() });

  // Initialize range
  useEffect(() => {
    if (companies.length > 0) {
        const years = companies
            .map(c => c["Founded Date"] ? new Date(c["Founded Date"]).getFullYear() : NaN)
            .filter(y => !isNaN(y));
        if (years.length > 0) {
            setYearRange({ start: Math.min(...years), end: Math.max(...years) });
        }
    }
  }, [companies]);

  // --- Filter Logic ---
  const filteredCompanies = useMemo(() => {
      return companies.filter(c => {
          // Location Filter
          if (selectedProvince !== 'All') {
              const loc = (c["Headquarters Location"] || "").toLowerCase();
              let match = false;
              if (selectedProvince === 'Ontario') match = loc.includes('ontario') || loc.includes(' on ');
              else if (selectedProvince === 'British Columbia') match = loc.includes('british columbia') || loc.includes(' bc ');
              else if (selectedProvince === 'Quebec') match = loc.includes('quebec') || loc.includes(' qc ');
              else if (selectedProvince === 'Alberta') match = loc.includes('alberta') || loc.includes(' ab ');
              else if (selectedProvince === 'Other') {
                  match = !loc.includes('ontario') && !loc.includes(' on ') && 
                          !loc.includes('british columbia') && !loc.includes(' bc ') &&
                          !loc.includes('quebec') && !loc.includes(' qc ') &&
                          !loc.includes('alberta') && !loc.includes(' ab ');
              }
              if (!match) return false;
          }

          // Time Filter
          if (c["Founded Date"]) {
              const year = new Date(c["Founded Date"]).getFullYear();
              if (!isNaN(year)) {
                  if (year < yearRange.start || year > yearRange.end) return false;
              }
          }
          
          return true;
      });
  }, [companies, selectedProvince, yearRange]);

  // --- Stats Logic ---
  const stats = useMemo(() => {
      if (filteredCompanies.length === 0) return { count: 0, median: 0 };
      const scores = filteredCompanies.map(c => c.scores[activeMetric]).sort((a, b) => a - b);
      const mid = Math.floor(scores.length / 2);
      const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
      return { count: filteredCompanies.length, median: median.toFixed(1) };
  }, [filteredCompanies, activeMetric]);

  // --- Chart Data ---
  const data = useMemo(() => {
    // Define standard bins
    const bins = [
      { range: '0-20', min: 0, max: 20, count: 0 }, 
      { range: '21-40', min: 21, max: 40, count: 0 }, 
      { range: '41-60', min: 41, max: 60, count: 0 }, 
      { range: '61-80', min: 61, max: 80, count: 0 }, 
      { range: '81-100', min: 81, max: 100, count: 0 }, 
    ];

    filteredCompanies.forEach(company => {
      const score = company.scores[activeMetric];
      const bin = bins.find(b => score >= b.min && score <= b.max);
      if (bin) {
        bin.count++;
      }
    });

    // For Pie chart, we might want distinct colors for each slice if needed, 
    // but using intensity or metric color is also fine. 
    // Let's use opacity steps for pie chart visual distinction or keep single color.
    const metricColor = METRICS.find(m => m.key === activeMetric)?.color || '#6366f1';
    
    return bins.map((bin, i) => ({
        ...bin,
        fill: metricColor,
        // Add opacity variation for pie chart slices to be distinguishable
        fillOpacity: 0.4 + ((i + 1) * 0.12) 
    }));
  }, [filteredCompanies, activeMetric]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const binData = payload[0].payload;
      const percentage = filteredCompanies.length > 0 
        ? ((binData.count / filteredCompanies.length) * 100).toFixed(1) 
        : "0.0";
      const metricLabel = METRICS.find(m => m.key === activeMetric)?.label;
      const rangeLabel = label || binData.range; // Fallback for Pie Chart
      
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg z-50">
          <p className="font-bold text-slate-800 mb-1">{metricLabel} Score: {rangeLabel}</p>
          <div className="text-sm text-slate-600">
            <span className="font-semibold">{binData.count}</span> Companies
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {percentage}% of selection
          </div>
        </div>
      );
    }
    return null;
  };

  const minYearLimit = 1990;
  const maxYearLimit = new Date().getFullYear();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-row overflow-hidden relative">
      
      {/* LEFT: Chart Area */}
      <div className={`flex-1 p-6 flex flex-col transition-all duration-300 ${isPanelOpen ? 'opacity-20 md:opacity-100' : 'opacity-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    {chartType === 'bar' ? <BarChart3 size={20} className="text-indigo-600" /> : <PieChartIcon size={20} className="text-indigo-600" />}
                    Score Distribution
                </h3>
                <p className="text-sm text-slate-500">
                    Frequency analysis of {filteredCompanies.length} companies
                </p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setChartType(prev => prev === 'bar' ? 'pie' : 'bar')}
                    className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all print:hidden"
                    title={chartType === 'bar' ? "Switch to Pie Chart" : "Switch to Bar Chart"}
                >
                    {chartType === 'bar' ? <PieChartIcon size={16} /> : <BarChart3 size={16} />}
                </button>

                {!isPanelOpen && (
                    <button 
                        onClick={() => setIsPanelOpen(true)}
                        className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all print:hidden"
                    >
                        <SlidersHorizontal size={16} />
                    </button>
                )}
            </div>
        </div>
        
        {/* Metric Selector - Hide when printing */}
        <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg w-full mb-4 print:hidden">
            {METRICS.map(metric => (
                <button
                    key={metric.key}
                    onClick={() => setActiveMetric(metric.key)}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all truncate ${
                        activeMetric === metric.key 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    {metric.label}
                </button>
            ))}
        </div>
        
        <div className="flex-1 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="range" 
                        stroke="#64748b" 
                        style={{ fontSize: '10px' }} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="#64748b" 
                        style={{ fontSize: '10px' }} 
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                    ))}
                    </Bar>
                </BarChart>
            ) : (
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="count"
                        nameKey="range"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={entry.fillOpacity} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value, entry: any) => <span className="text-xs text-slate-600 ml-1">{value}</span>}
                    />
                </PieChart>
            )}
            </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT: Side Panel */}
      <div className={`absolute inset-y-0 right-0 bg-white border-l border-slate-200 overflow-y-auto custom-scrollbar transition-all duration-300 z-10 ${isPanelOpen ? 'w-full md:w-80 translate-x-0' : 'w-full md:w-80 translate-x-full'}`}>
         <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Filter size={18} className="text-indigo-600" /> Filters
                </h4>
                <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 print:hidden">
                    <X size={18} />
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><PieChartIcon size={16} /></div>
                    <div className="text-lg font-bold text-slate-800">{stats.count}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Filtered Count</div>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><BarChart3 size={16} /></div>
                    <div className="text-lg font-bold text-indigo-600">{stats.median}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Median Score</div>
                 </div>
            </div>

            {/* Location Filter */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin size={14} /> Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {PROVINCES_LIST.map(prov => (
                        <button
                            key={prov}
                            onClick={() => setSelectedProvince(prov)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                                selectedProvince === prov
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {prov}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Filter */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Founded Year
                </label>
                <div className="flex gap-3">
                     <div className="w-full">
                        <label className="text-[10px] text-slate-400 mb-1 block">From</label>
                        <input 
                            type="number" 
                            min={minYearLimit} 
                            max={yearRange.end} 
                            value={yearRange.start}
                            onChange={(e) => {
                                const val = Math.max(minYearLimit, Math.min(parseInt(e.target.value), yearRange.end));
                                setYearRange(p => ({ ...p, start: val }));
                            }}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                     </div>
                     <div className="w-full">
                        <label className="text-[10px] text-slate-400 mb-1 block">To</label>
                         <input 
                            type="number" 
                            min={yearRange.start} 
                            max={maxYearLimit} 
                            value={yearRange.end}
                            onChange={(e) => {
                                const val = Math.min(maxYearLimit, Math.max(parseInt(e.target.value), yearRange.start));
                                setYearRange(p => ({ ...p, end: val }));
                            }}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                     </div>
                </div>
            </div>

         </div>
      </div>
    </div>
  );
};