import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ScoredCompany } from '../types';
import { MapPin, Plus, Minus, RefreshCcw, Move, SlidersHorizontal, X, BarChart3, Wallet, Award, ScatterChart as ScatterIcon, Globe, TrendingUp } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell, ReferenceLine, Label } from 'recharts';

interface CompanyMapProps {
  companies: ScoredCompany[];
}

interface CityData {
  name: string;
  x: number;
  y: number;
  count: number;
  avgScore: number;
  topCompany: string;
}

// Simplified paths for Canadian provinces/regions for the visualization
const PROVINCES = [
  { name: 'BC', d: 'M100,600 L100,400 L200,380 L220,600 Z', fill: '#e2e8f0' }, // Abstract repr
  { 
    name: 'Western Canada', 
    d: 'M 70 550 Q 80 400 180 350 L 250 350 L 250 650 L 120 620 Z', // BC/Yukon roughly
    fill: '#cbd5e1'
  },
  {
    name: 'Prairies',
    d: 'M 250 350 L 480 380 L 460 680 L 250 650 Z', // AB/SK/MB
    fill: '#e2e8f0'
  },
  {
    name: 'Ontario',
    d: 'M 480 380 L 600 360 L 650 450 L 720 680 L 650 780 L 520 700 L 460 680 Z',
    fill: '#cbd5e1'
  },
  {
    name: 'Quebec',
    d: 'M 600 360 L 800 250 L 850 500 L 720 680 L 650 450 Z',
    fill: '#e2e8f0'
  },
  {
    name: 'Atlantic',
    d: 'M 850 500 L 950 480 L 980 600 L 880 650 L 750 600 Z', // Maritimes
    fill: '#cbd5e1'
  },
  {
    name: 'North',
    d: 'M 150 350 L 200 100 L 600 100 L 700 250 L 600 360 L 480 380 L 250 350 Z',
    fill: '#f1f5f9'
  }
];

// Coordinate mapping for major Canadian tech hubs (0-1000 width, 0-800 height approx)
const CITY_COORDS: Record<string, { x: number, y: number }> = {
  "vancouver": { x: 160, y: 580 },
  "victoria": { x: 140, y: 600 },
  "kelowna": { x: 190, y: 570 },
  "calgary": { x: 280, y: 560 },
  "edmonton": { x: 280, y: 500 },
  "saskatoon": { x: 360, y: 530 },
  "regina": { x: 380, y: 570 },
  "winnipeg": { x: 460, y: 580 },
  "toronto": { x: 640, y: 720 },
  "mississauga": { x: 630, y: 725 },
  "brampton": { x: 625, y: 715 },
  "waterloo": { x: 620, y: 730 },
  "kitchener": { x: 618, y: 728 },
  "hamilton": { x: 630, y: 740 },
  "london": { x: 600, y: 740 },
  "ottawa": { x: 680, y: 680 },
  "kanata": { x: 675, y: 680 },
  "montreal": { x: 720, y: 670 },
  "quebec": { x: 750, y: 640 }, // Quebec City
  "quebec city": { x: 750, y: 640 },
  "sherbrooke": { x: 730, y: 685 },
  "fredericton": { x: 820, y: 620 },
  "halifax": { x: 860, y: 630 },
  "st. john's": { x: 920, y: 550 },
  "charlottetown": { x: 850, y: 600 },
};

const INITIAL_VIEWBOX = { x: 0, y: 0, w: 1000, h: 800 };
const THEMES_LIST = ["AI", "Climate", "Fintech", "Healthcare", "SaaS", "Consumer"];
const STAGES_LIST = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"];

const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg z-50">
          <p className="font-bold text-slate-800 mb-1">{data.name}</p>
          <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between gap-4">
                  <span>Score:</span>
                  <span className="font-semibold text-indigo-600">{data.score.toFixed(1)}</span>
              </div>
              <div className="flex justify-between gap-4">
                  <span>Funding:</span>
                  <span className="font-semibold text-emerald-600">${(data.funding / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between gap-4">
                  <span>Loc:</span>
                  <span className="text-slate-500">{data.location}</span>
              </div>
          </div>
        </div>
      );
    }
    return null;
};

export const CompanyMap: React.FC<CompanyMapProps> = ({ companies }) => {
  const [viewMode, setViewMode] = useState<'geo' | 'scatter'>('geo');
  
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<{name: string, count: number} | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  // Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Filter State
  const [minScore, setMinScore] = useState(0);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  // Zoom & Pan State
  const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  // --- Filtering Logic ---
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
        // Score Filter
        if (c.scores.comprehensive < minScore) return false;

        // Theme Filter
        if (selectedThemes.length > 0) {
            const hasTheme = selectedThemes.some(theme => {
                const key = theme.toLowerCase() as keyof typeof c.themes;
                return c.themes[key];
            });
            if (!hasTheme) return false;
        }

        // Stage Filter
        if (selectedStages.length > 0) {
            const stage = (c["Last Funding Type"] || "").toLowerCase();
            const matchesStage = selectedStages.some(s => stage.includes(s.toLowerCase().replace("-", "")));
            if (!matchesStage) return false;
        }

        return true;
    });
  }, [companies, minScore, selectedThemes, selectedStages]);

  // --- Aggregation Logic (Geo) ---
  const cityData = useMemo(() => {
    const map = new Map<string, { count: number, totalScore: number, topCompany: ScoredCompany }>();

    filteredCompanies.forEach(company => {
      const loc = (company["Headquarters Location"] || "").toLowerCase();
      const cityRaw = loc.split(',')[0].trim();
      
      let coords = CITY_COORDS[cityRaw];
      if (!coords) {
         const foundKey = Object.keys(CITY_COORDS).find(k => cityRaw.includes(k));
         if (foundKey) coords = CITY_COORDS[foundKey];
      }

      if (coords) {
        if (!map.has(cityRaw)) {
          map.set(cityRaw, { count: 0, totalScore: 0, topCompany: company });
        }
        const entry = map.get(cityRaw)!;
        entry.count++;
        entry.totalScore += company.scores.comprehensive;
        if (company.scores.comprehensive > entry.topCompany.scores.comprehensive) {
            entry.topCompany = company;
        }
      }
    });

    const results: CityData[] = [];
    map.forEach((val, key) => {
      let coords = CITY_COORDS[key];
      if (!coords) {
         const foundKey = Object.keys(CITY_COORDS).find(k => key.includes(k));
         if (foundKey) coords = CITY_COORDS[foundKey];
      }
      
      if (coords) {
        results.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          x: coords.x,
          y: coords.y,
          count: val.count,
          avgScore: val.totalScore / val.count,
          topCompany: val.topCompany["Organization Name"]
        });
      }
    });

    return results;
  }, [filteredCompanies]);

  const provinceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    PROVINCES.forEach(p => stats[p.name] = 0);

    filteredCompanies.forEach(c => {
        const loc = (c["Headquarters Location"] || "").toLowerCase();
        if (loc.includes("british columbia") || loc.includes(" bc ")) stats['BC']++;
        else if (loc.includes("alberta") || loc.includes("saskatchewan") || loc.includes("manitoba")) stats['Prairies']++;
        else if (loc.includes("ontario") || loc.includes(" on ")) stats['Ontario']++;
        else if (loc.includes("quebec") || loc.includes(" qc ")) stats['Quebec']++;
        else if (loc.includes("nova scotia") || loc.includes("new brunswick") || loc.includes("prince edward") || loc.includes("newfoundland")) stats['Atlantic']++;
        else if (loc.includes("yukon")) stats['Western Canada']++;
        else if (loc.includes("northwest") || loc.includes("nunavut")) stats['North']++;
    });
    return stats;
  }, [filteredCompanies]);

  // --- Aggregation Logic (Scatter) ---
  const scatterData = useMemo(() => {
      return filteredCompanies.map(c => ({
          name: c["Organization Name"],
          score: c.scores.comprehensive,
          funding: c._fundAmt || 0,
          location: c["Headquarters Location"] || "Unknown",
          z: 1 // base size
      })).filter(d => d.funding > 0); // Hide companies with 0 funding to keep log scale clean if needed, or just better viz
  }, [filteredCompanies]);

  const summaryStats = useMemo(() => {
      const count = filteredCompanies.length;
      if (count === 0) return { avgScore: 0, totalFunding: 0, topHub: "N/A" };

      const totalScore = filteredCompanies.reduce((acc, c) => acc + c.scores.comprehensive, 0);
      const totalFunding = filteredCompanies.reduce((acc, c) => acc + (c._fundAmt || 0), 0);
      
      let maxCity = { name: "N/A", count: 0 };
      cityData.forEach(c => {
          if (c.count > maxCity.count) maxCity = { name: c.name, count: c.count };
      });

      return {
          avgScore: (totalScore / count).toFixed(1),
          totalFunding: (totalFunding / 1000000).toFixed(1) + "M",
          topHub: maxCity.name
      };
  }, [filteredCompanies, cityData]);

  // --- Interaction Handlers ---
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 0.8 : 1.25;
    setViewBox(prev => {
        const newW = prev.w * factor;
        const newH = prev.h * factor;
        if (direction === 'out' && newW > INITIAL_VIEWBOX.w) return INITIAL_VIEWBOX;
        const dx = (prev.w - newW) / 2;
        const dy = (prev.h - newH) / 2;
        return { x: prev.x + dx, y: prev.y + dy, w: newW, h: newH };
    });
  }, []);

  const handleReset = useCallback(() => {
    setViewBox(INITIAL_VIEWBOX);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'geo') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewMode !== 'geo') return;
    e.preventDefault();

    if (isDragging) {
        if (svgRef.current) {
            const { width, height } = svgRef.current.getBoundingClientRect();
            const scaleX = viewBox.w / width;
            const scaleY = viewBox.h / height;
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setViewBox(prev => ({ ...prev, x: prev.x - dx * scaleX, y: prev.y - dy * scaleY }));
            setDragStart({ x: e.clientX, y: e.clientY });
        }
        return;
    }

    if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
            rafRef.current = null;
        });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
      setIsDragging(false);
      setHoveredCity(null);
      setHoveredProvince(null);
  };

  const toggleTheme = (theme: string) => {
      setSelectedThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  };

  const toggleStage = (stage: string) => {
      setSelectedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };

  // --- Memoized Map Visuals ---
  const MapVisuals = useMemo(() => {
    return (
        <>
             <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            
            {/* Province Paths */}
            {PROVINCES.map((prov, i) => (
                <path 
                    key={i}
                    d={prov.d}
                    fill={prov.fill}
                    stroke="white"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredProvince({ name: prov.name, count: provinceStats[prov.name] || 0 })}
                    onMouseLeave={() => setHoveredProvince(null)}
                    className="transition-all duration-200 hover:brightness-90 cursor-pointer"
                />
            ))}

            {/* City Markers */}
            {cityData.map((city, i) => {
                const size = Math.min(Math.max(city.count * 1.5, 6), 30);
                let color = "#64748b";
                if (city.avgScore > 80) color = "#10b981";
                else if (city.avgScore > 60) color = "#3b82f6";
                else if (city.avgScore > 40) color = "#f59e0b";
                
                return (
                    <g key={i} onMouseEnter={() => setHoveredCity(city)} onMouseLeave={() => setHoveredCity(null)} className="group cursor-pointer">
                            {city.count > 5 && (
                            <circle cx={city.x} cy={city.y} r={size * 2} fill={color} opacity="0.2">
                                <animate attributeName="r" from={size} to={size * 2.5} dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                            </circle>
                        )}
                        <circle cx={city.x} cy={city.y} r={size} fill={color} stroke="white" strokeWidth="2" className="transition-all duration-300 group-hover:scale-110 drop-shadow-md" />
                    </g>
                );
            })}
        </>
    );
  }, [cityData, provinceStats]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[600px]">
      
      {/* LEFT: Canvas Area */}
      <div className={`relative flex-1 bg-slate-50 transition-all duration-300 ${isPanelOpen ? 'md:w-2/3' : 'w-full'}`}>
        
        {/* Header Overlay */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {viewMode === 'geo' ? <Globe size={20} className="text-indigo-600" /> : <ScatterIcon size={20} className="text-indigo-600" />}
                {viewMode === 'geo' ? 'Innovation Landscape' : 'Market Matrix'}
            </h3>
            <p className="text-sm text-slate-500">
                {filteredCompanies.length} companies match filters
            </p>
        </div>

        {/* View Toggles */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm print:hidden">
            <button 
                onClick={() => setViewMode('geo')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'geo' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Geographic Map"
            >
                <Globe size={16} />
            </button>
            <button 
                onClick={() => setViewMode('scatter')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'scatter' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Market Matrix (Scatter)"
            >
                <ScatterIcon size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            {!isPanelOpen && (
             <button 
                onClick={() => setIsPanelOpen(true)}
                className="p-1.5 text-slate-600 hover:text-indigo-600 flex items-center gap-1 text-xs font-medium"
             >
                <SlidersHorizontal size={14} />
             </button>
            )}
        </div>

        {/* --- VIEW: GEOGRAPHIC MAP --- */}
        {viewMode === 'geo' && (
            <>
                {/* Map Controls */}
                <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 print:hidden">
                    <button onClick={() => handleZoom('in')} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-indigo-600"><Plus size={16} /></button>
                    <button onClick={() => handleZoom('out')} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-indigo-600"><Minus size={16} /></button>
                    <button onClick={handleReset} className="p-2 bg-white rounded-lg shadow border border-slate-200 text-slate-600 hover:text-indigo-600"><RefreshCcw size={16} /></button>
                </div>

                <div className="w-full h-full relative overflow-hidden group">
                    {/* Drag Hint */}
                    {viewBox.w < INITIAL_VIEWBOX.w && (
                        <div className="absolute top-20 left-6 z-10 px-2 py-1 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm pointer-events-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <Move size={10} /> Drag to pan
                        </div>
                    )}

                    <svg 
                        ref={svgRef}
                        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
                        className={`w-full h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    >
                        {MapVisuals}
                    </svg>

                    {/* Tooltips */}
                    {hoveredCity && (
                        <div 
                            className="absolute bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-xl z-30 pointer-events-none transform -translate-y-full -translate-x-1/2 mt-[-10px] animate-fadeIn print:hidden"
                            style={{ left: `${((hoveredCity.x - viewBox.x) / viewBox.w) * 100}%`, top: `${((hoveredCity.y - viewBox.y) / viewBox.h) * 100}%` }}
                        >
                            <h4 className="font-bold text-slate-800 text-sm mb-1">{hoveredCity.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{hoveredCity.count} Companies</span>
                                <span className="font-medium text-emerald-600">Avg: {hoveredCity.avgScore.toFixed(0)}</span>
                            </div>
                        </div>
                    )}
                    
                    {hoveredProvince && !hoveredCity && (
                        <div 
                            className="absolute bg-slate-800/90 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none z-30 animate-fadeIn backdrop-blur-sm print:hidden"
                            style={{ left: cursorPos.x, top: cursorPos.y - 15, transform: 'translate(-50%, -100%)' }}
                        >
                            <div className="font-bold text-sm mb-0.5">{hoveredProvince.name}</div>
                            <div className="text-xs text-slate-300">{hoveredProvince.count} Companies</div>
                        </div>
                    )}
                </div>
            </>
        )}

        {/* --- VIEW: SCATTER PLOT --- */}
        {viewMode === 'scatter' && (
            <div className="w-full h-full pt-20 pb-10 px-6">
                 <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                            type="number" 
                            dataKey="funding" 
                            name="Funding" 
                            tickFormatter={(value) => `$${(value/1000000).toFixed(0)}M`}
                            stroke="#64748b" 
                            fontSize={10}
                        >
                            <Label value="Total Funding (USD)" offset={0} position="insideBottom" fontSize={12} fill="#64748b" />
                        </XAxis>
                        <YAxis 
                            type="number" 
                            dataKey="score" 
                            name="Score" 
                            domain={[0, 100]}
                            stroke="#64748b"
                            fontSize={10}
                        >
                            <Label value="Comprehensive Score" angle={-90} position="insideLeft" fontSize={12} fill="#64748b" />
                        </YAxis>
                        <ZAxis type="number" dataKey="z" range={[50, 50]} />
                        <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "High Potential", fill: "#10b981", fontSize: 10, position: 'insideTopRight' }} />
                        <Scatter name="Companies" data={scatterData} fill="#4f46e5" fillOpacity={0.6}>
                            {scatterData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : entry.score > 50 ? '#3b82f6' : '#f59e0b'} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                 </ResponsiveContainer>
            </div>
        )}

      </div>

      {/* RIGHT: Side Panel (Shared Filters) */}
      <div className={`bg-white border-l border-slate-200 overflow-y-auto custom-scrollbar transition-all duration-300 flex-shrink-0 ${isPanelOpen ? 'w-full md:w-80' : 'w-0 opacity-0'}`}>
        <div className="p-5 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-indigo-600" /> Data Controls
                </h4>
                <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 print:hidden">
                    <X size={18} />
                </button>
            </div>

            {/* At a Glance Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><BarChart3 size={16} /></div>
                    <div className="text-lg font-bold text-slate-800">{filteredCompanies.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Companies</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><Award size={16} /></div>
                    <div className="text-lg font-bold text-indigo-600">{summaryStats.avgScore}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Avg Score</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><Wallet size={16} /></div>
                    <div className="text-lg font-bold text-emerald-600">{summaryStats.totalFunding}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Funding</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                    <div className="text-slate-400 mb-1 flex justify-center"><MapPin size={16} /></div>
                    <div className="text-sm font-bold text-slate-800 truncate px-1">{summaryStats.topHub}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Top Hub</div>
                </div>
            </div>

            {/* Filter: Score Threshold */}
            <div className="print:hidden">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Min. Score Threshold: <span className="text-indigo-600">{minScore}</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" 
                        max="90" 
                        step="5" 
                        value={minScore} 
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                    </div>
                </div>

                {/* Filter: Themes */}
                <div className="mt-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                        Sectors / Themes
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {THEMES_LIST.map(theme => (
                            <button
                                key={theme}
                                onClick={() => toggleTheme(theme)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left flex items-center gap-2 transition-all ${
                                    selectedThemes.includes(theme) 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full border ${selectedThemes.includes(theme) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`} />
                                {theme}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter: Funding Stages */}
                <div className="mt-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                        Funding Stage
                    </label>
                    <div className="space-y-1">
                        {STAGES_LIST.map(stage => (
                            <div key={stage} onClick={() => toggleStage(stage)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedStages.includes(stage) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                    {selectedStages.includes(stage) && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm text-slate-700">{stage}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
      </div>

    </div>
  );
};