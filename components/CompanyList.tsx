import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ScoredCompany, LiveIntelResult } from '../types';
import { Sparkles, ExternalLink, ChevronDown, ChevronUp, Search, ArrowUpDown, ArrowUp, ArrowDown, Target, Shield, BrainCircuit, Gem, Globe, Newspaper, MessageSquareQuote, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, TrendingUp, TrendingDown, Minus, Megaphone, Activity, Copy, Check } from 'lucide-react';
import { generateInvestmentAnalysis, generateLiveIntelligence, CompanyAnalysis } from '../services/geminiService';
import { extractInvestors } from '../services/dataProcessing';
import { useLanguage } from '../contexts/LanguageContext';

interface CompanyListProps {
  companies: ScoredCompany[];
  prominentInvestors: string[];
}

type SortKey = 'rank' | 'name' | 'comprehensive' | 'potential' | 'funding' | 'operations' | 'brand';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface TooltipData {
    value: number;
    category: string;
    allScores: number[];
    x: number;
    y: number;
}

const ScoreComparisonTooltip = ({ data }: { data: TooltipData }) => {
    const { value, category, allScores } = data;

    const stats = useMemo(() => {
        const sum = allScores.reduce((a, b) => a + b, 0);
        const avg = sum / allScores.length;
        const countLower = allScores.filter(s => s < value).length;
        const percentile = (countLower / allScores.length) * 100;
        const diff = value - avg;
        
        return { avg, percentile, diff };
    }, [value, allScores]);

    return (
        <div 
            className="fixed z-50 bg-white p-4 rounded-xl shadow-xl border border-slate-200 w-64 animate-fadeIn"
            style={{ 
                left: Math.min(data.x, window.innerWidth - 270), // Prevent overflow right
                top: data.y + 20 
            }}
        >
            <div className="flex justify-between items-start mb-2">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{category} Performance</h5>
            </div>
            
            <div className="mb-4">
                <div className="flex items-end gap-2 mb-1">
                    <span className="text-2xl font-bold text-slate-800">{value.toFixed(0)}</span>
                    <span className="text-xs text-slate-400 mb-1">/ 100</span>
                </div>
                
                {/* Comparison Badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    stats.diff > 0 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : stats.diff < 0 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-slate-100 text-slate-600'
                }`}>
                    {stats.diff > 0 ? <TrendingUp size={10} /> : stats.diff < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                    {stats.diff > 0 ? 'Above Avg' : stats.diff < 0 ? 'Below Avg' : 'Average'}
                </div>
            </div>

            <div className="space-y-3">
                {/* Percentile Bar */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Beats {stats.percentile.toFixed(0)}% of dataset</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${value > stats.avg ? 'bg-indigo-500' : 'bg-slate-400'}`} 
                            style={{ width: `${stats.percentile}%` }}
                        />
                    </div>
                </div>

                {/* Average Stat */}
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Category Average</span>
                    <span className="font-semibold text-slate-700">{stats.avg.toFixed(1)}</span>
                </div>
            </div>
            
            {/* Arrow */}
            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-t border-l border-slate-200 transform rotate-45" />
        </div>
    );
};

const ScoreBadge = ({ value, label, showLabel = true, variant = 'colored' }: { value: number, label: string, showLabel?: boolean, variant?: 'colored' | 'neutral' }) => {
  let color = "bg-slate-50 text-slate-600 border-slate-200";
  
  if (variant === 'colored') {
    // Professional / Convincing Financial Color Scale
    if (value >= 90) color = "bg-emerald-50 text-emerald-800 border-emerald-200";
    else if (value >= 80) color = "bg-teal-50 text-teal-800 border-teal-200";
    else if (value >= 70) color = "bg-blue-50 text-blue-800 border-blue-200";
    else if (value >= 60) color = "bg-indigo-50 text-indigo-800 border-indigo-200";
    else if (value >= 50) color = "bg-slate-50 text-slate-700 border-slate-200";
    else color = "bg-gray-50 text-gray-600 border-gray-200";
  } else {
    // Neutral variant
    color = "bg-white text-slate-700 border-slate-200";
  }
  
  return (
    <div className="flex flex-col items-center">
        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${color} min-w-[3rem] text-center shadow-sm`}>
            {value.toFixed(0)}
        </span>
        {showLabel && <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{label}</span>}
    </div>
  );
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
const parseLiveIntelMarkdown = (markdown: string) => {
    const sections: Record<string, string> = {
        headlines: "",
        sentiment: "",
        voices: "",
        other: ""
    };

    const parts = markdown.split('## ');
    
    parts.forEach(part => {
        if (part.startsWith('Latest Headlines')) {
            sections.headlines = part.replace('Latest Headlines', '').trim();
        } else if (part.startsWith('Market Sentiment')) {
            sections.sentiment = part.replace('Market Sentiment', '').trim();
        } else if (part.startsWith('Key Voices')) {
            sections.voices = part.replace('Key Voices', '').trim();
        } else if (part.trim().length > 0) {
            sections.other += part + "\n";
        }
    });

    return sections;
};

// Simple Markdown Renderer
const MarkdownText = ({ content }: { content: string }) => {
    return (
        <div className="prose prose-sm max-w-none text-slate-600 text-xs">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 list-disc marker:text-indigo-400 mb-1">{line.replace('- ', '')}</li>;
                }
                if (line.trim().length === 0) {
                    return <br key={i} />;
                }
                return <p key={i} className="mb-1">{line}</p>;
            })}
        </div>
    );
};

// Collapsible Sources List
const SourcesList = ({ sources }: { sources: { title: string, uri: string }[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (sources.length === 0) return null;

    return (
        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-600"
            >
                <div className="flex items-center gap-2">
                    <Newspaper size={12} className="text-indigo-500" />
                    <span>Verified Sources ({sources.length})</span>
                </div>
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            
            {isOpen && (
                <div className="bg-white p-2 border-t border-slate-200 flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {sources.map((source, idx) => {
                        let hostname = "";
                        try {
                            hostname = new URL(source.uri).hostname.replace('www.', '');
                        } catch (e) { hostname = "Source Link"; }

                        return (
                            <a 
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-1.5 hover:bg-indigo-50 rounded group transition-colors"
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs text-slate-700 font-medium truncate group-hover:text-indigo-700">{source.title}</span>
                                    <span className="text-[10px] text-slate-400 truncate">{hostname}</span>
                                </div>
                                <ExternalLink size={10} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0 ml-2" />
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const CompanyList: React.FC<CompanyListProps> = ({ companies, prominentInvestors }) => {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Internal Analysis State
  const [analyses, setAnalyses] = useState<Record<string, CompanyAnalysis>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  // Live Intel State
  const [liveIntel, setLiveIntel] = useState<Record<string, LiveIntelResult>>({});
  const [loadingIntel, setLoadingIntel] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Tooltip Logic
  const [activeTooltip, setActiveTooltip] = useState<TooltipData | null>(null);
  const hoverTimer = useRef<number | null>(null);

  // Precompute score stats for tooltips
  const scoreStats = useMemo(() => {
    return {
        comprehensive: companies.map(c => c.scores.comprehensive),
        potential: companies.map(c => c.scores.potential),
        funding: companies.map(c => c.scores.funding),
        operations: companies.map(c => c.scores.operations),
        brandTrend: companies.map(c => c.scores.brandTrend),
    };
  }, [companies]);

  const handleScoreEnter = (e: React.MouseEvent, value: number, category: keyof typeof scoreStats, label: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Clear existing timer if moving fast between scores
    if (hoverTimer.current) clearTimeout(hoverTimer.current);

    // Set delay
    hoverTimer.current = window.setTimeout(() => {
        setActiveTooltip({
            value,
            category: label,
            allScores: scoreStats[category],
            x: rect.left,
            y: rect.bottom
        });
    }, 1000); // 1 second delay
  };

  const handleScoreLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setActiveTooltip(null);
  };

  // Add original rank to companies before processing
  const companiesWithRank = useMemo(() => {
    return companies.map((c, i) => ({ ...c, originalRank: i + 1 }));
  }, [companies]);

  const filteredAndSortedCompanies = useMemo(() => {
    // 1. Filter
    let result = companiesWithRank.filter(c => 
      c["Organization Name"].toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c["Description"] || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c["Full Description"] || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'name':
          aValue = a["Organization Name"];
          bValue = b["Organization Name"];
          break;
        case 'comprehensive':
          aValue = a.scores.comprehensive;
          bValue = b.scores.comprehensive;
          break;
        case 'potential':
          aValue = a.scores.potential;
          bValue = b.scores.potential;
          break;
        case 'funding':
          aValue = a.scores.funding;
          bValue = b.scores.funding;
          break;
        case 'operations':
          aValue = a.scores.operations;
          bValue = b.scores.operations;
          break;
        case 'brand':
          aValue = a.scores.brandTrend;
          bValue = b.scores.brandTrend;
          break;
        case 'rank':
        default:
          aValue = a.originalRank;
          bValue = b.originalRank;
          break;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companiesWithRank, searchTerm, sortConfig]);

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companies]); // Also reset if dataset changes

  // Pagination Logic
  const effectiveItemsPerPage = itemsPerPage;
  const totalPages = effectiveItemsPerPage === -1 ? 1 : Math.ceil(filteredAndSortedCompanies.length / effectiveItemsPerPage);
  
  const paginatedCompanies = useMemo(() => {
    if (effectiveItemsPerPage === -1) return filteredAndSortedCompanies;
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    return filteredAndSortedCompanies.slice(startIndex, startIndex + effectiveItemsPerPage);
  }, [filteredAndSortedCompanies, currentPage, effectiveItemsPerPage]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGenerateAnalysis = async (company: ScoredCompany) => {
    setLoadingAnalysis(company.id);
    const analysis = await generateInvestmentAnalysis(company);
    setAnalyses(prev => ({ ...prev, [company.id]: analysis }));
    setLoadingAnalysis(null);
  };

  const handleLiveIntel = async (company: ScoredCompany) => {
    setLoadingIntel(company.id);
    const result = await generateLiveIntelligence(company["Organization Name"], "company");
    setLiveIntel(prev => ({ ...prev, [company.id]: result }));
    setLoadingIntel(null);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-indigo-600" />
      : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  const HeaderCell = ({ label, sortKey, align = "left", hiddenOnMobile = false }: { label: string, sortKey: SortKey, align?: "left" | "center" | "right", hiddenOnMobile?: boolean }) => (
    <th className={`p-4 font-medium cursor-pointer hover:bg-slate-100 transition-colors select-none ${hiddenOnMobile ? 'hidden md:table-cell' : ''}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}>
        {label}
        {/* Hide sort icon during print for cleaner look */}
        <div className="print:hidden"><SortIcon columnKey={sortKey} /></div>
      </div>
    </th>
  );

  const getCompanyProminentBackers = (company: ScoredCompany) => {
    const investors = extractInvestors(company);
    return investors.filter(inv => prominentInvestors.includes(inv));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Tooltip Overlay */}
      {activeTooltip && <div className="print:hidden"><ScoreComparisonTooltip data={activeTooltip} /></div>}

      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{t('company_rankings')}</h3>
          <p className="text-sm text-slate-500">{t('ordered_by')}</p>
        </div>
        {/* Hide Search Bar during Print */}
        <div className="relative w-full md:w-72 print:hidden">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-indigo-400" />
        </div>
        <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
        />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <HeaderCell label={t('col_rank')} sortKey="rank" />
              <HeaderCell label={t('col_company')} sortKey="name" />
              <HeaderCell label={t('col_comprehensive')} sortKey="comprehensive" align="center" />
              <HeaderCell label={t('col_potential')} sortKey="potential" align="center" />
              <HeaderCell label={t('col_funding')} sortKey="funding" align="center" />
              <HeaderCell label={t('col_ops')} sortKey="operations" align="center" hiddenOnMobile />
              <HeaderCell label={t('col_brand')} sortKey="brand" align="center" hiddenOnMobile />
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {paginatedCompanies.map((company) => {
                const backers = getCompanyProminentBackers(company);
                
                return (
              <React.Fragment key={company.id}>
                <tr className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => toggleExpand(company.id)}>
                  <td className="p-4 font-bold text-slate-400">#{company.originalRank}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{company["Organization Name"]}</div>
                        {company.acquisitionStatus?.isAcquiredOrClosed && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${company.acquisitionStatus.color}`}>
                                {company.acquisitionStatus.label}
                            </span>
                        )}
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                          {company["Headquarters Location"] || "Unknown Location"}
                        </div>
                    </div>
                  </td>
                  {/* Scores with Hover Listeners */}
                  <td className="p-4 text-center">
                    <div 
                        onMouseEnter={(e) => handleScoreEnter(e, company.scores.comprehensive, 'comprehensive', 'Comprehensive Score')}
                        onMouseLeave={handleScoreLeave}
                        className="inline-block"
                    >
                        <ScoreBadge value={company.scores.comprehensive} label="Total" variant="colored" />
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span 
                        onMouseEnter={(e) => handleScoreEnter(e, company.scores.potential, 'potential', 'Potential Score')}
                        onMouseLeave={handleScoreLeave}
                        className="font-medium text-slate-700 inline-block px-2 py-1 hover:bg-slate-100 rounded cursor-help"
                    >
                        {company.scores.potential.toFixed(0)}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-600">
                      <span 
                        onMouseEnter={(e) => handleScoreEnter(e, company.scores.funding, 'funding', 'Funding Score')}
                        onMouseLeave={handleScoreLeave}
                        className="inline-block px-2 py-1 hover:bg-slate-100 rounded cursor-help"
                      >
                          {company.scores.funding.toFixed(0)}
                      </span>
                  </td>
                  <td className="p-4 text-center hidden md:table-cell text-slate-600">
                    <span 
                        onMouseEnter={(e) => handleScoreEnter(e, company.scores.operations, 'operations', 'Operations Score')}
                        onMouseLeave={handleScoreLeave}
                        className="inline-block px-2 py-1 hover:bg-slate-100 rounded cursor-help"
                      >
                        {company.scores.operations.toFixed(0)}
                    </span>
                  </td>
                  <td className="p-4 text-center hidden md:table-cell text-slate-600">
                    <span 
                        onMouseEnter={(e) => handleScoreEnter(e, company.scores.brandTrend, 'brandTrend', 'Brand Score')}
                        onMouseLeave={handleScoreLeave}
                        className="inline-block px-2 py-1 hover:bg-slate-100 rounded cursor-help"
                    >
                        {company.scores.brandTrend.toFixed(0)}
                    </span>
                  </td>
                  <td className="p-4 text-right text-slate-400">
                     {/* Hide expand icon during print */}
                     <div className="print:hidden">
                        {expandedId === company.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                     </div>
                  </td>
                </tr>
                {(expandedId === company.id) && (
                    <tr className="bg-slate-50">
                        <td colSpan={8} className="p-6">
                            <div className="space-y-6">
                                {/* Basic Info & Tags */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('description')}</h4>
                                            <p className="text-slate-700 leading-relaxed max-w-4xl">
                                                {company["Full Description"] || company["Description"] || "No description available."}
                                            </p>
                                        </div>
                                        {company["Organization Name URL"] && (
                                            <a href={company["Organization Name URL"]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors print:hidden">
                                                {t('visit_website')} <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {company.themes.ai && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">AI / ML</span>}
                                        {company.themes.climate && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Climate / Energy</span>}
                                        {company.themes.fintech && <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Fintech</span>}
                                        {company.themes.healthcare && <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full font-medium">Healthcare</span>}
                                        {company.themes.saas && <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full font-medium">SaaS</span>}
                                        {company.themes.consumer && <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">Consumer</span>}
                                        <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded-full font-medium">{company["Last Funding Type"] || "Unknown Stage"}</span>
                                    </div>
                                    
                                    {/* Prominent Backers Section */}
                                    {backers.length > 0 && (
                                        <div className="flex items-start gap-3 mt-2">
                                            <div className="mt-0.5">
                                                <div className="p-1 bg-indigo-100 text-indigo-600 rounded">
                                                    <Gem size={14} />
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('prominent_backers')}</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {backers.map(investor => (
                                                        <span key={investor} className="px-2 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">
                                                            {investor}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reports Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                                    {/* 1. Internal AI Analysis */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                <BrainCircuit size={18} className="text-indigo-600" /> 
                                                {t('internal_memo')}
                                            </h4>
                                            
                                            <div className="flex items-center gap-2">
                                                {/* Copy Button for Analysis */}
                                                {analyses[company.id] && (
                                                    <CopyButton 
                                                        text={`Executive Summary:\n${analyses[company.id].executiveSummary}\n\nVerdict:\n${analyses[company.id].investmentVerdict}\n\nEdge:\n${analyses[company.id].competitiveEdge}`} 
                                                    />
                                                )}

                                                {!analyses[company.id] && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateAnalysis(company); }}
                                                        disabled={loadingAnalysis === company.id}
                                                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2 print:hidden"
                                                    >
                                                        {loadingAnalysis === company.id ? t('analyzing') : t('generate_analysis')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {analyses[company.id] ? (
                                            <div className="space-y-4">
                                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                    <h5 className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1"><Sparkles size={12}/> {t('exec_summary')}</h5>
                                                    <p className="text-sm text-slate-700">{analyses[company.id].executiveSummary}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                        <h5 className="text-xs font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1"><Target size={12}/> {t('verdict')}</h5>
                                                        <p className="text-sm text-slate-700">{analyses[company.id].investmentVerdict}</p>
                                                    </div>
                                                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                                        <h5 className="text-xs font-bold text-amber-700 uppercase mb-1 flex items-center gap-1"><Shield size={12}/> {t('edge')}</h5>
                                                        <p className="text-sm text-slate-700">{analyses[company.id].competitiveEdge}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-sm">
                                                Generate an internal memo based on CSV data.
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Live Market Intelligence */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                        {/* Background Decoration */}
                                        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                            <Globe size={100} />
                                        </div>
                                        
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
                                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                                <Globe size={18} className="text-indigo-600" /> 
                                                {t('live_market_pulse')}
                                            </h4>

                                            <div className="flex items-center gap-2">
                                                {/* Copy Button for Live Intel */}
                                                {liveIntel[company.id] && (
                                                    <CopyButton text={liveIntel[company.id].markdown} />
                                                )}

                                                {!liveIntel[company.id] && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleLiveIntel(company); }}
                                                        disabled={loadingIntel === company.id}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm print:hidden"
                                                    >
                                                        {loadingIntel === company.id ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                                {t('searching')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Search size={12} /> {t('search_web')}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {liveIntel[company.id] ? (
                                            <div className="space-y-4 relative z-10">
                                                {/* News Ticker / Headlines */}
                                                <SourcesList sources={liveIntel[company.id].sources} />

                                                {/* Structured Cards Logic */}
                                                {(() => {
                                                    const sections = parseLiveIntelMarkdown(liveIntel[company.id].markdown);
                                                    return (
                                                        <div className="space-y-4">
                                                            {/* Headlines Card */}
                                                            {sections.headlines && (
                                                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                                                    <h5 className="text-xs font-bold text-indigo-700 uppercase mb-2 flex items-center gap-1">
                                                                        <Megaphone size={12}/> {t('latest_headlines')}
                                                                    </h5>
                                                                    <MarkdownText content={sections.headlines} />
                                                                </div>
                                                            )}
                                                            
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {/* Sentiment Card */}
                                                                {sections.sentiment && (
                                                                    <div className="bg-violet-50/50 p-3 rounded-lg border border-violet-100">
                                                                        <h5 className="text-xs font-bold text-violet-700 uppercase mb-2 flex items-center gap-1">
                                                                            <Activity size={12}/> {t('market_sentiment')}
                                                                        </h5>
                                                                        <MarkdownText content={sections.sentiment} />
                                                                    </div>
                                                                )}
                                                                {/* Voices Card */}
                                                                {sections.voices && (
                                                                    <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                                                                        <h5 className="text-xs font-bold text-rose-700 uppercase mb-2 flex items-center gap-1">
                                                                            <MessageSquareQuote size={12}/> {t('key_voices')}
                                                                        </h5>
                                                                        <MarkdownText content={sections.voices} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Fallback for unparsed content */}
                                                            {sections.other.trim() && !sections.headlines && !sections.sentiment && (
                                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                                    <MarkdownText content={sections.other} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 text-sm">
                                                Search the live web for recent news, user reviews, and sentiment.
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </td>
                    </tr>
                )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
        {filteredAndSortedCompanies.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                {searchTerm ? t('no_companies') : "No companies loaded yet."}
            </div>
        )}
      </div>

      {/* Pagination Controls - Hide during Print */}
      {filteredAndSortedCompanies.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              {/* Left: Info */}
              <div className="text-xs text-slate-500 font-medium">
                 {t('showing')} {itemsPerPage === -1 ? 1 : (currentPage - 1) * itemsPerPage + 1} {t('to')} {itemsPerPage === -1 ? filteredAndSortedCompanies.length : Math.min(currentPage * itemsPerPage, filteredAndSortedCompanies.length)} {t('of')} {filteredAndSortedCompanies.length} {t('entries')}
              </div>
              
              {/* Center: Pagination Buttons */}
              <div className="flex items-center space-x-1">
                 <button 
                    onClick={() => handlePageChange(1)} 
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                    <ChevronsLeft size={16} />
                 </button>
                 <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                    <ChevronLeft size={16} />
                 </button>

                 <span className="mx-2 text-xs font-medium text-slate-600">
                    {t('page')} <span className="text-slate-900">{currentPage}</span> {t('of')} {totalPages}
                 </span>

                 <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                    <ChevronRight size={16} />
                 </button>
                 <button 
                    onClick={() => handlePageChange(totalPages)} 
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                    <ChevronsRight size={16} />
                 </button>
              </div>

              {/* Right: Rows selection & Jump */}
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{t('rows')}</span>
                      <select 
                        value={itemsPerPage} 
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="text-xs border-slate-200 rounded bg-white py-1 px-2 text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={-1}>All</option>
                      </select>
                  </div>

                  <div className="flex items-center gap-2">
                       <span className="text-xs text-slate-500">{t('go_to')}</span>
                       <input 
                          type="number" 
                          min={1} 
                          max={totalPages}
                          placeholder="#"
                          className="w-12 text-xs border-slate-200 rounded bg-white py-1 px-2 text-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                          onKeyDown={(e) => {
                              if(e.key === 'Enter') {
                                  const val = parseInt(e.currentTarget.value);
                                  if (!isNaN(val)) handlePageChange(val);
                              }
                          }}
                       />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};