import { GoogleGenAI, Type } from "@google/genai";
import { ScoredCompany, LiveIntelResult, GroundingSource, InvestorStat } from "../types";

export interface CompanyAnalysis {
  executiveSummary: string;
  investmentVerdict: string;
  competitiveEdge: string;
}

export interface InvestorInternalAnalysis {
  investmentThesis: string;
  portfolioComposition: string;
  strategicFocus: string;
}

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInvestmentAnalysis = async (company: ScoredCompany): Promise<CompanyAnalysis> => {
  try {
    const ai = getAIClient();
    
    const prompt = `
      You are a Senior Venture Capital Analyst. Analyze this company for a potential investment.
      
      Company Profile:
      - Name: ${company["Organization Name"]}
      - Description: ${company["Full Description"] || company["Description"]}
      - Industry: ${company["Industries"] || "Unknown"}
      - Stage: ${company["Last Funding Type"]}
      - Employees: ${company["Number of Employees"]}
      
      Internal Proprietary Scores (0-100 scale):
      - Funding Strength: ${company.scores.funding.toFixed(0)}
      - Operational Stability: ${company.scores.operations.toFixed(0)}
      - Brand/Trend Alignment: ${company.scores.brandTrend.toFixed(0)}
      - Overall Potential Score: ${company.scores.potential.toFixed(0)}

      Provide a structured investment memo in JSON format with the following fields:
      1. executiveSummary: A concise 1-2 sentence overview of what the company does.
      2. investmentVerdict: A direct assessment. Is this worth investing in? Why or why not? Reference the scores and stage in your reasoning.
      3. competitiveEdge: Analyze their competitiveness. Do they have a moat? Is the market crowded?
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                executiveSummary: { type: Type.STRING },
                investmentVerdict: { type: Type.STRING },
                competitiveEdge: { type: Type.STRING }
            },
            required: ["executiveSummary", "investmentVerdict", "competitiveEdge"]
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text) as CompanyAnalysis;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error (Analysis):", error);
    return {
        executiveSummary: "Failed to generate analysis.",
        investmentVerdict: "Analysis unavailable due to an error.",
        competitiveEdge: "Please check console for details."
    };
  }
};

export const generateInvestorInternalAnalysis = async (investor: InvestorStat): Promise<InvestorInternalAnalysis> => {
  try {
    const ai = getAIClient();
    
    // Summarize portfolio for context
    const portfolioSummary = investor.portfolio.map(p => `- ${p.name} (Themes: ${p.themes.join(', ')})`).join('\n');

    const prompt = `
      You are a Limited Partner (LP) Analyst evaluating a Venture Capital firm based on their recent deal flow in our dataset.
      
      Investor: ${investor.name}
      Deal Count in Dataset: ${investor.count}
      Top Themes: ${investor.topThemes.join(', ')}
      
      Portfolio Samples:
      ${portfolioSummary}

      Based ONLY on the portfolio data provided above, generate an internal analysis JSON:
      1. investmentThesis: Infer their investment strategy. Do they favor deep tech, consumer apps, or B2B? What connects these companies?
      2. portfolioComposition: Analyze the diversity. Is it highly concentrated in one sector or broad? 
      3. strategicFocus: Identify any shifts in interest or specific niches they seem to be doubling down on.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                investmentThesis: { type: Type.STRING },
                portfolioComposition: { type: Type.STRING },
                strategicFocus: { type: Type.STRING }
            },
            required: ["investmentThesis", "portfolioComposition", "strategicFocus"]
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text) as InvestorInternalAnalysis;
    }
    throw new Error("Empty response from AI");

  } catch (error) {
      console.error("Gemini API Error (Investor Analysis):", error);
      return {
          investmentThesis: "Could not analyze portfolio.",
          portfolioComposition: "Data unavailable.",
          strategicFocus: "Error generating insights."
      };
  }
};

export const generateLiveIntelligence = async (queryName: string, context: "company" | "investor"): Promise<LiveIntelResult> => {
    try {
        const ai = getAIClient();
        
        let prompt = "";
        
        if (context === "company") {
            prompt = `
                Perform a real-time market research deep dive on the company: "${queryName}".
                
                Structure your response with the following EXACT Markdown headers:
                
                ## Latest Headlines
                Find and list the 3 most recent and relevant news headlines or press releases. Use bullet points.
                
                ## Market Sentiment
                Analyze the general public and industry sentiment based on recent search results. Write one concise paragraph.
                
                ## Key Voices
                Select 3 specific, representative comments/quotes from investors, customers, or media. Use bullet points.
            `;
        } else {
             prompt = `
                Perform a background check on the investor/firm: "${queryName}".
                
                Structure your response with the following EXACT Markdown headers:
                
                ## Recent Activity
                Find their latest deals, exits, or fund announcements. List the top 3 most recent events using bullet points.
                
                ## Reputation & Thesis
                Summarize their reputation, known investment thesis, and any notable public feedback or founder reviews. Write one concise paragraph.
            `;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Note: responseMimeType is NOT allowed with googleSearch
            }
        });

        // Extract grounding chunks for sources
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: GroundingSource[] = groundingChunks
            .map(chunk => ({
                title: chunk.web?.title || "Source",
                uri: chunk.web?.uri || ""
            }))
            .filter(s => s.uri !== "");

        // Deduplicate sources
        const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

        return {
            markdown: response.text || "No information found.",
            sources: uniqueSources
        };

    } catch (error) {
        console.error("Gemini API Error (Live Intel):", error);
        return {
            markdown: "## Error\nCould not fetch live intelligence. Please check your API key permissions.",
            sources: []
        };
    }
};