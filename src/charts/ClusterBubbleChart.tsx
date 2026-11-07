import React from 'react';
import { PALETTE } from '../config/constants';

interface ClusterBubbleItem {
  id: number | string;
  name: string;
  churnRate: number;
  arpu: number;
  size: number;
  sharePercent: number;
  strategy: string;
}

interface ClusterBubbleChartProps {
  data: ClusterBubbleItem[];
  height?: number;
}

export const ClusterBubbleChart: React.FC<ClusterBubbleChartProps> = ({ data, height = 300 }) => {
  const width = 500;
  const padding = 45;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  if (!data || data.length === 0) {
    return <div className="text-xs text-[#5C6370] py-12 text-center">No segments available.</div>;
  }

  const maxChurn = Math.max(...data.map((d) => d.churnRate), 40);
  const maxArpu = Math.max(...data.map((d) => d.arpu), 80);
  const maxSize = Math.max(...data.map((d) => d.size), 1);

  return (
    <div className="py-2 flex justify-center">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible max-w-xl">
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

        {/* Bubbles */}
        {data.map((item, idx) => {
          const cx = padding + (item.churnRate / maxChurn) * plotWidth;
          const cy = height - padding - (item.arpu / maxArpu) * plotHeight;
          const r = Math.max(14, Math.min(38, Math.round((item.size / maxSize) * 36)));
          const color = PALETTE.categorical[idx % PALETTE.categorical.length];

          return (
            <g key={item.id} className="group cursor-pointer">
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                fillOpacity="0.75"
                stroke={color}
                strokeWidth="2"
                className="transition-transform duration-300 hover:scale-110"
              />

              {/* Direct Label */}
              <text
                x={cx}
                y={cy + 3}
                fontSize="10"
                fontWeight="bold"
                fill="#FFFFFF"
                textAnchor="middle"
                className="pointer-events-none font-sans"
              >
                C{item.id}
              </text>

              {/* Hover Tooltip Card */}
              <title>
                {`${item.name}\nChurn Rate: ${item.churnRate}%\nARPU: £${item.arpu}\nCustomers: ${item.size.toLocaleString('en-GB')} (${item.sharePercent}%)\nStrategy: ${item.strategy}`}
              </title>
            </g>
          );
        })}

        {/* Axis Ticks */}
        <text x={padding} y={height - padding + 15} fontSize="9" fill="#5C6370" textAnchor="middle">
          0%
        </text>
        <text x={width - padding} y={height - padding + 15} fontSize="9" fill="#5C6370" textAnchor="middle">
          {maxChurn.toFixed(0)}%
        </text>
        <text x={padding - 8} y={height - padding} fontSize="9" fill="#5C6370" textAnchor="end">
          £0
        </text>
        <text x={padding - 8} y={padding + 5} fontSize="9" fill="#5C6370" textAnchor="end">
          £{maxArpu.toFixed(0)}
        </text>

        {/* Axis Titles */}
        <text
          x={width / 2}
          y={height - 8}
          fontSize="10"
          fontWeight="bold"
          fill="#5C6370"
          textAnchor="middle"
        >
          Segment Churn Rate (%)
        </text>
        <text
          x={-height / 2}
          y={14}
          transform="rotate(-90)"
          fontSize="10"
          fontWeight="bold"
          fill="#5C6370"
          textAnchor="middle"
        >
          Average Monthly Revenue (ARPU £)
        </text>
      </svg>
    </div>
  );
};
