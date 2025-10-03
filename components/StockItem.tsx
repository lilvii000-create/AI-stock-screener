import React, { useState } from 'react';
import type { StockInfo, Source } from '../types';

const SourceLinks: React.FC<{ sources?: Source[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/80">
      <h4 className="text-xs font-semibold text-slate-400 mb-2">個股參考來源</h4>
      <ul className="space-y-1.5">
        {sources.map((source, index) => source.web && (
          <li key={`${source.web.uri}-${index}`} className="text-xs truncate">
            <a
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 hover:underline transition-colors duration-200"
              title={source.web.title || source.web.uri}
            >
              {source.web.title || source.web.uri}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const StockItem: React.FC<{ stock: StockInfo, type: 'longTerm' | 'swingTrade' }> = ({ stock, type }) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl ring-1 ring-white/10 overflow-hidden shadow-2xl">
      {/* Always visible main content */}
      <div className="p-5">
        {/* Header and Buy Zone */}
        <div className="mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-100 truncate">{stock.ticker} - {stock.name}</p>
            <div className="text-sm text-slate-400 mt-1.5">
              <strong className="font-medium text-slate-300">建議買進區間: </strong>
              <span className="font-semibold text-slate-100">{stock.buyZone}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid for Swing Trade */}
        {(type === 'swingTrade' || stock.category === 'swingTrade') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {stock.stopLoss && (
              <div>
                  <strong className="block text-slate-400 font-medium">停損參考點:</strong>
                  <span className="text-red-400 font-semibold">{stock.stopLoss}</span>
              </div>
            )}
            {stock.takeProfit && (
              <div>
                  <strong className="block text-slate-400 font-medium">停利參考點:</strong>
                  <span className="text-emerald-400 font-semibold">{stock.takeProfit}</span>
              </div>
            )}
          </div>
        )}

        <SourceLinks sources={stock.sources} />
      </div>

      {/* Clickable footer to expand/collapse reasoning */}
      <div
        className="px-5 py-3 bg-transparent cursor-pointer hover:bg-slate-800/40 transition-colors duration-200 flex justify-between items-center"
        onClick={() => setIsReasoningOpen(!isReasoningOpen)}
        aria-expanded={isReasoningOpen}
      >
        <span className="text-sm font-semibold text-slate-300">AI 綜合分析理由</span>
        <svg
          className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isReasoningOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Collapsible Reasoning */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isReasoningOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5">
            <div className="border-t border-slate-700/80 pt-4 text-slate-300 text-sm space-y-2">
              <p>{stock.reasoning}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StockItem;
