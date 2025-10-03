import React, { useState, useEffect } from 'react';
import type { AllocationPlan, AllocationCategoryPlan, AllocatedStock } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface AllocationPanelProps {
  plan: AllocationPlan | null;
  onClose: () => void;
  onCalculate: (amount: number, ratio: number) => Promise<void>; // Make it async
  // isLoading is now managed internally
}

const AllocatedStockCard: React.FC<{ stock: AllocatedStock }> = ({ stock }) => (
    <div className="bg-slate-800/70 p-4 rounded-lg">
        <div className="flex justify-between items-center">
            <p className="font-bold text-slate-100">{stock.ticker} - {stock.name}</p>
            <p className="text-lg font-semibold text-teal-400">
                {stock.amount.toLocaleString()} <span className="text-xs text-slate-400">TWD</span>
            </p>
        </div>
        <p className="mt-2 text-sm text-slate-400">
            <strong className="text-slate-300">AI 推薦理由：</strong>{stock.reason}
        </p>
    </div>
);

const AllocationCategorySection: React.FC<{ title: string; plan: AllocationCategoryPlan }> = ({ title, plan }) => (
    <div>
        <div className="flex justify-between items-baseline mb-3">
             <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
             <p className="text-sm text-slate-400">
                配置金額: <span className="font-bold text-slate-100">{plan.totalAmount.toLocaleString()} TWD</span>
             </p>
        </div>
        {plan.stocks && plan.stocks.length > 0 ? (
            <div className="space-y-3">
                {plan.stocks.map(stock => <AllocatedStockCard key={stock.ticker} stock={stock} />)}
            </div>
        ) : (
            <p className="text-center text-slate-500 p-4 bg-slate-800/60 rounded-md">AI 建議此類別暫不投入資金。</p>
        )}
    </div>
);

const AllocationControls: React.FC<{
    amount: string;
    setAmount: (val: string) => void;
    ratio: number;
    setRatio: (val: number) => void;
    onConfirm: () => void;
    isCalculating: boolean;
}> = ({ amount, setAmount, ratio, setRatio, onConfirm, isCalculating }) => (
    <div className="p-4 sm:p-6 space-y-6">
        <div>
            <label htmlFor="investmentAmount" className="block text-sm font-medium text-slate-400 mb-1.5">
              總投資金額 (TWD)
            </label>
            <div>
                <input
                  type="number"
                  id="investmentAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-md text-slate-100 text-lg font-semibold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder:text-slate-600"
                  placeholder="例如：50000"
                />
            </div>
        </div>
        <div>
             <label htmlFor="strategyRatio" className="block text-sm font-medium text-slate-400 mb-1.5">
                策略比例
            </label>
            <div className="space-y-2">
                 <input
                    id="strategyRatio"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={ratio}
                    onChange={(e) => setRatio(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>長期持有 {ratio}%</span>
                    <span>波段操作 {100 - ratio}%</span>
                </div>
            </div>
        </div>
        <div className="flex justify-end pt-2">
             <button
              onClick={onConfirm}
              disabled={isCalculating}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-teal-500 disabled:opacity-50"
            >
              {isCalculating ? '計算中...' : '確認計算'}
            </button>
        </div>
    </div>
);


const AllocationPanel: React.FC<AllocationPanelProps> = ({ plan, onClose, onCalculate }) => {
  const [isEditing, setIsEditing] = useState(!plan);
  const [amount, setAmount] = useState('50000');
  const [ratio, setRatio] = useState(50);
  const [isCalculating, setIsCalculating] = useState(false);
    
  useEffect(() => {
    if (plan && !isCalculating) {
        setIsEditing(false);
    } else if (!plan) {
        setIsEditing(true);
    }
  }, [plan, isCalculating]);

  const handleConfirmCalculation = async () => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      setIsCalculating(true);
      await onCalculate(numericAmount, ratio);
      setIsCalculating(false);
    } else {
      console.error("Invalid amount");
    }
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-950/70 backdrop-blur-xl rounded-2xl shadow-2xl text-slate-300 flex flex-col overflow-hidden ring-1 ring-white/10"
        onClick={handlePanelClick}
        aria-modal="true"
        role="dialog"
      >
        {isCalculating && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <LoadingSpinner mode="allocation" />
            </div>
        )}
        <header className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-xl font-semibold">AI 資金分配計畫</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-700/50 hover:text-white transition-colors" aria-label="關閉計畫">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="overflow-y-auto">
            {plan && !isEditing && (
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="p-4 bg-teal-900/40 rounded-lg">
                        <p className="text-sm text-teal-200"><strong className="font-semibold">AI 策略總結：</strong>{plan.summary}</p>
                    </div>
                    <AllocationCategorySection title="長期持有投資組合" plan={plan.longTermAllocation} />
                    <AllocationCategorySection title="波段操作投資組合" plan={plan.swingTradeAllocation} />
                </div>
            )}
            
            {isEditing && (
                 <AllocationControls 
                    amount={amount}
                    setAmount={setAmount}
                    ratio={ratio}
                    setRatio={setRatio}
                    onConfirm={handleConfirmCalculation}
                    isCalculating={isCalculating}
                />
            )}
        </main>
        
        <footer className="flex justify-between items-center p-4 sm:p-5 border-t border-slate-800 flex-shrink-0 bg-slate-950/50">
            {plan ? (
                 <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-700/50 rounded-md hover:bg-slate-700 transition-colors"
                >
                    {isEditing ? '取消調整' : '調整分配'}
                </button>
            ) : <div />}
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-teal-500"
            >
              關閉
            </button>
        </footer>
      </div>
    </div>
  );
};

export default AllocationPanel;
