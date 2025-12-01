import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InvestorStat, LiveIntelResult, PortfolioItem } from '../types';
import { Briefcase, TrendingUp, ChevronDown, ChevronUp, Search, Filter, Globe, ExternalLink, Activity, Award, Copy, Check, Info, BrainCircuit, Lightbulb, PieChart } from 'lucide-react';
import { generateLiveIntelligence, generateInvestorInternalAnalysis, InvestorInternalAnalysis } from '../services/geminiService';

interface InvestorAnalysisProps {
  investors: InvestorStat[];
}

const THEME_STYLES: Record<string, string> = {
  'AI': 'bg-blue-50 text-blue-700 border-blue-200',
  'Climate': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fintech': 'bg-amber-50 text-amber-700 border-amber-200',
  'Healthcare': 'bg-rose-50 text-rose-700 border-rose-200',
  'SaaS': 'bg-violet-50 text-violet-700 border-violet-200',
  'Consumer': 'bg-teal-50 text-teal-700 border-teal-200',
  'General': 'bg-slate-50 text-slate-700 border-slate-200'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as InvestorStat;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg max-w-[250px] z-50">
        <p className="font-bold text-slate-800 mb-1">{data.name}</p>
        <p className="text-xs text-slate-500 mb-2">{data.count} Investment{data.count !== 1 ? 's' : ''}</p>
        
        <div className="border-t border-slate-100 pt-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Portfolio (Batch)</p>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                {data.portfolio.slice(0, 10).map((item, idx) => {
                     const primaryTheme = item.themes[0] || 'General';
                     const style = THEME_STYLES[primaryTheme] || THEME_STYLES['General'];
                     return (
                         <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded border truncate max-w-full ${style}`}>
                             {item.name}
                         </span>
                     );
                })}
                {data.portfolio.length > 10 && (
                    <span className="text-slate-400 italic text-[10px] px-1">+ {data.portfolio.length - 10} more</span>
                )}
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const CopyButton = ({ text, className = "" }: { text: string, className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors border ${
                copied 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'
            } ${className}`}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
        </button>
    );
};

// Helper to split markdown content by headers
const parseInvestorMarkdown = (markdown: string) => {
    const sections: Record<string, string> = {
        activity: "",
        reputation: "",
        other: ""
    };

    const parts = markdown.split('## ');
    
    parts.forEach(part => {
        if (part.startsWith('Recent Activity')) {
            sections.activity = part.replace('Recent Activity', '').trim();
        } else if (part.startsWith('Reputation & Thesis')) {
            sections.reputation = part.replace('Reputation & Thesis', '').trim();
        } else if (part.trim().length > 0) {
            sections.other += part + "\n";
        }
    });

    return sections;
};

// Simple Markdown Renderer (Reuse)
const MarkdownText = ({ content }: { content: string }) => (
    <div className="prose prose-sm max-w-none text-slate-600 text-xs">
        {content.split('\n').map((line, i) => {
            if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc marker:text-indigo-400 mb-1">{line.replace('- ', '')}</li>;
            if (line.trim().length === 0) return <br key={i} />;
            return <p key={i} className="mb-1">{line}</p>;
        })}
    </div>
);

// Collapsible Portfolio Component
const InvestorPortfolioList = ({ portfolio }: { portfolio: PortfolioItem[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 mb-4">
        <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="flex items-center gap-2 w-full text-left group py-1"
        >
            <div className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Portfolio in Dataset ({portfolio.length})
            </span>
        </button>
        
        {isOpen && (
            <div className="mt-2 pl-2 animate-fadeIn">
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {portfolio.map((item, i) => {
                        const primaryTheme = item.themes[0] || 'General';
                        const style = THEME_STYLES[primaryTheme] || THEME_STYLES['General'];
                        return (
                            <span key={i} className={`text-xs px-2 py-1 rounded border border-opacity-60 ${style}`}>
                                {item.name}
                            </span>
                        );
                    })}
                </div>
                
                {/* Industry Color Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
                     {Object.keys(THEME_STYLES).filter(k => k !== 'General').map(theme => (
                         <div key={theme} className="flex items-center gap-1.5">
                             <div className={`w-2.5 h-2.5 rounded-full ${THEME_STYLES[theme].split(' ')[0]}`} />
                             <span className="text-[11px] font-bold text-slate-600">{theme}</span>
                         </div>
                     ))}
                </div>
            </div>
        )}
    </div>
  );
};

export const InvestorAnalysis: React.FC<InvestorAnalysisProps> = ({ investors }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTheme, setActiveTheme] = useState("All");
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  
  // Live Intel State
  const [liveIntel, setLiveIntel] = useState<Record<string, LiveIntelResult>>({});
  const [loadingIntel, setLoadingIntel] = useState<string | null>(null);

  // Internal Analysis State
  const [internalAnalyses, setInternalAnalyses] = useState<Record<string, InvestorInternalAnalysis>>({});
  const [loadingInternal, setLoadingInternal] = useState<string | null>(null);

  const themes = ["All", "AI", "Climate", "Fintech", "Healthcare", "SaaS", "Consumer"];

  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = inv.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTheme = activeTheme === "All" || inv.topThemes.includes(activeTheme);
    return matchesSearch && matchesTheme;
  });

  const topInvestors = filteredInvestors.slice(0, 15);
  const featuredInvestors = filteredInvestors.slice(0, 6);

  const toggleExpand = (name: string) => {
    setExpandedInvestor(expandedInvestor === name ? null : name);
  };

  const handleBackgroundCheck = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setLoadingIntel(name);
    const result = await generateLiveIntelligence(name, "investor");
    setLiveIntel(prev => ({ ...prev, [name]: result }));
    setLoadingIntel(null);
  };

  const handleInternalAnalysis = async (e: React.MouseEvent, investor: InvestorStat) => {
      e.stopPropagation();
      setLoadingInternal(investor.name);
      const analysis = await generateInvestorInternalAnalysis(investor);
      setInternalAnalyses(prev => ({ ...prev, [investor.name]: analysis }));
      setLoadingInternal(null);
  };

  return (
    <div className="space-y-4">
      {/* Hide controls during print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        {/* Theme Filters */}
        <div className="flex flex-wrap gap-2 order-2 md:order-1">
        {themes.map(theme => (
            <button
            key={theme}
            onClick={() => setActiveTheme(theme)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 border ${
                activeTheme === theme
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
            >
            {theme}
            </button>
        ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64 order-1 md:order-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-slate-400" />
            </div>
            <input
                type="text"
                placeholder="Search investors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
        </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-indigo-600" />
            Most Active Investors {activeTheme !== "All" && <span className="text-slate-400 text-sm font-normal">in {activeTheme}</span>}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {filteredInvestors.length === 0 
                ? "No investors found matching your criteria."
                : `Top 15 investors by deal volume ${activeTheme !== 'All' ? `with interests in ${activeTheme}` : 'in this dataset'}.`}
          </p>
          
          {topInvestors.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topInvestors} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={140} 
                      interval={0}
                      style={{ fontSize: '11px', fontWeight: 500 }} 
                      tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      content={<CustomTooltip />}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12}>
                      {topInvestors.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index < 3 ? '#4f46e5' : '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
          ) : (
              <div className="h-[320px] w-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                  <Filter size={24} className="mb-2 opacity-50" />
                  <p>No investors found matching {activeTheme !== 'All' ? `"${activeTheme}"` : ''} {searchTerm ? `and "${searchTerm}"` : ''}</p>
              </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  Investor Intelligence
              </h4>
              <p className="text-sm text-slate-300">
                  {filteredInvestors.length} investors {searchTerm || activeTheme !== 'All' ? 'matched' : 'analyzed'}.
              </p>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {featuredInvestors.map((inv) => (
                  <div 
                      key={inv.name} 
                      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${expandedInvestor === inv.name ? 'ring-2 ring-indigo-500/20' : 'hover:shadow-md'}`}
                  >
                      <div 
                          className="p-4 cursor-pointer"
                          onClick={() => toggleExpand(inv.name)}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <h5 className="font-semibold text-slate-800 text-sm">{inv.name}</h5>
                              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{inv.count} Deals</span>
                          </div>
                          <div className="flex justify-between items-end">
                              <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Top Interests</p>
                                  <div className="flex flex-wrap gap-1">
                                      {inv.topThemes.length > 0 ? (
                                          inv.topThemes.map(theme => (
                                              <span key={theme} className={`text-[10px] px-2 py-0.5 rounded-md border ${
                                                activeTheme === theme 
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-medium' 
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                              }`}>
                                                  {theme}
                                              </span>
                                          ))
                                      ) : (
                                          <span className="text-[10px] text-slate-400 italic">Generalist</span>
                                      )}
                                  </div>
                              </div>
                              {expandedInvestor === inv.name ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                          </div>
                      </div>
                      
                      {expandedInvestor === inv.name && (
                          <div className="px-4 pb-4 pt-0 border-t border-slate-50 animate-fadeIn">
                              
                              {/* Portfolio List with Legend */}
                              <InvestorPortfolioList portfolio={inv.portfolio} />

                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 mb-3 print:hidden">
                                  {!internalAnalyses[inv.name] && (
                                      <button
                                        onClick={(e) => handleInternalAnalysis(e, inv)}
                                        disabled={loadingInternal === inv.name}
                                        className="py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                                      >
                                          {loadingInternal === inv.name ? (
                                              <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                Analyzing...
                                              </>
                                          ) : (
                                              <>
                                                <BrainCircuit size={12} /> Internal Analytics
                                              </>
                                          )}
                                      </button>
                                  )}

                                  {!liveIntel[inv.name] && (
                                    <button 
                                        onClick={(e) => handleBackgroundCheck(e, inv.name)}
                                        disabled={loadingIntel === inv.name}
                                        className={`py-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${internalAnalyses[inv.name] ? 'col-span-2' : ''}`}
                                    >
                                        {loadingIntel === inv.name ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"/>
                                                Checking...
                                            </>
                                        ) : (
                                            <>
                                                <Globe size={12} /> Live Background Check
                                            </>
                                        )}
                                    </button>
                                  )}
                              </div>

                              {/* Internal Analysis Results */}
                              {internalAnalyses[inv.name] && (
                                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-3">
                                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                          <h5 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                              <BrainCircuit size={14} className="text-indigo-600" />
                                              Internal Portfolio Analysis
                                          </h5>
                                          <CopyButton 
                                            text={`Thesis: ${internalAnalyses[inv.name].investmentThesis}\nComposition: ${internalAnalyses[inv.name].portfolioComposition}\nFocus: ${internalAnalyses[inv.name].strategicFocus}`} 
                                          />
                                      </div>
                                      <div className="space-y-3">
                                          <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                              <h6 className="text-[10px] font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1"><Lightbulb size={10}/> Thesis</h6>
                                              <p className="text-xs text-slate-600 leading-relaxed">{internalAnalyses[inv.name].investmentThesis}</p>
                                          </div>
                                          <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                              <h6 className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1"><PieChart size={10}/> Diversity</h6>
                                              <p className="text-xs text-slate-600 leading-relaxed">{internalAnalyses[inv.name].portfolioComposition}</p>
                                          </div>
                                          <div className="bg-violet-50/50 p-2 rounded-lg border border-violet-100">
                                              <h6 className="text-[10px] font-bold text-violet-700 uppercase mb-1 flex items-center gap-1"><Award size={10}/> Strategic Focus</h6>
                                              <p className="text-xs text-slate-600 leading-relaxed">{internalAnalyses[inv.name].strategicFocus}</p>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* Live Intel Results */}
                              {liveIntel[inv.name] && (
                                  <div className="mt-3 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                            <Globe size={14} className="text-indigo-600" />
                                            Live Web Background
                                        </h5>
                                        <div className="flex gap-2 items-center">
                                             {/* Sources */}
                                            {liveIntel[inv.name].sources.length > 0 && (
                                                <div className="flex gap-1">
                                                    {liveIntel[inv.name].sources.slice(0, 2).map((source, idx) => (
                                                        <a 
                                                            key={idx} 
                                                            href={source.uri} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-[9px] text-indigo-500 hover:underline bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                                                        >
                                                            Source <ExternalLink size={8}/>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <CopyButton text={liveIntel[inv.name].markdown} />
                                        </div>
                                    </div>

                                    {/* Structured Analysis */}
                                    {(() => {
                                        const sections = parseInvestorMarkdown(liveIntel[inv.name].markdown);
                                        return (
                                            <div className="space-y-3">
                                                {sections.activity && (
                                                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                                        <h5 className="text-[10px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                                                            <Activity size={10}/> Recent Activity
                                                        </h5>
                                                        <MarkdownText content={sections.activity} />
                                                    </div>
                                                )}
                                                {sections.reputation && (
                                                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                                                        <h5 className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                                                            <Award size={10}/> Reputation
                                                        </h5>
                                                        <MarkdownText content={sections.reputation} />
                                                    </div>
                                                )}
                                                {sections.other.trim() && !sections.activity && !sections.reputation && (
                                                    <MarkdownText content={sections.other} />
                                                )}
                                            </div>
                                        );
                                    })()}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              ))}
              {filteredInvestors.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                      No matching investors found.
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};