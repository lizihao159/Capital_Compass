import React from 'react';
import { List, PieChart, BarChart3, MapPin, TrendingUp, Users, Table, LayoutGrid } from 'lucide-react';

export const TableOfContents: React.FC = () => {
  const sections = [
    { id: 'stats-section', label: 'Key Statistics', icon: Users },
    { id: 'score-section', label: 'Score Distribution', icon: BarChart3 },
    { id: 'map-section', label: 'Innovation Map', icon: MapPin },
    { id: 'trends-section', label: 'Market Trends', icon: TrendingUp },
    { id: 'investors-section', label: 'Investor Analysis', icon: PieChart },
    { id: 'companies-section', label: 'Company Rankings', icon: Table },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Height of sticky header + padding
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fixed bottom-[45vh] right-8 z-40 flex flex-col-reverse items-end gap-4 print:hidden group">
      {/* Trigger Button */}
      <button 
        className="p-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        aria-label="Table of Contents"
      >
        <List size={24} />
      </button>

      {/* Menu */}
      <nav className="bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[200px] transform scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 origin-bottom-right absolute bottom-14 right-0 mb-2">
         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 border-b border-slate-100 mb-1">
             Quick Navigation
         </div>
         <div className="flex flex-col gap-1">
            {sections.map((section) => (
                <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left w-full"
                >
                    <section.icon size={14} className="opacity-70" />
                    {section.label}
                </button>
            ))}
         </div>
      </nav>
    </div>
  );
};