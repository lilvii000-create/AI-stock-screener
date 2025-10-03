import React, { useState, useCallback } from 'react';
import { getSingleStockAnalysis, selectTopSources } from '../services/geminiService';
import type { SingleStockAnalysisResult, Source } from '../types';
import LoadingSpinner from './LoadingSpinner';

const AnalysisReport: React.FC<{ result: SingleStockAnalysisResult }> = ({ result }) => (
    <div className="mt-8 p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl ring-1 ring-white/10">
        <header className="mb-6">
            <h2 className="text-2xl font-bold text-slate-100">{result.ticker} - {result.name}</h2>
            <p className="text-slate-400">AI 深度分析報告</p>
        </header>

        <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-5 gap-4 px-4 text-sm font-semibold text-slate-400">
                <div className="col-span-1">指標</div>
                <div className="col-span-2">狀況</div>
                <div className="col-span-2">評價</div>
            </div>
            {/* Table Body */}
            <div className="space-y-3">
                {result.analysis.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 p-4 bg-slate-800/60 rounded-lg">
                        <div className="col-span-1 font-semibold text-slate-200">{item.metric}</div>
                        <div className="col-span-2 text-slate-300">{item.status}</div>
                        <div className="col-span-2 text-slate-300">{item.evaluation}</div>
                    </div>
                ))}
            </div>
        </div>

        {result.strategySuggestion && (
             <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  💡 AI 操作策略建議
                </h3>
                <p className="text-slate-300 leading-relaxed">{result.strategySuggestion}</p>
            </div>
        )}

        {result.longTermSuitability && (
             <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  🏛️ 長期持有適合度評估
                </h3>
                <p className="text-slate-300 leading-relaxed">{result.longTermSuitability}</p>
            </div>
        )}

        {result.sources && result.sources.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  分析參考來源
                </h3>
                <ul className="space-y-2">
                  {result.sources.map((source, index) => source.web && (
                    <li key={index} className="text-sm">
                      <a 
                        href={source.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-teal-400 hover:text-teal-300 hover:underline transition-colors duration-200"
                      >
                        {source.web.title || source.web.uri}
                      </a>
                    </li>
                  ))}
                </ul>
            </div>
        )}
    </div>
);

const SingleStockAnalyzer: React.FC = () => {
    const [ticker, setTicker] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SingleStockAnalysisResult | null>(null);

    const handleAnalyze = useCallback(async () => {
        if (!ticker.trim()) {
            setError('請輸入有效的股票代號。');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // Ensure ticker has .TW if it's a number
            const formattedTicker = /^\d+$/.test(ticker.trim()) ? `${ticker.trim()}.TW` : ticker.trim().toUpperCase();
            const analysisResult = await getSingleStockAnalysis(formattedTicker);
            
            setResult(analysisResult);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : '分析時發生未知錯誤，請稍後再試。';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [ticker]);

    return (
        <div className="space-y-8">
            <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl ring-1 ring-white/10">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">輸入台股代號進行 AI 深度分析</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        placeholder="例如：2330 或 2330.TW"
                        className="flex-grow p-3 bg-slate-800/70 rounded-md text-slate-100 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder:text-slate-500 border border-slate-700"
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="w-full sm:w-auto relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-teal-600 rounded-full shadow-lg overflow-hidden transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '分析中...' : '開始分析'}
                    </button>
                </div>
            </div>

            {isLoading && <LoadingSpinner />}
            {error && <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}

            {result && <AnalysisReport result={result} />}
        </div>
    );
};

export default SingleStockAnalyzer;