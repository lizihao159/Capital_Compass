import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, { en: string; fr: string }> = {
  // Header & Actions
  'app_name': { en: 'Capital Compass', fr: 'Capital Compass' },
  'export_csv': { en: 'Export CSV', fr: 'Exporter CSV' },
  'start_over': { en: 'Start Over', fr: 'Recommencer' },
  'download_report': { en: 'Download Report', fr: 'Télécharger le Rapport' },
  
  // Empty State
  'start_analysis': { en: 'Start Your Analysis', fr: 'Commencez Votre Analyse' },
  'upload_instruction': { en: 'Upload your deal flow CSVs to unlock multidimensional scoring, trend analysis, and Gemini-powered investment summaries.', fr: 'Téléchargez vos fichiers CSV pour débloquer la notation multidimensionnelle, l\'analyse des tendances et les résumés d\'investissement par IA.' },
  'upload_datasets': { en: 'Upload Dataset(s)', fr: 'Télécharger les Données' },
  'drag_drop': { en: 'Drag and drop or click to select one or multiple CSV files', fr: 'Glissez-déposez ou cliquez pour sélectionner des fichiers' },
  'crunching': { en: 'Crunching the numbers...', fr: 'Analyse des chiffres en cours...' },

  // Stats
  'total_companies': { en: 'Total Companies', fr: 'Total des Entreprises' },
  'analyzed_batch': { en: 'Analyzed in this batch', fr: 'Analysées dans ce lot' },
  'median_score': { en: 'Median Quality Score', fr: 'Score Médian de Qualité' },
  'comprehensive_score': { en: 'Comprehensive Score (0-100)', fr: 'Score Global (0-100)' },
  'high_potential': { en: 'High Potential', fr: 'Haut Potentiel' },
  'potential_desc': { en: 'Companies with Potential > 80', fr: 'Entreprises avec Potentiel > 80' },
  'ai_saturation': { en: 'AI / ML Saturation', fr: 'Saturation IA / ML' },
  'companies_leveraging': { en: 'Companies leveraging AI', fr: 'Entreprises utilisant l\'IA' },

  // Charts & Maps
  'score_distribution': { en: 'Score Distribution', fr: 'Distribution des Scores' },
  'freq_analysis': { en: 'Frequency analysis by score category', fr: 'Analyse de fréquence par catégorie' },
  'innovation_landscape': { en: 'Canadian Innovation Landscape', fr: 'Paysage de l\'Innovation Canadien' },
  'companies_match': { en: 'companies match filters', fr: 'entreprises correspondent aux filtres' },
  'market_trends': { en: 'Market Trends', fr: 'Tendances du Marché' },
  'thematic_share': { en: 'Thematic market share', fr: 'Part de marché thématique' },
  'investor_analysis': { en: 'Investor Analysis', fr: 'Analyse des Investisseurs' },
  'most_active_investors': { en: 'Most Active Investors', fr: 'Investisseurs les Plus Actifs' },

  // Company List
  'company_rankings': { en: 'Company Rankings', fr: 'Classement des Entreprises' },
  'ordered_by': { en: 'Ordered by comprehensive potential score', fr: 'Classé par score de potentiel global' },
  'search_placeholder': { en: 'Search companies...', fr: 'Rechercher des entreprises...' },
  'col_rank': { en: 'Rank', fr: 'Rang' },
  'col_company': { en: 'Company', fr: 'Entreprise' },
  'col_comprehensive': { en: 'Comprehensive', fr: 'Global' },
  'col_potential': { en: 'Potential', fr: 'Potentiel' },
  'col_funding': { en: 'Funding', fr: 'Finance' },
  'col_ops': { en: 'Ops', fr: 'Ops' },
  'col_brand': { en: 'Brand', fr: 'Marque' },
  'showing': { en: 'Showing', fr: 'Affichage de' },
  'to': { en: 'to', fr: 'à' },
  'of': { en: 'of', fr: 'sur' },
  'entries': { en: 'entries', fr: 'entrées' },
  'rows': { en: 'Rows:', fr: 'Lignes :' },
  'go_to': { en: 'Go to:', fr: 'Aller à :' },
  'page': { en: 'Page', fr: 'Page' },
  'no_companies': { en: 'No companies found matching your search.', fr: 'Aucune entreprise trouvée.' },

  // Detail View
  'description': { en: 'Description', fr: 'Description' },
  'visit_website': { en: 'Visit Website', fr: 'Visiter le Site' },
  'prominent_backers': { en: 'Prominent Backers', fr: 'Investisseurs Importants' },
  'internal_memo': { en: 'Internal Memo', fr: 'Mémo Interne' },
  'generate_analysis': { en: 'Generate Analysis', fr: 'Générer l\'Analyse' },
  'analyzing': { en: 'Analyzing...', fr: 'Analyse...' },
  'live_market_pulse': { en: 'Live Market Pulse', fr: 'Pouls du Marché en Direct' },
  'search_web': { en: 'Search Web', fr: 'Rechercher' },
  'searching': { en: 'Searching...', fr: 'Recherche...' },
  'verdict': { en: 'Verdict', fr: 'Verdict' },
  'edge': { en: 'Edge', fr: 'Avantage' },
  'exec_summary': { en: 'Executive Summary', fr: 'Résumé Exécutif' },
  'latest_headlines': { en: 'Latest Headlines', fr: 'Derniers Titres' },
  'market_sentiment': { en: 'Market Sentiment', fr: 'Sentiment du Marché' },
  'key_voices': { en: 'Key Voices', fr: 'Voix Clés' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'fr' : 'en');
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
