
export interface RawCompanyData {
  "Organization Name": string;
  "Organization Name URL"?: string;
  "Last Funding Type"?: string;
  "Full Description"?: string;
  "Description"?: string;
  "Headquarters Location"?: string;
  "CB Rank (Company)"?: string;
  "Number of Founders"?: string;
  "Number of Employees"?: string; // Often a range like "11-50"
  "Total Funding Amount"?: string;
  "Total Funding Amount Currency"?: string;
  "Total Funding Amount (in USD)"?: string;
  "Number of Funding Rounds"?: string;
  "Number of Articles"?: string;
  "Operating Status"?: string;
  "Founded Date"?: string;
  "Top 5 Investors"?: string;
  "Lead Investors"?: string;
  "Investors"?: string;
  "Acquired by"?: string;
  "Exit Date"?: string;
  "Closed Date"?: string;
  [key: string]: any;
}

export interface AcquisitionStatus {
  isAcquiredOrClosed: boolean;
  label: string;
  color: string;
}

export interface ScoredCompany extends RawCompanyData {
  id: string;
  scores: {
    funding: number; // 0-100
    operations: number; // 0-100
    brandTrend: number; // 0-100
    potential: number; // 0-100
    comprehensive: number; // 0-100
  };
  themes: {
    ai: boolean;
    climate: boolean;
    fintech: boolean;
    healthcare: boolean;
    saas: boolean;
    consumer: boolean;
  };
  acquisitionStatus?: AcquisitionStatus;
  summary?: string; // AI Generated summary
}

export interface ThemeTrend {
  year: number;
  AI: number;
  Climate: number;
  Fintech: number;
  Healthcare: number;
  SaaS: number;
  Consumer: number;
}

export interface PortfolioItem {
  name: string;
  themes: string[];
}

export interface InvestorStat {
  name: string;
  count: number;
  topThemes: string[];
  portfolio: PortfolioItem[];
}

export interface AnalysisState {
  companies: ScoredCompany[];
  trends: ThemeTrend[];
  investors: InvestorStat[];
  isProcessing: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LiveIntelResult {
  markdown: string;
  sources: GroundingSource[];
}
