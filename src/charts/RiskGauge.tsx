import React from 'react';
import type { RiskTier } from '../types/customer';

interface RiskGaugeProps {
  probability: number; // 0 to 1
  tier: RiskTier;
  size?: number;
  showDetails?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  probability,
  tier,
  size = 140,
  showDetails = true,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(probability * 100)));

  // Arc math
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle (180 deg)
  const offset = circumference - (pct / 100) * circumference;

  let color = '#13294B'; // Navy
  let badgeBg = 'bg-[#13294B]/10 text-[#13294B] dark:bg-[#1F3A66] dark:text-[#E0BB4A]';
  if (tier === 'Medium') {
    color = '#C9A227'; // Gold
    badgeBg = 'bg-[#FDF7E7] text-[#A8841A] dark:bg-[#A8841A]/30 dark:text-[#E0BB4A]';
  } else if (tier === 'High') {
    color = '#8B1A1A'; // Dark Red
    badgeBg = 'bg-[#FDEDED] text-[#8B1A1A] dark:bg-[#8B1A1A]/30 dark:text-[#FDEDED]';
  } else if (tier === 'Critical') {
    color = '#5E1111'; // Deep Dark Red
    badgeBg = 'bg-[#5E1111] text-white';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size * 0.65 }}>
        <svg
          width={size}
          height={size * 0.65}
          viewBox={`0 0 ${size} ${size * 0.65}`}
          className="overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#E2DDD2"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="dark:stroke-[#1F3A66]"
          />

          {/* Active Risk Value Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Value in Center */}
        <div className="absolute bottom-1 flex flex-col items-center text-center">
          <span className="text-2xl font-bold font-sans text-[#0B1F3A] dark:text-[#F7F5EF] leading-none">
            {pct}%
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Churn Risk
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${badgeBg}`}>
            {tier} Risk
          </span>
        </div>
      )}
    </div>
  );
};
