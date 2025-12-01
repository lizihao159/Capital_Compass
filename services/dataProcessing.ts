
import { RawCompanyData, ScoredCompany, ThemeTrend, InvestorStat, AcquisitionStatus, PortfolioItem } from '../types';

// Helper to parse CSV string
export const parseCSV = (text: string): RawCompanyData[] => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data: RawCompanyData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row: string[] = [];
    let inQuote = false;
    let currentCell = '';
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        row.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim().replace(/^"|"$/g, ''));

    if (row.length === headers.length) {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx];
      });
      data.push(obj);
    }
  }
  return data;
};

// Helper: Convert "11-50" to median number
const parseEmployeeCount = (range: string | undefined): number => {
  if (!range) return 0;
  if (range.includes('+')) return parseInt(range) + 10; // e.g. 1000+
  if (range.includes('-')) {
    const [min, max] = range.split('-').map(s => parseInt(s.replace(/,/g, '')));
    return (min + max) / 2;
  }
  return parseInt(range) || 0;
};

// Helper: Normalize value 0-1
const normalize = (val: number, min: number, max: number) => {
  if (max === min) return 0;
  return (val - min) / (max - min);
};

// Helper: Extract unique investors from comma-separated string
export const extractInvestors = (row: RawCompanyData): string[] => {
  const rawList = [
    row["Top 5 Investors"],
    row["Lead Investors"],
    row["Investors"]
  ].filter(Boolean).join(',');

  return [...new Set(
    rawList.split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(s => s.length > 2 && !s.toLowerCase().includes('undisclosed'))
  )];
};

const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    // Format: MM/YYYY
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${month}/${d.getFullYear()}`;
};

// Main Scoring Engine
export const processData = (rawData: RawCompanyData[]): { companies: ScoredCompany[], trends: ThemeTrend[], investors: InvestorStat[] } => {
  // 1. Extract raw numericals for normalization
  const fundingAmounts: number[] = [];
  const articleCounts: number[] = [];
  const ranks: number[] = [];
  const rounds: number[] = [];

  const processedTemp = rawData.map(c => {
    const fundAmt = parseFloat(c["Total Funding Amount (in USD)"] || "0");
    const numArticles = parseInt(c["Number of Articles"] || "0");
    const rank = parseInt((c["CB Rank (Company)"] || "100000").replace(/,/g, ''));
    const numRounds = parseInt(c["Number of Funding Rounds"] || "1");
    
    fundingAmounts.push(fundAmt);
    articleCounts.push(numArticles);
    ranks.push(rank);
    rounds.push(numRounds);

    return { ...c, _fundAmt: fundAmt, _articles: numArticles, _rank: rank, _rounds: numRounds };
  });

  const maxFund = Math.max(...fundingAmounts, 1);
  const minFund = Math.min(...fundingAmounts, 0);
  
  const maxArticles = Math.max(...articleCounts, 1);
  const maxRounds = Math.max(...rounds, 1);
  const minRank = Math.min(...ranks, 1);
  const maxRank = Math.max(...ranks, 100000);

  // 2. Score Each Company & Theme Detection
  const scored = processedTemp.map((c, idx) => {
    // --- Text Analysis ---
    const text = ((c["Description"] || "") + " " + (c["Full Description"] || "")).toLowerCase();
    
    const isAI = /ai\b|artificial intelligence|machine learning|deep learning|llm|nlp|genai|neural network|gpt|computer vision/.test(text);
    const isClimate = /climate|carbon|emission|renewable|solar|battery|sustainable|energy|clean tech|green|environment|wind|hydro/.test(text);
    const isFintech = /fintech|payment|lending|banking|crypto|wallet|neobank|insurance|wealth|trading|blockchain|defi/.test(text);
    const isHealthcare = /biotech|health|pharma|medical|therapeutics|biology|patient|doctor|care|clinic|drug|genomic|life science/.test(text);
    const isSaaS = /enterprise|saas|b2b|software|cloud|automation|workflow|productivity|crm|erp|platform|infrastructure|api/.test(text);
    const isConsumer = /b2c|consumer|retail|e-commerce|social|app|marketplace|brand|fashion|food|d2c|subscription|media/.test(text);

    // --- Funding Score ---
    const normAmt = normalize(c._fundAmt, minFund, maxFund);
    const normRounds = normalize(c._rounds, 0, maxRounds);
    const fundingScore = ((normAmt * 0.7) + (normRounds * 0.3)) * 100;

    // --- Operations Score ---
    const employeeMedian = parseEmployeeCount(c["Number of Employees"]);
    const normEmp = Math.min(employeeMedian, 500) / 500; 
    const isActive = (c["Operating Status"] || "Active") === "Active" ? 1 : 0;
    const opsScore = ((normEmp * 0.6) + (isActive * 0.4)) * 100;

    // --- Brand / Trend Score ---
    const normRank = 1 - normalize(c._rank, minRank, maxRank); // Lower rank is better
    const normArticles = normalize(c._articles, 0, maxArticles);
    // Bonus for hitting any theme
    const keywordBonus = (isAI || isClimate || isFintech || isHealthcare || isSaaS || isConsumer) ? 0.2 : 0;
    const brandTrendScore = Math.min(((normRank * 0.5) + (normArticles * 0.3) + keywordBonus), 1) * 100;

    // --- High Potential Score ---
    const stage = (c["Last Funding Type"] || "").toLowerCase();
    let stageScore = 0.3; 
    if (stage.includes("series a")) stageScore = 0.7;
    if (stage.includes("series b") || stage.includes("series c")) stageScore = 0.9;
    if (stage.includes("ipo") || stage.includes("acquired")) stageScore = 0.5; 
    
    const potentialScore = ((stageScore * 0.4) + (fundingScore/100 * 0.3) + (brandTrendScore/100 * 0.3)) * 100;

    // --- Comprehensive Score ---
    const comprehensive = (fundingScore + opsScore + brandTrendScore + potentialScore) / 4;

    // --- Acquisition/Closure Check ---
    const opStatus = (c["Operating Status"] || "").toLowerCase();
    const acquiredBy = c["Acquired by"];
    const exitDate = c["Exit Date"];
    const closedDate = c["Closed Date"];

    let acquisitionStatus: AcquisitionStatus | undefined = undefined;

    if (opStatus === 'closed') {
         const datePart = formatDate(closedDate);
         acquisitionStatus = {
            isAcquiredOrClosed: true,
            label: `Closed ${datePart}`.trim(),
            color: "bg-rose-100 text-rose-700 border-rose-200"
         };
    } else if (opStatus === 'acquired' || (acquiredBy && acquiredBy.length > 1)) {
         const datePart = formatDate(exitDate);
         const byPart = acquiredBy ? ` by ${acquiredBy}` : "";
         acquisitionStatus = {
            isAcquiredOrClosed: true,
            label: `Acquired${byPart} ${datePart}`.trim(),
            color: "bg-purple-100 text-purple-700 border-purple-200"
         };
    }

    return {
      ...c,
      id: `comp-${idx}`,
      scores: {
        funding: fundingScore,
        operations: opsScore,
        brandTrend: brandTrendScore,
        potential: potentialScore,
        comprehensive: comprehensive
      },
      themes: {
        ai: isAI,
        climate: isClimate,
        fintech: isFintech,
        healthcare: isHealthcare,
        saas: isSaaS,
        consumer: isConsumer
      },
      acquisitionStatus
    } as ScoredCompany;
  });

  // 3. Trend Analysis (Aggregated by Year)
  const trendsMap = new Map<number, {AI: number, Climate: number, Fintech: number, Healthcare: number, SaaS: number, Consumer: number, count: number}>();

  scored.forEach(c => {
    let year = 0;
    if (c["Founded Date"]) {
        const d = new Date(c["Founded Date"]);
        if (!isNaN(d.getFullYear())) year = d.getFullYear();
    }
    
    if (year > 1990 && year <= new Date().getFullYear()) {
      if (!trendsMap.has(year)) {
        trendsMap.set(year, { AI: 0, Climate: 0, Fintech: 0, Healthcare: 0, SaaS: 0, Consumer: 0, count: 0 });
      }
      const entry = trendsMap.get(year)!;
      entry.count++;
      if (c.themes.ai) entry.AI++;
      if (c.themes.climate) entry.Climate++;
      if (c.themes.fintech) entry.Fintech++;
      if (c.themes.healthcare) entry.Healthcare++;
      if (c.themes.saas) entry.SaaS++;
      if (c.themes.consumer) entry.Consumer++;
    }
  });

  const trends: ThemeTrend[] = Array.from(trendsMap.entries())
    .map(([year, data]) => ({
      year,
      AI: parseFloat(((data.AI / data.count) * 100).toFixed(1)),
      Climate: parseFloat(((data.Climate / data.count) * 100).toFixed(1)),
      Fintech: parseFloat(((data.Fintech / data.count) * 100).toFixed(1)),
      Healthcare: parseFloat(((data.Healthcare / data.count) * 100).toFixed(1)),
      SaaS: parseFloat(((data.SaaS / data.count) * 100).toFixed(1)),
      Consumer: parseFloat(((data.Consumer / data.count) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.year - b.year);

  // 4. Investor Analysis
  const investorMap = new Map<string, { count: number, themeCounts: Record<string, number>, portfolio: Map<string, string[]> }>();

  scored.forEach(c => {
    const invs = extractInvestors(c);
    
    // Determine active themes for this company
    const activeThemes: string[] = [];
    if (c.themes.ai) activeThemes.push('AI');
    if (c.themes.climate) activeThemes.push('Climate');
    if (c.themes.fintech) activeThemes.push('Fintech');
    if (c.themes.healthcare) activeThemes.push('Healthcare');
    if (c.themes.saas) activeThemes.push('SaaS');
    if (c.themes.consumer) activeThemes.push('Consumer');

    invs.forEach(invName => {
      if (!investorMap.has(invName)) {
        investorMap.set(invName, { 
            count: 0, 
            themeCounts: { AI: 0, Climate: 0, Fintech: 0, Healthcare: 0, SaaS: 0, Consumer: 0 }, 
            portfolio: new Map() 
        });
      }
      const entry = investorMap.get(invName)!;
      entry.count++;
      entry.portfolio.set(c["Organization Name"], activeThemes);
      
      if (c.themes.ai) entry.themeCounts.AI++;
      if (c.themes.climate) entry.themeCounts.Climate++;
      if (c.themes.fintech) entry.themeCounts.Fintech++;
      if (c.themes.healthcare) entry.themeCounts.Healthcare++;
      if (c.themes.saas) entry.themeCounts.SaaS++;
      if (c.themes.consumer) entry.themeCounts.Consumer++;
    });
  });

  const investors: InvestorStat[] = Array.from(investorMap.entries())
    .map(([name, data]) => {
      // Find top themes
      const sortedThemes = Object.entries(data.themeCounts)
        .sort((a, b) => b[1] - a[1])
        .filter(t => t[1] > 0)
        .slice(0, 3)
        .map(t => t[0]);
      
      // Convert portfolio map to array
      const portfolioItems: PortfolioItem[] = Array.from(data.portfolio.entries())
        .map(([cName, cThemes]) => ({ name: cName, themes: cThemes }));

      return {
        name,
        count: data.count,
        topThemes: sortedThemes,
        portfolio: portfolioItems
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Keep top 50 active ones

  // Sort companies by comprehensive score descending
  scored.sort((a, b) => b.scores.comprehensive - a.scores.comprehensive);

  return { companies: scored, trends, investors };
};

export const exportCompaniesToCSV = (companies: ScoredCompany[]) => {
  const headers = [
    "Rank", "Organization Name", "Comprehensive Score", "Potential Score", 
    "Funding Score", "Operations Score", "Brand Score", 
    "Headquarters Location", "Industries", "Description", "Website"
  ];

  const rows = companies.map((c, idx) => [
    idx + 1,
    `"${c["Organization Name"].replace(/"/g, '""')}"`,
    c.scores.comprehensive.toFixed(2),
    c.scores.potential.toFixed(2),
    c.scores.funding.toFixed(2),
    c.scores.operations.toFixed(2),
    c.scores.brandTrend.toFixed(2),
    `"${(c["Headquarters Location"] || "").replace(/"/g, '""')}"`,
    `"${(c["Industries"] || "").replace(/"/g, '""')}"`,
    `"${(c["Full Description"] || c["Description"] || "").replace(/"/g, '""').substring(0, 1000)}"`,
    c["Organization Name URL"] || ""
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "capital_compass_analysis.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
