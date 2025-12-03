import React, { useState, useMemo, useEffect } from 'react';
import { AnalysisState } from './types';
import { FileUpload } from './components/FileUpload';
import { TrendChart } from './components/TrendChart';
import { CompanyList } from './components/CompanyList';
import { InvestorAnalysis } from './components/InvestorAnalysis';
import { ScoreDistribution } from './components/ScoreDistribution';
import { CompanyMap } from './components/CompanyMap';
import { TableOfContents } from './components/TableOfContents';
import { LayoutGrid, BarChart3, TrendingUp, Users, RefreshCw, ArrowUp, Download, Globe } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

const StatCard = ({ title, value, subtext, icon: Icon }: { title: string, value: string, subtext: string, icon: any }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-slate-500">
            <Icon size={20} />
        </div>
    </div>
);

const App: React.FC = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const [data, setData] = useState<AnalysisState>({
    companies: [],
    trends: [],
    investors: [],
    isProcessing: false,
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDataLoaded = (filesContent: string[]) => {
    setData(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate async for UI responsiveness
    setTimeout(() => {
        import('./services/dataProcessing').then(module => {
            // Parse all files and flatten into a single array
            const allRawData = filesContent.flatMap(content => module.parseCSV(content));
            
            // Process the merged data
            const processed = module.processData(allRawData);
            
            setData({
                companies: processed.companies,
                trends: processed.trends,
                investors: processed.investors,
                isProcessing: false
            });
        });
    }, 100);
  };

  const handleReset = () => {
    setData({
      companies: [],
      trends: [],
      investors: [],
      isProcessing: false,
    });
  };

  const handleExportCSV = () => {
    import('./services/dataProcessing').then(module => {
        module.exportCompaniesToCSV(data.companies);
    });
  };

  const stats = useMemo(() => {
    if (!data.companies.length) return null;
    
    // Calculate Median Score
    const scores = data.companies.map(c => c.scores.comprehensive).sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    const medianScore = scores.length % 2 !== 0 
        ? scores[mid] 
        : (scores[mid - 1] + scores[mid]) / 2;

    const aiCount = data.companies.filter(c => c.themes.ai).length;
    const highPotential = data.companies.filter(c => c.scores.potential > 80).length;

    return {
        count: data.companies.length,
        medianScore: medianScore.toFixed(1),
        aiSaturation: ((aiCount / data.companies.length) * 100).toFixed(1),
        highPotential
    };
  }, [data.companies]);

  // Extract top 20 prominent investors
  const prominentInvestors = useMemo(() => {
    return data.investors.slice(0, 20).map(i => i.name);
  }, [data.investors]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <LayoutGrid className="text-white" size={20} />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('app_name')}</h1>
            </div>
            <div className="flex items-center space-x-4">
                {/* Language Switch */}
                <button 
                    onClick={toggleLanguage}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                    <Globe size={16} />
                    <span>{language === 'en' ? 'EN' : 'FR'}</span>
                </button>
                <div className="h-6 w-px bg-slate-200"></div>

                {data.companies.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            <Download size={16} />
                            <span>{t('export_csv')}</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <button 
                            onClick={handleReset}
                            className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw size={16} />
                            <span>{t('start_over')}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* Table of Contents - Only shown when data is loaded */}
      {data.companies.length > 0 && <TableOfContents />}

      <div id="report-container">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
            
            {data.companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-lg mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('start_analysis')}</h2>
                        <p className="text-slate-600 text-lg">{t('upload_instruction')}</p>
                    </div>
                    <FileUpload onDataLoaded={handleDataLoaded} />
                    {data.isProcessing && (
                        <div className="mt-8 flex items-center space-x-2 text-indigo-600 font-medium animate-pulse">
                            <span>{t('crunching')}</span>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    {stats && (
                        <div id="stats-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title={t('total_companies')}
                                value={stats.count.toString()} 
                                subtext={t('analyzed_batch')}
                                icon={Users}
                            />
                            <StatCard 
                                title={t('median_score')}
                                value={stats.medianScore} 
                                subtext={t('comprehensive_score')}
                                icon={BarChart3}
                            />
                            <StatCard 
                                title={t('high_potential')}
                                value={stats.highPotential.toString()} 
                                subtext={t('potential_desc')}
                                icon={TrendingUp}
                            />
                            <StatCard 
                                title={t('ai_saturation')}
                                value={`${stats.aiSaturation}%`} 
                                subtext={t('companies_leveraging')}
                                icon={LayoutGrid}
                            />
                        </div>
                    )}

                    {/* Stacked Layout for Visualizations */}
                    
                    {/* 1. Score Distribution (Full Width) */}
                    <div id="score-section" className="w-full h-[500px]">
                        <ScoreDistribution companies={data.companies} />
                    </div>

                    {/* 2. Company Map (Full Width) */}
                    <div id="map-section" className="w-full">
                        <CompanyMap companies={data.companies} />
                    </div>

                    {/* 3. Market Trends (Full Width) */}
                    <div id="trends-section" className="w-full">
                        <TrendChart data={data.trends} />
                    </div>
                    
                    {/* 4. Investor Analysis (Full Width) */}
                    {data.investors.length > 0 && (
                        <div id="investors-section" className="w-full">
                            <InvestorAnalysis investors={data.investors} />
                        </div>
                    )}

                    {/* Main Table */}
                    <div id="companies-section">
                        <CompanyList companies={data.companies} prominentInvestors={prominentInvestors} />
                    </div>
                </>
            )}
          </main>
      </div>

      {/* Floating Scroll to Top Button - Positioned higher to stack with ToC */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-[35vh] right-8 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 z-50 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 print:hidden"
          aria-label="Scroll to top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
};

export default App;