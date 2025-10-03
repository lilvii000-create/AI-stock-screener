import React from 'react';

const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="25 25 50 50"
    // The animate-spin class is still used for rotation, but its keyframes are updated in index.html
    className={`animate-spin ${props.className || ''}`}
    {...props}
  >
    <circle
      // This new class handles the pulsing arc effect
      className="spinner-path"
      cx="50"
      cy="50"
      r="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="4" // Make stroke a bit thicker for visibility
    />
  </svg>
);

export default SpinnerIcon;