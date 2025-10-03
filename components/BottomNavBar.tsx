import React from 'react';
import ScreenerIcon from './icons/ScreenerIcon';
import AnalyzerIcon from './icons/AnalyzerIcon';
import SettingsIcon from './icons/SettingsIcon';

type MainTab = 'screener' | 'analyzer' | 'settings';

interface BottomNavBarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
}

const NavItem: React.FC<{
  tab: MainTab;
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  isActive: boolean;
  onClick: () => void;
}> = ({ tab, label, Icon, isActive, onClick }) => {
  const activeClasses = 'text-teal-400';
  const inactiveClasses = 'text-slate-500 hover:text-slate-300';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 focus:outline-none ${isActive ? activeClasses : inactiveClasses}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800">
      <div className="flex justify-around max-w-4xl mx-auto">
        <NavItem
          tab="screener"
          label="AI 選股"
          Icon={ScreenerIcon}
          isActive={activeTab === 'screener'}
          onClick={() => setActiveTab('screener')}
        />
        <NavItem
          tab="analyzer"
          label="個股分析"
          Icon={AnalyzerIcon}
          isActive={activeTab === 'analyzer'}
          onClick={() => setActiveTab('analyzer')}
        />
        <NavItem
          tab="settings"
          label="設定"
          Icon={SettingsIcon}
          isActive={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </div>
    </nav>
  );
};

export default BottomNavBar;
