import React from 'react';

const BlinkingEllipsis: React.FC = () => (
  <span className="inline-flex items-end ml-1" aria-label="loading">
    <span className="w-1.5 h-1.5 bg-current rounded-full animate-blink" style={{ animationDelay: '0s' }}></span>
    <span className="w-1.5 h-1.5 bg-current rounded-full ml-1 animate-blink" style={{ animationDelay: '0.2s' }}></span>
    <span className="w-1.5 h-1.5 bg-current rounded-full ml-1 animate-blink" style={{ animationDelay: '0.4s' }}></span>
  </span>
);

export default BlinkingEllipsis;
