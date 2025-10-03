import React, { useState, useCallback, useEffect } from 'react';
import { analyzeStocks, generateAllocationPlan, selectTopSources } from './services/geminiService';
import type { StockInfo, Source, StockScreenerCriteria, AllocationPlan, GeminiApiResponse, StreamedData } from './types';
import StockTable from './components/StockTable';
import LoadingSpinner from './components/LoadingSpinner';
import SettingsPanel from './components/SettingsPanel';
import AllocationPanel from './components/AllocationPanel';
import SettingsIcon from './components/icons/SettingsIcon';
import SpinnerIcon from './components/icons/SpinnerIcon';
import SingleStockAnalyzer from './components/SingleStockAnalyzer';
import BottomNavBar from './components/BottomNavBar';

type ActiveTab = 'longTerm' | 'swingTrade';
type MainTab = 'screener' | 'analyzer' | 'settings';
type ScreeningProgress = 'idle' | 'screening' | 'done';

const defaultCriteria: StockScreenerCriteria = {
  longTerm: {
    '核心篩選模組': {
      '財務穩定性設定': {
        'EPS（近四季）': { options: ['> 3 元', '> 5 元', '> 8 元', '> 10 元'], selectedValue: '> 5 元' },
        'ROE（近一年）': { options: ['> 10%', '> 15%', '> 20%'], selectedValue: '> 15%' },
        '自由現金流': { options: ['為正', '近三年平均為正'], selectedValue: '為正' },
        '毛利率': { options: ['> 15%', '> 20%', '> 30%'], selectedValue: '> 20%' },
        '負債比': { options: ['< 60%', '< 50%', '< 40%'], selectedValue: '< 50%' },
      },
      '估值合理性設定': {
        '本益比（PE）': { options: ['< 15', '< 20', '< 25'], selectedValue: '< 20' },
        '本益成長比（PEG）': { options: ['< 1', '< 1.5', '< 2'], selectedValue: '< 1.5' },
        '股價位階': { options: ['近一年低點 ±10%', '近三年中位數以下'], selectedValue: '近一年低點 ±10%' },
      },
      '產業與競爭力設定': {
        '1. 技術獨特性': '判斷公司是否具備難以模仿或取代的技術能力，包括但不限於專利、演算法、系統架構、製程優勢等。請依產業特性調整分析方式。',
        '2. 客戶黏著度': '分析公司是否具備高轉換成本、長期合約、客製化能力或平台依賴性，以判断其客戶穩定性與抗競爭性。',
        '3. 供應鏈關鍵度（條件式分析）': '若公司屬於供應鏈導向產業（如半導體、電子零組件、工業製造），請分析其是否為 Tier 1 供應商、掌握關鍵零組件或具備系統整合能力。若不屬於此類產業，請跳過此項並改以其他競爭力指標補充。',
        '4. 替代性分析': '判斷公司產品或服務是否容易被競品取代，是否具備獨特性、差異化或市場依賴性。',
        '5. 競爭環境分類': '分析公司所處市場的競爭格局，判斷是否為寡占、獨占或紅海市場，並說明競爭強度與進入障礙。',
        '產業': '不限',
      },
      '年化報酬潛力設定': {
        '年化報酬率（含股利）': { options: ['> 8%', '> 10%', '> 12%'], selectedValue: '> 10%' },
        '股利政策': '可選擇「不強制但加分」',
      },
    },
    '加分模組': {
      '殖利率 > 3%': true,
      '配息率 > 50%': true,
      '連續配息 5 年以上': true,
      '法人持股穩定': true,
    },
    'AI動態模組': '題材辨識：自動分析熱門題材並加分。\n法人題材關聯：判斷法人是否因題材進場，避免盲目追熱。\n輪動強度分析：判斷是否處於主流輪動區，避開末段股。'
  },
  swingTrade: '尋找在「最近 3 個交易日」內，價格於 60 日均線（季線）附近出現「看漲吞沒」K 線型態的個股。此策略旨在捕捉剛發動的起漲點，確保進場時機的即時性。'
};

const App: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('screener');
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [screeningProgress, setScreeningProgress] = useState<ScreeningProgress>('idle');
  const [isCategoryLoading, setIsCategoryLoading] = useState<Record<ActiveTab, boolean>>({ longTerm: false, swingTrade: false });
  const [isMoreLoading, setIsMoreLoading] = useState<Record<ActiveTab, boolean>>({ longTerm: false, swingTrade: false });
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<GeminiApiResponse | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('longTerm');
  const [criteria, setCriteria] = useState<StockScreenerCriteria>(defaultCriteria);
  const [allocationPlan, setAllocationPlan] = useState<AllocationPlan | null>(null);
  const [isAllocationPanelOpen, setIsAllocationPanelOpen] = useState<boolean>(false);
  const [analysisMessage, setAnalysisMessage] = useState<Record<ActiveTab, string | null>>({ longTerm: null, swingTrade: null });
  const [rescreenAfterSave, setRescreenAfterSave] = useState<boolean>(false);


  const handleScreenStocks = useCallback(async () => {
    setIsScreening(true);
    setScreeningProgress('screening');
    setError(null);
    setStockData({ longTerm: [], swingTrade: [] }); // Reset and initialize for streaming
    setSources([]);
    setAllocationPlan(null);
    setAnalysisMessage({ longTerm: null, swingTrade: null });
    setIsCategoryLoading({ longTerm: true, swingTrade: true });

    const onDataReceived = (data: StreamedData) => {
      if ('type' in data && data.type === 'analysis_summary') {
        const category = activeTab; 
        setAnalysisMessage(prev => ({...prev, [category]: data.message}));
      } else if ('ticker' in data) {
        const stock = data as StockInfo;
        // Filter and rank per-stock sources
        if (stock.sources) {
          stock.sources = selectTopSources(stock.sources);
        }
        setStockData(prevData => {
          if (!prevData || !stock.category) return { longTerm: [], swingTrade: [] };
          const newCategoryList = [...prevData[stock.category], stock];
          return { ...prevData, [stock.category]: newCategoryList };
        });
      }
    };
    
    const onSourcesReceived = (newSources: Source[]) => {
      setSources(prevSources => {
        const combinedSources = [...prevSources, ...newSources];
        // The new function handles deduplication, filtering, ranking, and limiting.
        return selectTopSources(combinedSources);
      });
    }

    try {
      const longTermPromise = analyzeStocks('longTerm', criteria, onDataReceived, onSourcesReceived, [], 5)
        .finally(() => setIsCategoryLoading(prev => ({ ...prev, longTerm: false })));
      
      const swingTradePromise = analyzeStocks('swingTrade', criteria, onDataReceived, onSourcesReceived, [], 5)
        .finally(() => setIsCategoryLoading(prev => ({ ...prev, swingTrade: false })));

      await Promise.all([longTermPromise, swingTradePromise]);

      setScreeningProgress('done');

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '分析時發生未知錯誤，請稍後再試。';
      setError(errorMessage);
      setScreeningProgress('idle');
    } finally {
      setIsScreening(false);
    }
  }, [criteria, activeTab]);

  useEffect(() => {
    if (rescreenAfterSave) {
      handleScreenStocks();
      setRescreenAfterSave(false); // Reset the trigger
    }
  }, [rescreenAfterSave, handleScreenStocks]);

  const handleLoadMore = useCallback(async (category: ActiveTab) => {
    setIsMoreLoading(prev => ({ ...prev, [category]: true }));
    setError(null);
    setAnalysisMessage(prev => ({...prev, [category]: null}));


    const onDataReceived = (data: StreamedData) => {
       if ('type' in data && data.type === 'analysis_summary') {
        setAnalysisMessage(prev => ({...prev, [category]: data.message}));
      } else if ('ticker' in data) {
        const stock = data as StockInfo;
        // Filter and rank per-stock sources
        if (stock.sources) {
          stock.sources = selectTopSources(stock.sources);
        }
        setStockData(prevData => {
          if (!prevData || !stock.category) return { longTerm: [], swingTrade: [] };
          if (prevData[stock.category].some(s => s.ticker === stock.ticker)) return prevData;
          const newCategoryList = [...prevData[stock.category], stock];
          return { ...prevData, [stock.category]: newCategoryList };
        });
      }
    };

    const onSourcesReceived = (newSources: Source[]) => {
      setSources(prevSources => {
        const combinedSources = [...prevSources, ...newSources];
        return selectTopSources(combinedSources);
      });
    };

    const excludeTickers = stockData?.[category].map(s => s.ticker) || [];

    try {
      await analyzeStocks(category, criteria, onDataReceived, onSourcesReceived, excludeTickers, 5);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '載入更多時發生未知錯誤，請稍後再試。';
      setError(errorMessage);
    } finally {
      setIsMoreLoading(prev => ({ ...prev, [category]: false }));
    }
  }, [stockData, criteria]);
  
  const handleLoosenCriteria = useCallback(async (category: ActiveTab) => {
    setIsMoreLoading(prev => ({ ...prev, [category]: true }));
    setError(null);
    setAnalysisMessage(prev => ({...prev, [category]: null}));

    const onDataReceived = (data: StreamedData) => {
      if ('type' in data && data.type === 'analysis_summary') {
        setAnalysisMessage(prev => ({...prev, [category]: data.message}));
      } else if ('ticker' in data) {
        const stock = data as StockInfo;
        // Filter and rank per-stock sources
        if (stock.sources) {
          stock.sources = selectTopSources(stock.sources);
        }
        setStockData(prevData => {
          if (!prevData || !stock.category) return { longTerm: [], swingTrade: [] };
          if (prevData[stock.category].some(s => s.ticker === stock.ticker)) return prevData;
          const newCategoryList = [...prevData[stock.category], stock];
          return { ...prevData, [stock.category]: newCategoryList };
        });
      }
    };

    const onSourcesReceived = (newSources: Source[]) => {
      setSources(prevSources => {
        const combinedSources = [...prevSources, ...newSources];
        return selectTopSources(combinedSources);
      });
    };

    const excludeTickers = stockData?.[category].map(s => s.ticker) || [];

    try {
      // Find 3 more stocks with loosened criteria
      await analyzeStocks(category, criteria, onDataReceived, onSourcesReceived, excludeTickers, 3, true);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'AI 自動放寬條件時發生錯誤。';
      setError(errorMessage);
    } finally {
      setIsMoreLoading(prev => ({ ...prev, [category]: false }));
    }
  }, [stockData, criteria]);

  const handleAllocationRequest = useCallback(async (amount: number, ratio: number) => {
    if (!stockData) {
      setError("沒有可供分配的股票清單。");
      return;
    }
    setIsAllocating(true);
    setError(null);
    try {
      const plan = await generateAllocationPlan(amount, ratio, stockData);
      setAllocationPlan(plan);
    // FIX: Added curly braces to the catch block to fix a major syntax error.
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '資金分配時發生未知錯誤，請稍後再試。';
      setError(errorMessage);
       // Keep panel open on error to allow retry
    } finally {
      setIsAllocating(false);
    }
  }, [stockData]);
  
  const handleSaveSettings = (newCriteria: StockScreenerCriteria) => {
    setCriteria(newCriteria);
    setMainTab('screener');
    setRescreenAfterSave(true);
  };

  const isLoading = isScreening || isMoreLoading.longTerm || isMoreLoading.swingTrade || isAllocating;
  const hasResults = stockData && (stockData.longTerm.length > 0 || stockData.swingTrade.length > 0);

  const getScreeningButtonText = () => {
    switch (screeningProgress) {
        case 'screening':
            return 'AI 篩選中...';
        case 'done':
            return '重新篩選';
        case 'idle':
        default:
            return hasResults ? '重新篩選' : '開始 AI 選股';
    }
  };

  const getPageTitle = () => {
    switch (mainTab) {
      case 'screener':
        return 'AI 選股器';
      case 'analyzer':
        return '個股深度分析';
      case 'settings':
        return '客製化選股策略';
      default:
        return 'AI 台股選股神器';
    }
  };

  const ScreenerTabButton = ({ tab, label, isLoading }: { tab: ActiveTab; label: string; isLoading?: boolean }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full text-center px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-500 flex items-center justify-center ${
        activeTab === tab
          ? 'bg-slate-700 text-slate-100 shadow-md'
          : 'bg-transparent text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
      }`}
    >
      {label}
      {isLoading && <SpinnerIcon className="w-4 h-4 ml-2" />}
    </button>
  );
  
  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans p-6 sm:p-8 lg:p-10 pb-28">
      <div className="max-w-4xl mx-auto">
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-lg -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 lg:-mx-10 lg:-mt-10 mb-6 sm:mb-8">
            <div className="max-w-4xl mx-auto flex justify-center items-center py-4 px-6 sm:px-8 lg:px-10 border-b border-slate-800">
              <h1 className="text-xl font-bold text-slate-100">{getPageTitle()}</h1>
            </div>
        </header>

        <main>
          {mainTab === 'screener' && (
            <>
              <p className="text-center mb-8 text-base text-slate-400 max-w-2xl mx-auto">
                讓 AI 為您篩選最具潛力的標的，並在選股後，根據您的資金提供集中化的投資組合建議。
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
                <button
                  onClick={handleScreenStocks}
                  disabled={isLoading}
                  className="w-full sm:w-auto flex-grow sm:flex-grow-0 relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-teal-600 rounded-full shadow-lg overflow-hidden transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-teal-500 hover:shadow-teal-500/40 focus:outline-none focus:ring-4 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {getScreeningButtonText()}
                </button>
                <button
                  onClick={() => setIsAllocationPanelOpen(true)}
                  disabled={!hasResults || isLoading}
                  className="w-full sm:w-auto flex-grow sm:flex-grow-0 relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-slate-200 bg-slate-700 rounded-full shadow-lg overflow-hidden transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-slate-800/40 disabled:text-slate-600"
                >
                  {allocationPlan ? '查看/調整分配計畫' : '資金分配'}
                </button>
              </div>
              
              {isScreening && !hasResults && <LoadingSpinner />}
              {error && <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg mt-8">{error}</div>}
              
              <div className="relative mt-8 space-y-8">
                {hasResults && (
                    <div className="">
                      <div className="bg-slate-800/70 p-1 rounded-full flex items-center justify-center max-w-sm mx-auto mb-8">
                        <ScreenerTabButton tab="longTerm" label={`長期持有 (${stockData.longTerm.length})`} isLoading={isCategoryLoading.longTerm || isMoreLoading.longTerm} />
                        <ScreenerTabButton tab="swingTrade" label={`波段操作 (${stockData.swingTrade.length})`} isLoading={isCategoryLoading.swingTrade || isMoreLoading.swingTrade} />
                      </div>
                      
                      {activeTab === 'longTerm' && <StockTable data={stockData.longTerm} type="longTerm" isScreening={isCategoryLoading.longTerm} onLoadMore={() => handleLoadMore('longTerm')} isMoreLoading={isMoreLoading.longTerm} onLoosenCriteria={() => handleLoosenCriteria('longTerm')} analysisMessage={analysisMessage.longTerm} />}
                      {activeTab === 'swingTrade' && <StockTable data={stockData.swingTrade} type="swingTrade" isScreening={isCategoryLoading.swingTrade} onLoadMore={() => handleLoadMore('swingTrade')} isMoreLoading={isMoreLoading.swingTrade} onLoosenCriteria={() => handleLoosenCriteria('swingTrade')} analysisMessage={analysisMessage.swingTrade} />}
                      
                      {sources.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-800">
                          <h3 className="text-lg font-semibold text-slate-300 mb-2">
                            AI 分析驗證來源
                          </h3>
                          <p className="text-sm text-slate-500 mb-4">
                            以下是 AI 在本次分析中，透過 Google Search 所參考的主要網路資訊來源 (最多顯示 3 筆)：
                          </p>
                          <ul className="space-y-2">
                            {sources.map((source, index) => source.web && (
                              <li key={index} className="text-xs">
                                <a 
                                  href={source.web.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-teal-400 hover:text-teal-300 hover:underline transition-colors duration-200"
                                >
                                  [{index + 1}] {source.web.title || source.web.uri}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                )}
              </div>

              {!isScreening && !hasResults && !error && (
                 <div className="text-center text-slate-600 mt-12 p-8 bg-slate-900/50 rounded-lg">
                    <p>點擊「開始 AI 選股」以啟動。您也可以隨時點擊下方「設定」來客製化您的選股策略。</p>
                </div>
              )}
            </>
          )}

          {mainTab === 'analyzer' && (
            <SingleStockAnalyzer />
          )}

          {mainTab === 'settings' && (
            <SettingsPanel 
              initialCriteria={criteria}
              defaultCriteria={defaultCriteria}
              onSave={handleSaveSettings}
            />
          )}
        </main>

        <footer className="mt-12 text-center space-y-4">
            <div className="max-w-4xl mx-auto text-slate-600 text-xs text-center">
              <p>
                <strong className="font-semibold text-slate-500">重要提示：</strong>
                本工具的分析基於 AI 結合 Google Search 的即時資訊，但所有結果僅供學術參考，不構成任何真實投資建議。
              </p>
            </div>
        </footer>
      </div>

      {isAllocationPanelOpen && (
        <AllocationPanel
          plan={allocationPlan}
          onClose={() => setIsAllocationPanelOpen(false)}
          onCalculate={handleAllocationRequest}
        />
      )}
      
      <BottomNavBar activeTab={mainTab} setActiveTab={setMainTab} />
    </div>
  );
};

export default App;