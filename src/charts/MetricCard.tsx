import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number; // e.g. +2.4% or -1.5%
  trendInverted?: boolean; // If true, positive trend is BAD (e.g. churn rate up is bad, so dark red)
  trendPeriod?: string; // e.g. 'vs prior period'
  icon?: React.ReactNode;
  tone?: 'default' | 'gold' | 'danger' | 'navy';
  tooltip?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  trendInverted = false,
  trendPeriod = 'vs prior 30d',
  icon,
  tone = 'default',
  tooltip,
  className = '',
}) => {
  // Determine trend color
  const isPositive = (trend || 0) > 0;
  const isNeutral = trend === undefined || trend === 0;

  // If inverted (like churn rate or outages): positive = bad (dark red), negative = good (navy/gold)
  const isFavorable = trendInverted ? !isPositive : isPositive;

  const toneBorder =
    tone === 'danger'
      ? 'border-l-4 border-l-[#8B1A1A]'
      : tone === 'gold'
      ? 'border-l-4 border-l-[#C9A227]'
      : tone === 'navy'
      ? 'border-l-4 border-l-[#13294B]'
      : 'border-l-4 border-l-transparent';

  return (
    <div
      className={`bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-4.5 shadow-xs transition-all hover:shadow-md relative overflow-hidden group ${toneBorder} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6370] dark:text-[#9BA4B4]">
            {label}
          </span>
          {tooltip && (
            <div className="relative group/tip cursor-help">
              <Info className="w-3.5 h-3.5 text-[#5C6370]/60 hover:text-[#5C6370]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:block bg-[#0B1F3A] text-white text-[11px] rounded-md px-2.5 py-1.5 shadow-lg w-48 z-30 pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        {icon && (
          <div className="p-2 rounded-lg bg-[#F7F5EF] dark:bg-[#1F3A66] text-[#0B1F3A] dark:text-[#C9A227]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-2xl font-bold text-[#0B1F3A] dark:text-[#F7F5EF] tracking-tight font-sans">
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            {subValue}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          {!isNeutral ? (
            <span
              className={`inline-flex items-center font-medium px-1.5 py-0.5 rounded text-[11px] ${
                isFavorable
                  ? 'bg-[#13294B]/10 text-[#13294B] dark:bg-[#C9A227]/20 dark:text-[#E0BB4A]'
                  : 'bg-[#FDEDED] text-[#8B1A1A] dark:bg-[#5E1111]/40 dark:text-[#FDEDED]'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center text-[#5C6370] text-[11px]">
              <Minus className="w-3 h-3 mr-0.5" /> 0.0%
            </span>
          )}
          <span className="text-[#5C6370] dark:text-[#9BA4B4] text-[11px]">{trendPeriod}</span>
        </div>
      )}
    </div>
  );
};
