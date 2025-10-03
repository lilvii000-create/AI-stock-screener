import { GoogleGenAI } from "@google/genai";
// FIX: Import MultiSelectCriterion and SelectableCriterion to correctly cast and type-guard criteria objects.
import type { GeminiApiResponse, Source, StockInfo, AllocationPlan, StockScreenerCriteria, SingleStockAnalysisResult, StreamedData, MultiSelectCriterion, SelectableCriterion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- NEW UTILITY FUNCTION for Source Prioritization ---
const normalizeUrl = (uri: string): string => {
  try {
    const url = new URL(uri);
    // Remove www., convert to lowercase, remove search params and hash, remove trailing slash
    const cleanedHostname = url.hostname.replace(/^www\./, '').toLowerCase();
    const cleanedPathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    return `${cleanedHostname}${cleanedPathname}`;
  } catch (e) {
    // Fallback for invalid URLs
    return uri.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/$/, '');
  }
};


export const selectTopSources = (sources: Source[] | undefined): Source[] => {
  if (!sources || sources.length === 0) return [];

  const scoreSource = (source: Source): number => {
    if (!source.web || !source.web.uri) return 0;
    const uri = source.web.uri.toLowerCase();

    // Priority 1: Direct Price/Finance sites
    if (uri.includes('finance.yahoo.com') || uri.includes('google.com/finance')) {
      return 100;
    }
    // Priority 2: Reputable TW financial analysis sites
    if (uri.includes('goodinfo.tw') || uri.includes('cnyes.com') || uri.includes('moneydj.com') || uri.includes('anue.com')) {
      return 90;
    }
    // Official exchange/government data
    if (uri.includes('mops.twse.com.tw') || uri.includes('.gov.tw')) {
      return 85;
    }
    // Priority 3: Major TW news outlets
    if (uri.includes('udn.com') || uri.includes('chinatimes.com') || uri.includes('ltn.com.tw') || uri.includes('wealth.com.tw') || uri.includes('businesstoday.com.tw') || uri.includes('ctee.com.tw')) {
      return 80;
    }
    
    // Generic news or other less specific but potentially useful sites
    return 50;
  };

  const uniqueSources = Array.from(
    new Map(sources.map(s => [s.web?.uri ? normalizeUrl(s.web.uri) : s.web?.uri, s])).values()
  );
  
  const filteredSources = uniqueSources.filter(source => {
    if (!source.web || !source.web.uri) return false;
    const uri = source.web.uri.toLowerCase();
    // EXPANDED Blacklist
    const excludedDomains = [
        '.cn', 'sina.com', 'sohu.com', '163.com', 'tencent.com', 'xueqiu.com', 
        'eastmoney.com', 'weibo.com', 'zhihu.com', 'baidu.com', 'toutiao.com', 
        'hexun.com', 'jrj.com.cn', 'stockstar.com', 'ifeng.com', 'ifa.ai'
    ];
    return !excludedDomains.some(domain => uri.includes(domain));
  });

  const sortedSources = filteredSources
    .map(source => ({ source, score: scoreSource(source) }))
    .sort((a, b) => b.score - a.score);
  
  return sortedSources.slice(0, 3).map(item => item.source);
};


// --- PROMPT GENERATORS ---

const createAnalysisPrompt = (category: 'longTerm' | 'swingTrade', criteria: StockScreenerCriteria, excludeTickers: string[] = [], count: number, loosenCriteria: boolean = false): string => {
  const categoryName = category === 'longTerm' ? '長期持有' : '波段操作';

  let criteriaDescription = '';
  if (category === 'longTerm') {
    const longTermCriteria = criteria.longTerm;
    
    let coreDescription = '核心篩選模組 (必須符合的條件):\n';
    const coreModule = longTermCriteria['核心篩選模組'];

    // FIX: Removed an erroneous if/else block. The properties of `coreModule` are always objects based on the type definition,
    // so the `if (typeof groupContent === 'string')` check was unreachable code, causing a `never` type error.
    // The logic now correctly iterates through each group object.
    for (const [groupName, groupContent] of Object.entries(coreModule)) {
        coreDescription += `  ${groupName}:\n`;
        // Handle object-based criteria
        for (const [key, value] of Object.entries(groupContent)) {
            // FIX: The type of `value` is inferred incorrectly from the upstream `StockScreenerCriteria` type,
            // as it doesn't account for `MultiSelectCriterion`, leading to a `never` type in the final `else if`.
            // We cast it to a wider type that includes all possibilities, allowing our type guards to work correctly.
            const criterion = value as SelectableCriterion | MultiSelectCriterion | string;
            if (typeof criterion === 'string') { // For '股利政策'
                coreDescription += `    - ${key}: ${criterion}\n`;
            } else if ('selectedValue' in criterion) {
                coreDescription += `    - ${key}: ${criterion.selectedValue}\n`;
            } else if ('selectedValues' in criterion) {
                coreDescription += `    - ${key}: ${criterion.selectedValues.join(', ')}\n`;
            }
        }
    }
    
    let bonusDescription = '加分模組 (額外優化排序):\n';
    const bonusModule = longTermCriteria['加分模組'];
    const enabledBonuses = Object.entries(bonusModule)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);
    
    if (enabledBonuses.length > 0) {
      bonusDescription += `  - ${enabledBonuses.join('\n  - ')}\n`;
    } else {
      bonusDescription += '  - (無啟用)\n';
    }

    const aiModuleDescription = `AI動態模組 (自動):\n  - ${longTermCriteria['AI動態模組']}`;

    criteriaDescription = `${coreDescription}\n${bonusDescription}\n${aiModuleDescription}`;
  } else {
    // Swing trade criteria is now a single descriptive string.
    criteriaDescription = criteria.swingTrade;
  }


  const highLevelGoal = category === 'longTerm' 
    ? `Find up to ${count} Taiwanese stocks (台股) or ETFs suitable for long-term value investing. Focus on companies with strong fundamentals, stable growth, and a solid market position.`
    : `Find up to ${count} Taiwanese stocks (台股) that fit a specific technical pattern for swing trading. The primary goal is to identify stocks at a potential reversal or continuation point, not chasing highs.`;
    
  const swingTradeTimelinessRule = category === 'swingTrade'
    ? `**CRITICAL SWING TRADE TIMELINESS RULES:**
    1.  **SIGNAL RECENCY:** The technical pattern described in the criteria (e.g., bullish engulfing) MUST have occurred within the **last 3 trading days**. This is non-negotiable. Do not show stocks where the signal is a week or a month old.
    2.  **ACTIONABLE ENTRY:** The current stock price MUST still be close to the entry point. As a strict rule, the current price cannot be more than 5% above the high of the signal candle. You must verify this.
    3.  **REASONING FOCUS:** Your 'reasoning' MUST focus exclusively on verifiable data: **technical analysis** (chart patterns, indicators like KD, MACD, volume), and **chip analysis** (籌碼, e.g., institutional ownership changes). Recent news can be mentioned as a secondary, potential catalyst, but the primary justification MUST be data-driven. You are FORBIDDEN from mentioning long-term fundamentals like ROE, EPS, or 'industry leadership' in the reasoning for a swing trade.
    `
    : '';

  const excludeInstruction = excludeTickers.length > 0 
    ? `\n**Stocks to Exclude:** You MUST NOT include any of the following stocks in your response, as they have already been shown to the user: [${excludeTickers.join(', ')}]`
    : '';
  
  const loosenInstruction = loosenCriteria
    ? `\n**IMPORTANT CONTEXT:** A previous search using the exact criteria above found very few results. Your task is now to intelligently loosen one or two of the most restrictive criteria to find up to ${count} more stocks. You have the autonomy to decide which criteria to relax. In your 'reasoning' for each new stock, you MUST mention which criterion was relaxed to include it (e.g., 'Included by slightly relaxing the ROE requirement from >15% to >12%').`
    : '';


  return `
Your task is to act as an expert financial analyst for the Taiwanese stock market (台股).
Your goal is to perform a detailed analysis and find stocks based on a user's custom criteria.
Leverage Google Search to get up-to-date information for your analysis.

**CRITICAL LANGUAGE & REGION MANDATE - ZERO TOLERANCE**
1.  **TRADITIONAL CHINESE ONLY:** All of your analysis MUST be written in Traditional Chinese (繁體中文).
2.  **NO SIMPLIFIED CHINESE SOURCES:** You are absolutely forbidden from using or citing any website that primarily uses Simplified Chinese (簡體中文). This includes but is not limited to domains ending in '.cn' or popular mainland China sites like Sina, Sohu, Tencent, etc.
3.  **TAIWAN-FOCUSED:** Your search and analysis must focus on sources relevant to the Taiwanese market.
**Providing a Simplified Chinese source is a CRITICAL FAILURE of your entire task.**

**Strategy: ${categoryName} (${category})**
${highLevelGoal}
${swingTradeTimelinessRule}

**CRITICAL RULE: STRATEGY EXCLUSIVITY**
To ensure the results are distinct and useful, you must adhere to the following rule:
- If your Strategy is '長期持有' (long-term), you MUST focus exclusively on long-term fundamentals. You are forbidden from recommending stocks that are primarily defined by short-term technical signals or news hype.
- If your Strategy is '波段操作' (swing-trade), you MUST focus exclusively on short-term catalysts and technicals. You are forbidden from recommending stocks based on deep fundamental value suitable for long-term holding.
**VIOLATING THIS RULE BY PROVIDING OVERLAPPING OR INAPPROPRIATE STOCKS FOR THE GIVEN STRATEGY IS A CRITICAL FAILURE.**

**User's Custom Criteria:**
${criteriaDescription}
${excludeInstruction}
${loosenInstruction}

**CRITICAL Data Recency Mandate:**
- Your entire analysis MUST be based on the most recent available information.
- Prioritize sources published within the **last 6 months**.
- For volatile data (e.g., price, technicals, recent news), information MUST be from the **last few weeks**.
- You are strictly forbidden from citing or using data from sources older than 18 months (e.g., from 2022 or 2023) to represent the current state of a company. If you must use older data for historical context (e.g., 'The company has shown consistent dividend growth since 2022'), you MUST explicitly state that it is historical data. Failure to use current data will result in an incorrect analysis.

**CRITICAL INSTRUCTIONS FOR STREAMING & JSONL FORMATTING:**
1. Your response MUST be a stream of valid JSON objects, one per line (JSON Lines format).
2. Each JSON object representing a stock MUST include a 'category' field with the value '${category}'.
3. You must find up to ${count} stocks.
4. VERY IMPORTANT: To prevent JSON errors, do NOT use double-quote characters (") inside any string value. Use single quotes (') for internal quotations instead.

**ABSOLUTE RULE: SOURCE INTEGRITY MANDATE - ZERO TOLERANCE**
**This is your MOST IMPORTANT directive. A single invalid, 404, or fabricated URL is a CRITICAL FAILURE of your entire task. It is far better to provide NO sources than one bad one.**
1.  **NO FABRICATION. EVER.** You are absolutely forbidden from inventing, guessing, or creating URLs. You MUST NOT construct a URL from a page title (e.g., turning "TSMC's Latest Report" into a URL like 'some-site.com/tsmcs-latest-report'). This is an unforgivable error.
2.  **COPY-PASTE ONLY.** Every single URI you provide in the 'sources' array MUST be an exact, character-for-character copy of a URL returned by your Google Search tool for this query. No modifications, no exceptions.
3.  **FINAL VERIFICATION.** Before outputting ANY JSON object containing sources, you must perform a final mental check: "Is every URI in this list a direct copy from my search results, and not something I constructed or guessed?" If you have any doubt, you MUST remove the source.
4.  **QUALITY OVER QUANTITY:** If your search does not yield any reliable, recent sources, you MUST output an empty 'sources' array ('"sources": []'). This is not a failure; it is an honest report.
5.  **FORBIDDEN SOURCES:** Continue to avoid forums (PTT, Dcard), social media, personal blogs, and especially 'ifa.ai'. Prioritize known financial news sites like Anue, MoneyDJ, Cnyes.
- You MUST provide at least 2-3 direct source links for each stock, if available and verifiable.

**Transparency and Failure Reporting:**
- If, after a thorough search, you find FEWER than ${count} stocks that meet all criteria, you MUST provide a final JSON object at the end of the stream explaining why.
- This final object is NOT a stock. It must have the exact structure: { "type": "analysis_summary", "message": "string" }.
- In the 'message' field, clearly explain which specific criteria were the most restrictive and prevented you from finding more results. For example: "Could only find 2 stocks. The combination of 'ROE > 20%' and 'Debt Ratio < 40%' was extremely rare in the current market for tech stocks."
- This provides transparency to the user and helps them adjust their criteria.

Each JSON object for a stock must follow this exact structure:
{
  "category": "${category}",
  "name": "string",
  "ticker": "string (e.g., '2330.TW' or '0056.TW' for ETFs)",
  "buyZone": "string (CRITICAL: First, find the stock's most recent closing price via Google Search. Then, calculate a tight, realistic buy range, typically +/- 5% of that price. DO NOT use analyst target prices from articles. The buy zone MUST be based on the stock's CURRENT price. e.g., if the closing price is 220, a good buy zone would be '215 - 225'.)",
  ${category === 'swingTrade' ? `"stopLoss": "string",` : ''}
  ${category === 'swingTrade' ? `"takeProfit": "string",` : ''}
  "reasoning": "string (Provide a single, consolidated analysis of why this stock is a good pick based on all factors. Write the reason directly and naturally.)",
  "sources": [ { "web": { "uri": "string", "title": "string" } } ]
}

Fill all string fields with detailed and insightful analysis in Traditional Chinese. Start streaming the JSON Line objects immediately.
`;
};


const createAllocationPrompt = (
    totalAmount: number, 
    ratio: number, 
    stocks: GeminiApiResponse
): string => {
    const longTermAmount = totalAmount * (ratio / 100);
    const swingTradeAmount = totalAmount * (1 - ratio / 100);
    
    const longTermStockList = stocks.longTerm.map(s => `${s.ticker} ${s.name}`).join(', ');
    const swingTradeStockList = stocks.swingTrade.map(s => `${s.ticker} ${s.name}`).join(', ');

    return `
You are a portfolio management AI. Your task is to create a concrete investment plan based on a pre-screened list of stocks and a user's budget.

**User's Investment Profile:**
- Total Investment Capital: ${totalAmount.toLocaleString()} TWD
- Allocation Strategy: ${ratio}% for Long-term Hold, ${100 - ratio}% for Swing Trading.

**Your Available Stocks (Pre-screened):**
- Long-term Candidates: [${longTermStockList}]
- Swing Trading Candidates: [${swingTradeStockList}]

**Your Mission:**
Your primary goal is **effective capital concentration**, NOT broad diversification across all candidates. From each category's list of candidates, you must select only the **1 to 3 most promising stocks** that you believe will yield the best results.

For each stock you select, you must provide:
1.  A specific TWD amount to allocate to it. The sum of your allocations for a category should not exceed the user's budget for that category.
2.  A concise, powerful reason for prioritizing this specific stock over the others in the candidate list.

**CRITICAL INSTRUCTIONS FOR JSON FORMATTING:**
1.  Your entire response MUST be a single, valid JSON object and nothing else.
2.  Do NOT include any text, comments, or markdown formatting (like \`\`\`json) before or after the JSON object.
3.  VERY IMPORTANT: Use single quotes (') for internal quotations to avoid JSON errors.
4.  The 'amount' field must be a number, not a string.

The JSON object must follow this exact structure:

{
  "summary": "string (A brief, encouraging summary of the overall allocation strategy)",
  "longTermAllocation": {
    "totalAmount": ${longTermAmount},
    "stocks": [
      {
        "name": "string",
        "ticker": "string",
        "amount": number,
        "reason": "string (Why this stock was chosen over others for long-term hold)"
      }
    ]
  },
  "swingTradeAllocation": {
    "totalAmount": ${swingTradeAmount},
    "stocks": [
      {
        "name": "string",
        "ticker": "string",
        "amount": number,
        "reason": "string (Why this stock was chosen over others for swing trading)"
      }
    ]
  }
}

Fill all string fields with detailed and insightful analysis in Traditional Chinese.
`;
};

const createSingleStockAnalysisPrompt = (ticker: string): string => {
  return `
You are an expert financial analyst for the Taiwanese stock market (台股).
Your task is to perform a deep-dive, structured analysis on a single stock specified by the user.
Leverage Google Search to gather the most up-to-date information for your analysis.

**Stock to Analyze:** ${ticker}

**CRITICAL LANGUAGE & REGION MANDATE - ZERO TOLERANCE**
1.  **TRADITIONAL CHINESE ONLY:** All of your analysis MUST be written in Traditional Chinese (繁體中文).
2.  **NO SIMPLIFIED CHINESE SOURCES:** You are absolutely forbidden from using or citing any website that primarily uses Simplified Chinese (簡體中文). This includes but is not limited to domains ending in '.cn' or popular mainland China sites like Sina, Sohu, Tencent, etc.
3.  **TAIWAN-FOCUSED:** Your search and analysis must focus on sources relevant to the Taiwanese market.
**Providing a Simplified Chinese source is a CRITICAL FAILURE of your entire task.**

**Your Mission:**
1. Analyze the stock across these five key metrics and provide a "status" and "evaluation" for each:
   - 📈 今日股價 (Current Price) -> You MUST fetch the most recent closing price.
   - 🧾 EPS（近四季）(EPS - TTM)
   - 📦 籌碼面 (Chip/Ownership Analysis)
   - 🔍 題材面 (Thematic/Catalyst Analysis)
   - 🧠 技術面 (Technical Analysis)
2. Based on your complete analysis, provide a concise **"操作策略建議" (Operational Strategy Suggestion)**.
3. Finally, provide a clear judgment and a short reason on its suitability for long-term holding (**"是否適合長期持有"**).

**CRITICAL Data Recency Mandate:**
- Your entire analysis MUST be based on the most recent available information.
- Prioritize sources published within the **last 6 months**.
- For the '今日股價' (Current Price) metric, you MUST fetch the most recent closing price.
- You are strictly forbidden from citing or using data from sources older than 18 months (e.g., from 2022 or 2023) to represent the current state of a company. If you must use older data for historical context (e.g., 'The company has shown consistent dividend growth since 2022'), you MUST explicitly state that it is historical data. Failure to use current data will result in an incorrect analysis.

**CRITICAL INSTRUCTIONS FOR JSON FORMATTING:**
1.  Your entire response MUST be a single, valid JSON object and nothing else.
2.  Do NOT include any text, comments, or markdown formatting (like \`\`\`json) before or after the JSON object.
3.  VERY IMPORTANT: Use single quotes (') for internal quotations to avoid JSON errors.

**ABSOLUTE RULE: SOURCE INTEGRITY MANDATE - ZERO TOLERANCE**
**This is your MOST IMPORTANT directive. A single invalid, 404, or fabricated URL is a CRITICAL FAILURE of your entire task. It is far better to provide NO sources than one bad one.**
1.  **NO FABRICATION. EVER.** You are absolutely forbidden from inventing, guessing, or creating URLs. You MUST NOT construct a URL from a page title (e.g., turning "TSMC's Latest Report" into a URL like 'some-site.com/tsmcs-latest-report'). This is an unforgivable error.
2.  **COPY-PASTE ONLY.** Every single URI you provide in the 'sources' array MUST be an exact, character-for-character copy of a URL returned by your Google Search tool for this query. No modifications, no exceptions.
3.  **FINAL VERIFICATION.** Before outputting ANY JSON object containing sources, you must perform a final mental check: "Is every URI in this list a direct copy from my search results, and not something I constructed or guessed?" If you have any doubt, you MUST remove the source.
4.  **QUALITY OVER QUANTITY:** If your search does not yield any reliable, recent sources, you MUST output an empty 'sources' array ('"sources": []'). This is not a failure; it is an honest report.
5.  **FORBIDDEN SOURCES:** Continue to avoid forums (PTT, Dcard), social media, personal blogs, and especially 'ifa.ai'. Prioritize known financial news sites like Anue, MoneyDJ, Cnyes.
- You MUST provide at least 3-4 high-quality source links from your research, if available and verifiable.


The JSON object must follow this exact structure:
{
  "name": "string",
  "ticker": "${ticker}",
  "analysis": [
    {
      "metric": "📈 今日股價",
      "status": "string (e.g., '約 NT$38.5')",
      "evaluation": "string (e.g., '近期高檔震盪，漲幅收斂')"
    },
    {
      "metric": "🧾 EPS（近四季）",
      "status": "string (e.g., '-0.42 元')",
      "evaluation": "string (e.g., '虧損，屬景氣循環股')"
    },
    {
      "metric": "📦 籌碼面",
      "status": "string (e.g., '外資連3日賣超，自營商偏多')",
      "evaluation": "string (e.g., '短線籌碼混亂')"
    },
    {
      "metric": "🔍 題材面",
      "status": "string (e.g., 'AI材料（玻纖布、環氧樹脂）＋半導體應用')",
      "evaluation": "string (e.g., '題材仍在，但非主流')"
    },
    {
      "metric": "🧠 技術面",
      "status": "string (e.g., '7月漲停後高檔震盪，KD鈍化')",
      "evaluation": "string (e.g., '有獲利了結壓力')"
    }
  ],
  "strategySuggestion": "string (A concise, actionable strategy suggestion based on the analysis.)",
  "longTermSuitability": "string (A clear judgment and reason, e.g., '適合，因其產業龍頭地位與穩定獲利能力' or '不適合，因其獲利不穩且產業前景不明')",
  "sources": [ { "web": { "uri": "string", "title": "string" } } ]
}

Fill all string fields with detailed and insightful analysis in Traditional Chinese.
`;
};


// --- API FUNCTIONS ---

export const analyzeStocks = async (
    category: 'longTerm' | 'swingTrade',
    criteria: StockScreenerCriteria,
    onDataReceived: (data: StreamedData) => void,
    onSourcesReceived: (sources: Source[]) => void,
    excludeTickers: string[] = [],
    count: number,
    loosenCriteria: boolean = false
): Promise<void> => {
  try {
    const prompt = createAnalysisPrompt(category, criteria, excludeTickers, count, loosenCriteria);
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert financial analyst for the Taiwanese stock market (台股). You will receive a high-level strategy and must respond by streaming JSON Line objects containing your analysis for each stock you find.",
        tools: [{googleSearch: {}}],
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for faster responses
      },
    });
    
    let globalSourcesReported = false;
    let buffer = "";

    for await (const chunk of responseStream) {
        if (!globalSourcesReported) {
             const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks as Source[] | undefined;
             if(sources && sources.length > 0) {
                onSourcesReceived(sources);
                globalSourcesReported = true;
             }
        }
        
        const text = chunk.text;
        if (!text) continue;

        buffer += text;
        
        let lastProcessedIndex = 0;
        while (true) {
            const startIndex = buffer.indexOf('{', lastProcessedIndex);
            if (startIndex === -1) {
                // No more '{' found in the unprocessed part of the buffer.
                break;
            }

            let braceCount = 0;
            let endIndex = -1;
            for (let i = startIndex; i < buffer.length; i++) {
                if (buffer[i] === '{') {
                    braceCount++;
                } else if (buffer[i] === '}') {
                    if (braceCount > 0) {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i;
                            break;
                        }
                    }
                }
            }

            if (endIndex !== -1) {
                // A complete JSON object was found
                const jsonString = buffer.substring(startIndex, endIndex + 1);
                try {
                    const data = JSON.parse(jsonString) as StreamedData;
                    if (data && (('ticker' in data && data.category) || ('type' in data && data.type === 'analysis_summary'))) {
                        onDataReceived(data);
                    }
                } catch (e) {
                    console.warn("Could not parse a streamed JSON object:", jsonString, e);
                }
                lastProcessedIndex = endIndex + 1;
            } else {
                // An incomplete JSON object, wait for more chunks
                lastProcessedIndex = startIndex;
                break;
            }
        }
        
        // Remove the processed part of the buffer
        if (lastProcessedIndex > 0) {
            buffer = buffer.substring(lastProcessedIndex);
        }
    }

  } catch (error) {
    console.error(`Error analyzing stocks for ${category}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
    throw new Error(`Error analyzing stocks for ${category}:\n${errorMessage}`);
  }
};


export const generateAllocationPlan = async (totalAmount: number, ratio: number, stocks: GeminiApiResponse): Promise<AllocationPlan> => {
    try {
        const prompt = createAllocationPrompt(totalAmount, ratio, stocks);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are a savvy portfolio manager for the Taiwanese stock market (台股). You will receive a budget, strategy, and a list of stocks, and you must respond with only a valid JSON object containing your allocation plan. Do not add any conversational text or markdown.",
                temperature: 0.5,
            },
        });

        const rawText = response.text.trim();
        if (!rawText) {
            throw new Error("API returned an empty response for allocation plan.");
        }
        
        let jsonText = rawText;
        if (rawText.startsWith('```') && rawText.endsWith('```')) {
          jsonText = rawText.replace(/^```(?:json)?\s*|```\s*$/g, '');
        }

        try {
            const plan = JSON.parse(jsonText);
            return plan as AllocationPlan;
        } catch(e) {
            const jsonStartIndex = jsonText.indexOf('{');
            if (jsonStartIndex !== -1) {
                const potentialJson = jsonText.substring(jsonStartIndex);
                try {
                    const plan = JSON.parse(potentialJson);
                    return plan as AllocationPlan;
                } catch (finalError) {
                    console.error("Failed to parse JSON even after attempting to clean it:", finalError);
                    throw new Error(`AI 資金分配計畫格式錯誤，無法解析。\n${(finalError as Error).message}`);
                }
            }
            throw e;
        }

    } catch (error) {
        console.error("Error generating allocation plan:", error);
        if (error instanceof SyntaxError) {
            console.error("Failed to parse JSON response from API for allocation.", error);
            throw new Error(`AI 資金分配計畫格式錯誤，無法解析。\n${(error as Error).message}`);
        }
        const errorMessage = error instanceof Error ? error.message : "Failed to generate allocation plan.";
        throw new Error(errorMessage);
    }
};

export const getSingleStockAnalysis = async (ticker: string): Promise<SingleStockAnalysisResult> => {
  try {
    const prompt = createSingleStockAnalysisPrompt(ticker);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert financial analyst for the Taiwanese stock market (台股). You will receive a single stock ticker and must respond with only a valid JSON object containing your deep-dive, structured analysis.",
        tools: [{googleSearch: {}}],
        temperature: 0.3, 
      },
    });

    const rawText = response.text.trim();
    if (!rawText) {
        throw new Error("API returned an empty response for single stock analysis.");
    }
    
    let jsonText = rawText;
    if (rawText.startsWith('```') && rawText.endsWith('```')) {
      // FIX: Corrected a typo from `raw-Text` to `rawText`.
      jsonText = rawText.replace(/^```(?:json)?\s*|```\s*$/g, '');
    }

    try {
        const stock = JSON.parse(jsonText) as SingleStockAnalysisResult;
        if (stock.sources) {
          stock.sources = selectTopSources(stock.sources);
        }
        return stock;
    } catch(e) {
        const jsonStartIndex = jsonText.indexOf('{');
        if (jsonStartIndex !== -1) {
            const potentialJson = jsonText.substring(jsonStartIndex);
            try {
                const stock = JSON.parse(potentialJson) as SingleStockAnalysisResult;
                if (stock.sources) {
                  stock.sources = selectTopSources(stock.sources);
                }
                return stock;
            } catch (finalError) {
                console.error("Failed to parse JSON even after attempting to clean it:", finalError);
                throw new Error(`AI 個股分析格式錯誤，無法解析。\n${(finalError as Error).message}`);
            }
        }
        throw e;
    }
  } catch (error) {
    console.error(`Error getting single stock analysis for ${ticker}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
    throw new Error(`Error analyzing ${ticker}:\n${errorMessage}`);
  }
};