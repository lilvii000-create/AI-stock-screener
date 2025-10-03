import React from 'react';
import type { StockInfo } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import StockItem from './StockItem';
import BlinkingEllipsis from './BlinkingEllipsis';

interface StockTableProps {
  data: StockInfo[];
  type: 'longTerm' | 'swingTrade';
  isScreening: boolean;
  onLoadMore: () => void;
  isMoreLoading: boolean;
  onLoosenCriteria: () => void;
  analysisMessage: string | null;
}

const StockTable: React.FC<StockTableProps> = ({ data, type, isScreening, onLoadMore, isMoreLoading, onLoosenCriteria, analysisMessage }) => {
  const hasData = data && data.length > 0;

  if (!isScreening && !hasData) {
    return (
      <div className="text-center py-8">
        {analysisMessage && (
          <div className="p-4 mb-6 text-sm text-amber-200 bg-amber-900/40 rounded-lg ring-1 ring-amber-500/30 max-w-md mx-auto">
            <p><strong className="font-semibold">AI 分析師回饋：</strong>{analysisMessage}</p>
          </div>
        )}
        <p className="text-slate-500">AI 找不到符合條件的個股，請嘗試放寬您的策略設定。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {analysisMessage && !isScreening && data.length < 5 && (
        <div className="p-4 text-sm text-amber-100 bg-amber-900/50 rounded-lg ring-1 ring-amber-500/30">
          <p><strong className="font-semibold">AI 分析師回饋：</strong>{analysisMessage}</p>
        </div>
      )}

      {data.map((stock) => (
        <StockItem key={stock.ticker} stock={stock} type={type} />
      ))}
      
      {isScreening && (
        <div className="flex items-center justify-center text-center text-slate-500 py-6">
            <span>AI 仍在搜尋更多個股中</span>
            <BlinkingEllipsis />
        </div>
      )}

      {!isScreening && hasData && (
         <div className="pt-4">
            {data.length < 5 ? (
              <button
                onClick={onLoosenCriteria}
                disabled={isMoreLoading}
                className="w-full flex items-center justify-center px-6 py-3 text-sm font-semibold text-amber-950 bg-amber-500 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMoreLoading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 mr-3" />
                    <span>AI 搜尋中...</span>
                  </>
                ) : (
                  'AI 自動放寬條件'
                )}
              </button>
            ) : (
               <button
                onClick={onLoadMore}
                disabled={isMoreLoading}
                className="w-full flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-300 bg-slate-700/50 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:bg-slate-700/80 focus:outline-none focus:ring-4 focus:ring-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMoreLoading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 mr-3" />
                    <span>載入更多...</span>
                  </>
                ) : (
                  '載入更多'
                )}
              </button>
            )}
        </div>
      )}
    </div>
  );
};

export default StockTable;