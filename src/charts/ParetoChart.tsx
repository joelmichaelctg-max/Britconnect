import React from 'react';

interface ParetoItem {
  reason: string;
  count: number;
  share: number;
  cumulativeShare: number;
}

interface ParetoChartProps {
  data: ParetoItem[];
  height?: number;
}

export const ParetoChart: React.FC<ParetoChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-[#5C6370] py-12">
        No churned customer reasons recorded.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = height - 60;

  return (
    <div className="py-2">
      <div className="relative" style={{ height: chartHeight }}>
        {/* Subtle 80% reference line in Gold */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-[#C9A227] z-10 flex items-center justify-end pr-2 text-[10px] font-mono font-semibold text-[#A8841A]"
          style={{ top: `${chartHeight * 0.20}px` }}
        >
          80% Pareto Threshold
        </div>

        {/* Subtle baseline axis */}
        <div className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-[#13294B]/30 dark:bg-[#1F3A66]" />

        {/* Bars Container */}
        <div className="h-full flex items-end justify-between gap-2 px-2">
          {data.map((item, idx) => {
            const barHeight = Math.max(12, Math.round((item.count / maxCount) * (chartHeight - 40)));
            const isTop3 = idx < 3;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Direct data label above bar */}
                <div className="text-[10px] font-mono font-semibold text-[#5C6370] dark:text-[#9BA4B4] mb-1 group-hover:text-[#0B1F3A] dark:group-hover:text-[#F7F5EF] transition-colors">
                  {item.count}
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${barHeight}px` }}
                  className={`w-full max-w-[42px] rounded-t-md transition-all duration-300 relative ${
                    isTop3
                      ? 'bg-[#8B1A1A] group-hover:bg-[#A52A2A]'
                      : 'bg-[#13294B] group-hover:bg-[#1F3A66]'
                  }`}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0B1F3A] text-white text-[11px] rounded-md px-2 py-1 shadow-lg whitespace-nowrap z-30 pointer-events-none">
                    <p className="font-semibold">{item.reason}</p>
                    <p>Count: {item.count} ({item.share.toFixed(1)}%)</p>
                    <p>Cumulative: {item.cumulativeShare.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Cumulative point badge */}
                <div className="mt-1 text-[9px] font-mono font-medium text-[#A8841A]">
                  {item.cumulativeShare.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis Category Labels */}
      <div className="flex items-start justify-between gap-2 px-2 mt-2 pt-1 border-t border-[#E2DDD2]/60 dark:border-[#1F3A66]">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex-1 text-center text-[10px] text-[#5C6370] dark:text-[#9BA4B4] leading-tight line-clamp-2"
            title={item.reason}
          >
            {item.reason.split('&')[0].trim()}
          </div>
        ))}
      </div>
    </div>
  );
};
