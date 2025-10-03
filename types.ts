// FIX: Removed a circular import. The types `MultiSelectCriterion` and `SelectableCriterion` are defined below in this file.

export interface Source {
  web?: {
    uri: string;
    title: string;
  };
}

export interface StockInfo {
  name: string;
  ticker: string;
  category: 'longTerm' | 'swingTrade';
  buyZone: string;
  stopLoss?: string;
  takeProfit?: string;
  reasoning: string;
  sources?: Source[];
}

// --- NEW AI FEEDBACK TYPE ---
// A new type for the AI's feedback on why a search was limited
export interface AnalysisSummary {
  type: 'analysis_summary';
  message: string;
}

// The stream can now yield either a stock or a summary
export type StreamedData = StockInfo | AnalysisSummary;


export interface GeminiApiResponse {
  longTerm: StockInfo[];
  swingTrade: StockInfo[];
}

// --- NEW CRITERIA TYPES ---

// For criteria with a set of radio/dropdown options
export interface SelectableCriterion {
  options: string[];
  selectedValue: string;
}

// A criterion with multiple selectable checkbox options
export interface MultiSelectCriterion {
  options: string[];
  selectedValues: string[];
}

// The new, detailed structure for long-term criteria settings
export interface LongTermCriteriaSet {
  '核心篩選模組': {
    '財務穩定性設定': {
      'EPS（近四季）': SelectableCriterion;
      'ROE（近一年）': SelectableCriterion;
      '自由現金流': SelectableCriterion;
      '毛利率': SelectableCriterion;
      '負債比': SelectableCriterion;
    };
    '估值合理性設定': {
      '本益比（PE）': SelectableCriterion;
      '本益成長比（PEG）': SelectableCriterion;
      '股價位階': SelectableCriterion;
    };
    '產業與競爭力設定': Record<string, string>; // Changed from string
    '年化報酬潛力設定': {
      '年化報酬率（含股利）': SelectableCriterion;
      '股利政策': string;
    };
  };
  '加分模組': Record<string, boolean>;
  'AI動態模組': string;
}


// The main criteria configuration object for the entire app
export interface StockScreenerCriteria {
  longTerm: LongTermCriteriaSet;
  swingTrade: string;
}

// --- ALLOCATION TYPES (Unchanged) ---
export interface AllocatedStock {
  name: string;
  ticker: string;
  amount: number;
  reason: string;
}

export interface AllocationCategoryPlan {
  totalAmount: number;
  stocks: AllocatedStock[];
}

export interface AllocationPlan {
  summary: string;
  longTermAllocation: AllocationCategoryPlan;
  swingTradeAllocation: AllocationCategoryPlan;
}

// --- SINGLE STOCK ANALYSIS TYPES (Unchanged) ---
export interface MetricAnalysis {
  metric: string;
  status: string;
  evaluation: string;
}

export interface SingleStockAnalysisResult {
    name: string;
    ticker: string;
    analysis: MetricAnalysis[];
    strategySuggestion?: string;
    longTermSuitability?: string;
    sources?: Source[];
}