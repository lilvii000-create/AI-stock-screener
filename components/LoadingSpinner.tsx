import React, { useEffect, useMemo, useState } from 'react';

// --- SVG Icons ---
const MoneyBillIcon = () => (
  <svg className="w-8 h-8 text-gray-500/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="8" width="18" height="8" rx="1.5" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

const CoinIcon = () => (
    <svg className="w-6 h-6 text-gray-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-12M15 9H9.5a2.5 2.5 0 110 6H15" />
    </svg>
);

const WireframeBillStackIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1">
        <rect x="4" y="22" width="32" height="6" rx="2" strokeOpacity="0.5"/>
        <rect x="4" y="16" width="32" height="6" rx="2" strokeOpacity="0.7"/>
        <rect x="4" y="10" width="32" height="6" rx="2"/>
    </svg>
);

const WireframeCoinStackIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1">
        <path d="M8,30 C8,32.209139 13.372583,34 20,34 C26.627417,34 32,32.209139 32,30" strokeOpacity="0.5"/>
        <ellipse cx="20" cy="30" rx="12" ry="4" fill="none" strokeOpacity="0.5"/>
        <path d="M8,26 C8,28.209139 13.372583,30 20,30 C26.627417,30 32,28.209139 32,26" strokeOpacity="0.7"/>
        <ellipse cx="20" cy="26" rx="12" ry="4" fill="none" strokeOpacity="0.7"/>
        <path d="M8,22 C8,24.209139 13.372583,26 20,26 C26.627417,26 32,24.209139 32,22" strokeOpacity="0.9"/>
        <ellipse cx="20" cy="22" rx="12" ry="4" fill="none" strokeOpacity="0.9"/>
        <ellipse cx="20" cy="18" rx="12" ry="4" fill="none"/>
    </svg>
);


// --- CSS Keyframe Animations ---
const screeningAnimation = `
  @keyframes fallAndFade {
    0% { transform: translateY(-50px) rotate(var(--start-rot)) scale(0.9); opacity: 0; }
    20% { opacity: 0.8; }
    100% { transform: translateY(200px) rotate(var(--end-rot)) scale(1.1); opacity: 0; }
  }
`;

const allocationAnimation = `
  @keyframes flyLeft {
    0% { transform: translate(0, 0) scale(1); opacity: 0; }
    20% { transform: translate(0, -20px) scale(1.1); opacity: 1; }
    80% { transform: translate(-70px, -20px) scale(0.8); opacity: 1; }
    100% { transform: translate(-70px, 0) scale(0.8); opacity: 0; }
  }
  @keyframes flyRight {
    0% { transform: translate(0, 0) scaleY(1); opacity: 0; }
    20% { transform: translate(0, -20px) scaleY(1.2); opacity: 1; }
    80% { transform: translate(70px, -20px) scaleY(0.8); opacity: 1; }
    100% { transform: translate(70px, 0) scaleY(0.8); opacity: 0; }
  }
`;

// --- Components ---
const BlinkingDots = () => (
    <span className="inline-flex items-center ml-1">
        <span className="w-1 h-1 bg-gray-500 rounded-full animate-blink" style={{ animationDelay: '0s' }}></span>
        <span className="w-1 h-1 bg-gray-500 rounded-full ml-1 animate-blink" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-1 h-1 bg-gray-500 rounded-full ml-1 animate-blink" style={{ animationDelay: '0.4s' }}></span>
    </span>
);

const screeningMessages = [
  '正在跟財神爺打聽內線', 'AI 正在夜觀星象，尋找下一支妖股', '說服電腦不要買航運股',
  '掃描全宇宙的財報，連外星人的都沒放過', '正在跟巴菲特心靈溝通，但他只回「買就對了」',
  '賄賂演算法，這次保證不買在高點', '跟量子電腦比腕力，為了你的報酬率',
  '正在詠唱古老的選股咒語', '重新計算宇宙的漲跌機率', '詢問魔法海螺現在該買什麼',
  '幫主力畫 K 線中，請稍候', '分析師的鍵盤正在冒煙'
];

const allocationMessages = [
  '正在為您的資金尋找最佳歸宿', 'AI 正在沙盤推演，模擬各種市場情境',
  '計算最佳投入比例，精準度堪比火箭科學', '正在與華爾街的狼群進行高端對話',
  '配置您的資產，就像在玩一場高風險的樂高', '尋找能讓您睡得安穩的投資組合',
  'AI 正在進行深度冥想，與市場的靈魂對話', '確保每一分錢都分配在刀口上'
];

const ScreeningAnimation = () => {
  const items = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
      const startRot = Math.random() * 60 - 30;
      const endRot = startRot + Math.random() * 90 - 45;
      return {
          id: i,
          Icon: i % 2 === 0 ? MoneyBillIcon : CoinIcon,
          style: {
              left: `${Math.random() * 100}%`,
              animationName: 'fallAndFade',
              animationDuration: `${Math.random() * 3 + 2.5}s`,
              animationTimingFunction: 'linear',
              animationDelay: `${Math.random() * 3}s`,
              animationIterationCount: 'infinite',
              animationFillMode: 'backwards' as const,
              ['--start-rot' as any]: `${startRot}deg`,
              ['--end-rot' as any]: `${endRot}deg`,
          },
      }
  }), []);

  return (
    <div className="relative w-64 h-48">
      {items.map(item => (
        <div key={item.id} className="absolute top-0" style={item.style}>
          <item.Icon />
        </div>
      ))}
    </div>
  );
};

const AllocationAnimation = () => (
    <div className="relative w-48 h-40 flex justify-center items-center">
        {/* Destination Stacks */}
        <div className="absolute w-12 h-12 text-gray-500" style={{ left: '10%' }}>
            <WireframeBillStackIcon className="w-full h-full"/>
        </div>
        <div className="absolute w-12 h-12 text-gray-500" style={{ right: '10%' }}>
            <WireframeCoinStackIcon className="w-full h-full"/>
        </div>
        
        {/* Source Stack (in the middle) */}
        <div className="absolute w-12 h-12 text-gray-400">
            <WireframeBillStackIcon className="w-full h-full"/>
        </div>

        {/* Flying Bill to Left */}
        <div className="absolute w-12 h-12 text-blue-400" style={{ animation: `flyLeft 2.5s ease-in-out infinite`, animationDelay: '0s' }}>
            <svg className="w-full h-full" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="16" width="32" height="6" rx="2" />
            </svg>
        </div>
        
        {/* Flying Coin to Right */}
        <div className="absolute w-12 h-12 text-emerald-400" style={{ animation: `flyRight 2.5s ease-in-out infinite`, animationDelay: '0.8s' }}>
            <svg className="w-full h-full" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="20" cy="22" rx="12" ry="4" />
            </svg>
        </div>
    </div>
);


interface LoadingSpinnerProps {
    mode?: 'screening' | 'allocation';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ mode = 'screening' }) => {
  const [message, setMessage] = useState('');
  const messages = mode === 'allocation' ? allocationMessages : screeningMessages;

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `${screeningAnimation}\n${allocationAnimation}`;
    document.head.appendChild(styleElement);
    
    const generateMessage = () => {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setMessage(randomMessage);
    };

    generateMessage();
    const messageInterval = setInterval(generateMessage, 4000);

    return () => {
      document.head.removeChild(styleElement);
      clearInterval(messageInterval);
    };
  }, [messages]);

  return (
    <div className="flex justify-center items-center p-8">
      <div className="flex flex-col items-center">
        {mode === 'screening' ? <ScreeningAnimation /> : <AllocationAnimation />}
        <div className="mt-4 text-gray-500 text-center h-10 flex justify-center items-center">
            <p className="whitespace-nowrap">{message}</p>
            <BlinkingDots />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;