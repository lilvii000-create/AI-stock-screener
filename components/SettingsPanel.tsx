import React, { useState, useEffect } from 'react';
import type { StockScreenerCriteria, LongTermCriteriaSet, SelectableCriterion, MultiSelectCriterion } from '../types';

interface SettingsPanelProps {
  initialCriteria: StockScreenerCriteria;
  defaultCriteria: StockScreenerCriteria;
  onSave: (newCriteria: StockScreenerCriteria) => void;
}

// Component for a single dropdown criterion (for 5+ options)
const SelectableCriterionEditor: React.FC<{
  id: string;
  label: string;
  criterion: SelectableCriterion;
  onChange: (newValue: string) => void;
}> = ({ id, label, criterion, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5 capitalize">
      {label}
    </label>
    <select
      id={id}
      value={criterion.selectedValue}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 bg-slate-800/70 border border-slate-700 rounded-md text-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {criterion.options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

// Component for radio button criterion (for < 5 options)
const RadioButtonCriterionEditor: React.FC<{
  id: string;
  label: string;
  criterion: SelectableCriterion;
  onChange: (newValue: string) => void;
}> = ({ id, label, criterion, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">
      {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {criterion.options.map(option => (
        <label key={option} className={`relative flex items-center px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors duration-200 ${
          criterion.selectedValue === option
            ? 'bg-teal-600 text-white shadow-md'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}>
          <input
            type="radio"
            name={id}
            value={option}
            checked={criterion.selectedValue === option}
            onChange={(e) => onChange(e.target.value)}
            className="absolute opacity-0 w-0 h-0"
            aria-label={option}
          />
          {option}
        </label>
      ))}
    </div>
  </div>
);

// Component for checkbox group criterion
const CheckboxGroupCriterionEditor: React.FC<{
  id: string;
  label: string;
  criterion: MultiSelectCriterion;
  onChange: (newValues: string[]) => void;
}> = ({ id, label, criterion, onChange }) => {
  const handleChange = (option: string) => {
    const newValues = criterion.selectedValues.includes(option)
      ? criterion.selectedValues.filter(v => v !== option)
      : [...criterion.selectedValues, option];
    onChange(newValues);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2 capitalize">{label}</label>
      <div className="flex flex-wrap gap-2">
        {criterion.options.map(option => (
          <label key={option} className={`relative flex items-center px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors duration-200 ${
            criterion.selectedValues.includes(option) ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}>
            <input type="checkbox" checked={criterion.selectedValues.includes(option)} onChange={() => handleChange(option)} className="absolute opacity-0 w-0 h-0" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
};

// Component for toggle switch
const ToggleCriterionEditor: React.FC<{
  label: string;
  enabled: boolean;
  onChange: (newValue: boolean) => void;
}> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-md">
      <span className="text-sm text-slate-200">{label}</span>
      <button
        type="button"
        className={`${enabled ? 'bg-teal-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-950`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
      >
        <span className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}/>
      </button>
    </div>
);

// Main Panel Component
const SettingsPanel: React.FC<SettingsPanelProps> = ({ initialCriteria, defaultCriteria, onSave }) => {
  const [localCriteria, setLocalCriteria] = useState<StockScreenerCriteria>(
    JSON.parse(JSON.stringify(initialCriteria)) // Deep copy
  );
  const [activeSettingsTab, setActiveSettingsTab] = useState<'longTerm' | 'swingTrade'>('longTerm');


  useEffect(() => {
    setLocalCriteria(JSON.parse(JSON.stringify(initialCriteria)));
  }, [initialCriteria]);
  
  const handleLongTermChange = (
      module: keyof LongTermCriteriaSet,
      subModule: string,
      key: string,
      value: string | string[] | boolean
  ) => {
      setLocalCriteria(prev => {
          const newCriteria = JSON.parse(JSON.stringify(prev)); // Deep copy
          if (module === '核心篩選模組') {
              const subModuleContent = newCriteria.longTerm[module][subModule];
              // Special case for the competitiveness settings, which is an object of strings
              if (subModule === '產業與競爭力設定') {
                  subModuleContent[key] = value;
              } else {
                  // Handles other submodules with structured criterion objects
                  const criterion = subModuleContent[key];
                  if (criterion && typeof criterion === 'object' && 'selectedValue' in criterion) {
                      criterion.selectedValue = value;
                  } else if (criterion && typeof criterion === 'object' && 'selectedValues' in criterion) {
                      criterion.selectedValues = value;
                  }
              }
          } else if (module === '加分模組') {
               newCriteria.longTerm[module][subModule] = value;
          }
          return newCriteria;
      });
  };

  const handleSwingTradeChange = (value: string) => {
    setLocalCriteria(prev => ({
      ...prev,
      swingTrade: value,
    }));
  };

  const handleSave = () => {
    onSave(localCriteria);
  };
  
  const handleReset = () => {
    setLocalCriteria(JSON.parse(JSON.stringify(defaultCriteria)));
  };

  const { longTerm, swingTrade } = localCriteria;

  const renderCriterionEditor = (
    subModule: string,
    key: string,
    criterion: SelectableCriterion | MultiSelectCriterion
  ) => {
    const id = `longTerm-core-${subModule}-${key}`;
    
    if ('selectedValues' in criterion) { // MultiSelectCriterion
      return <CheckboxGroupCriterionEditor 
        key={id} 
        id={id} 
        label={key} 
        criterion={criterion} 
        onChange={(value) => handleLongTermChange('核心篩選模組', subModule, key, value)} />;
    }
    
    // SelectableCriterion
    const commonProps = {
      key: id,
      id: id,
      label: key,
      criterion: criterion,
      onChange: (value: string) => handleLongTermChange('核心篩選模組', subModule, key, value),
    };

    return criterion.options.length < 5 
      ? <RadioButtonCriterionEditor {...commonProps} /> 
      : <SelectableCriterionEditor {...commonProps} />;
  }
  
  const SettingsTabButton: React.FC<{tab: 'longTerm' | 'swingTrade', label: string}> = ({ tab, label }) => (
    <button
      onClick={() => setActiveSettingsTab(tab)}
      className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none border-b-2 ${
        activeSettingsTab === tab
          ? 'text-slate-100 border-teal-500'
          : 'text-slate-500 hover:text-slate-300 border-transparent hover:border-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl ring-1 ring-white/10">
      <header className="flex space-x-2 border-b border-slate-800 mb-6">
        <SettingsTabButton tab="longTerm" label="長期持有條件" />
        <SettingsTabButton tab="swingTrade" label="波段操作條件" />
      </header>

      <main className="space-y-6">
        {activeSettingsTab === 'longTerm' && (
          <div className="space-y-8">
            {/* Core Module */}
            <div className="space-y-6">
              <h4 className="text-base font-semibold text-slate-400">核心篩選模組</h4>
              <div className="space-y-6 pl-4 border-l-2 border-slate-700">
                {Object.entries(longTerm.核心篩選模組).map(([subModule, criteria]) => (
                  <div key={subModule} className="space-y-4">
                      <h5 className="text-sm font-medium text-slate-500">{subModule}</h5>
                      <div className="space-y-4">
                        {subModule === '產業與競爭力設定' ? (
                            <>
                                <p className="text-xs text-slate-500 -mt-2">
                                    請針對每家上市公司進行結構性競爭力分析，不依賴產業分類或市占率名次。請從以下五個面向進行判斷，並給出量化指標（0–100）與簡要解釋：
                                </p>
                                {Object.entries(criteria as Record<string, string>).map(([itemKey, itemValue]) => (
                                    <div key={itemKey}>
                                        <label htmlFor={`lt-comp-${itemKey}`} className="block text-sm font-medium text-slate-300 mb-1.5">
                                            {itemKey.replace(/^\d+\.\s*/, '')} {/* Clean up label for display */}
                                        </label>
                                        <textarea
                                            id={`lt-comp-${itemKey}`}
                                            value={itemValue}
                                            onChange={(e) => handleLongTermChange('核心篩選模組', subModule, itemKey, e.target.value)}
                                            className="w-full h-24 p-2 bg-slate-800/70 border border-slate-700 rounded-md text-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder:text-slate-500"
                                            rows={4}
                                        />
                                    </div>
                                ))}
                            </>
                        ) : (
                          Object.entries(criteria).map(([key, criterion]) => 
                            (typeof criterion === 'object' && criterion !== null) ? renderCriterionEditor(subModule, key, criterion as SelectableCriterion | MultiSelectCriterion) : null
                          )
                        )}
                      </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Bonus Module */}
            <div className="space-y-4">
                <h4 className="text-base font-semibold text-slate-400">加分模組</h4>
                <div className="space-y-3 pl-4 border-l-2 border-slate-700">
                   {Object.entries(longTerm.加分模組).map(([key, enabled]) => (
                      <ToggleCriterionEditor 
                        key={key}
                        label={key}
                        enabled={enabled}
                        onChange={(value) => handleLongTermChange('加分模組', key, '', value)}
                      />
                   ))}
                </div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'swingTrade' && (
           <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                波段操作核心策略
              </label>
              <textarea
                value={swingTrade}
                onChange={(e) => handleSwingTradeChange(e.target.value)}
                className="w-full h-24 p-2 bg-slate-800/70 border border-slate-700 rounded-md text-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder:text-slate-500"
                rows={4}
              />
               <p className="text-xs text-slate-500 mt-2">
                定義 AI 尋找波段機會的核心技術或題材條件。AI 將嚴格依據此描述來篩選個股。
              </p>
            </div>
          </div>
        )}
      </main>
      
      <footer className="flex justify-end items-center gap-4 pt-6 mt-8 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-semibold text-slate-400 bg-slate-800/60 rounded-md hover:bg-slate-700/80 transition-colors"
          >
            重設為預設值
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-teal-500"
          >
            儲存設定
          </button>
      </footer>
    </div>
  );
};

export default SettingsPanel;