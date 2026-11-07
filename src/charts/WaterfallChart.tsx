import React from 'react';
import type { LocalDriverContribution } from '../types/customer';

interface WaterfallChartProps {
  drivers: LocalDriverContribution[];
  baseRisk?: number;
  finalRisk?: number;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  drivers,
  baseRisk = 0.18,
  finalRisk = 0.65,
}) => {
  if (!drivers || drivers.length === 0) {
    return <div className="text-xs text-[#5C6370] py-4">No driver contributions computed.</div>;
  }

  // Max contribution for scaling
  const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.contribution)), 0.25);

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between text-xs text-[#5C6370] dark:text-[#9BA4B4] pb-1 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
        <span>Driver / Characteristic</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8B1A1A]" />
            <span>Pushes Churn UP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#13294B]" />
            <span>Pushes Churn DOWN</span>
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {drivers.map((d, idx) => {
          const isUp = d.contribution > 0;
          const barWidthPercent = Math.min(100, Math.round((Math.abs(d.contribution) / maxAbs) * 100));

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1A1A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                  {d.featureName}
                  <span className="text-[11px] font-normal text-[#5C6370] dark:text-[#9BA4B4]">
                    ({d.value})
                  </span>
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    isUp ? 'text-[#8B1A1A] dark:text-[#E0BB4A]' : 'text-[#13294B] dark:text-[#C9A227]'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {(d.contribution * 100).toFixed(1)}%
                </span>
              </div>

              {/* Centered or Split Bar */}
              <div className="h-4 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-full overflow-hidden flex relative">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#E2DDD2] dark:bg-[#1F3A66] z-10" />

                {isUp ? (
                  // Extends to the right from center
                  <div className="w-1/2 flex justify-start pl-[50%]">
                    <div
                      style={{ width: `${barWidthPercent / 2}%` }}
                      className="h-full bg-[#8B1A1A] rounded-r-md transition-all duration-500"
                    />
                  </div>
                ) : (
                  // Extends to the left from center
                  <div className="w-1/2 flex justify-end">
                    <div
                      style={{ width: `${barWidthPercent / 2}%` }}
                      className="h-full bg-[#13294B] dark:bg-[#C9A227] rounded-l-md transition-all duration-500"
                    />
                  </div>
                )}
              </div>

              {d.benchmarkValue && (
                <div className="text-[10px] text-[#5C6370]/80 dark:text-[#9BA4B4]/80 mt-0.5 flex justify-end">
                  Benchmark: {d.benchmarkValue}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
