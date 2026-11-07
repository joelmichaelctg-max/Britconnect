import React from 'react';

interface CalibrationPlotProps {
  data: { predictedProb: number; trueProb: number; count: number }[];
  brierScore?: number;
}

export const CalibrationPlot: React.FC<CalibrationPlotProps> = ({ data, brierScore = 0.12 }) => {
  const width = 420;
  const height = 230;
  const padding = 36;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
          Reliability diagram: Model probabilities vs observed outcomes
        </span>
        <span className="font-mono text-xs font-semibold text-[#A8841A]">
          Brier Score: {brierScore.toFixed(4)}
        </span>
      </div>

      <div className="flex justify-center">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible max-w-lg">
          {/* Subtle baseline axis */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#13294B"
            strokeWidth="1.5"
            className="dark:stroke-[#1F3A66]"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#13294B"
            strokeWidth="1.5"
            className="dark:stroke-[#1F3A66]"
          />

          {/* Perfect Calibration Diagonal (Gold dashed) */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={padding}
            stroke="#C9A227"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Calibration Points & Connecting Line */}
          {data.length > 1 && (
            <path
              d={data
                .map((pt, idx) => {
                  const x = padding + pt.predictedProb * plotWidth;
                  const y = height - padding - pt.trueProb * plotHeight;
                  return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#13294B"
              strokeWidth="2"
              className="dark:stroke-[#E0BB4A]"
            />
          )}

          {data.map((pt, idx) => {
            const cx = padding + pt.predictedProb * plotWidth;
            const cy = height - padding - pt.trueProb * plotHeight;
            return (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  fill="#8B1A1A"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Ticks and labels */}
          <text x={padding} y={height - padding + 14} fontSize="9" fill="#5C6370" textAnchor="middle">
            0%
          </text>
          <text x={width - padding} y={height - padding + 14} fontSize="9" fill="#5C6370" textAnchor="middle">
            100%
          </text>
          <text x={padding - 8} y={height - padding} fontSize="9" fill="#5C6370" textAnchor="end">
            0%
          </text>
          <text x={padding - 8} y={padding + 5} fontSize="9" fill="#5C6370" textAnchor="end">
            100%
          </text>

          <text
            x={width / 2}
            y={height - 6}
            fontSize="10"
            fontWeight="bold"
            fill="#5C6370"
            textAnchor="middle"
          >
            Predicted Churn Probability
          </text>
          <text
            x={-height / 2}
            y={12}
            transform="rotate(-90)"
            fontSize="10"
            fontWeight="bold"
            fill="#5C6370"
            textAnchor="middle"
          >
            Observed True Proportion
          </text>
        </svg>
      </div>
    </div>
  );
};
