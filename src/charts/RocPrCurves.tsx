import React, { useState } from 'react';

interface RocPrCurvesProps {
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
  prCurve: { recall: number; precision: number; threshold: number }[];
  rocAuc: number;
  prAuc: number;
}

export const RocPrCurves: React.FC<RocPrCurvesProps> = ({
  rocCurve,
  prCurve,
  rocAuc,
  prAuc,
}) => {
  const [activeTab, setActiveTab] = useState<'roc' | 'pr'>('roc');

  const width = 420;
  const height = 240;
  const padding = 36;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Generate SVG path for ROC
  let rocPath = '';
  if (rocCurve.length > 0) {
    // Sort by FPR ascending
    const sorted = [...rocCurve].sort((a, b) => a.fpr - b.fpr);
    rocPath = sorted
      .map((pt, idx) => {
        const x = padding + pt.fpr * plotWidth;
        const y = height - padding - pt.tpr * plotHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  // Generate SVG path for PR
  let prPath = '';
  if (prCurve.length > 0) {
    const sorted = [...prCurve].sort((a, b) => a.recall - b.recall);
    prPath = sorted
      .map((pt, idx) => {
        const x = padding + pt.recall * plotWidth;
        const y = height - padding - pt.precision * plotHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div className="py-2">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-[#F7F5EF] dark:bg-[#0B1F3A] p-0.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
          <button
            onClick={() => setActiveTab('roc')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'roc'
                ? 'bg-[#13294B] text-white shadow-xs'
                : 'text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A]'
            }`}
          >
            ROC Curve (AUC: {rocAuc.toFixed(3)})
          </button>
          <button
            onClick={() => setActiveTab('pr')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'pr'
                ? 'bg-[#13294B] text-white shadow-xs'
                : 'text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A]'
            }`}
          >
            PR Curve (PR-AUC: {prAuc.toFixed(3)})
          </button>
        </div>

        <span className="font-mono text-xs font-semibold text-[#A8841A]">
          {activeTab === 'roc' ? `ROC-AUC = ${rocAuc}` : `PR-AUC = ${prAuc}`}
        </span>
      </div>

      {/* SVG Canvas */}
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

          {/* Reference baseline in Gold */}
          {activeTab === 'roc' ? (
            // Diagonal random chance line
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={padding}
              stroke="#C9A227"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          ) : (
            // Horizontal baseline
            <line
              x1={padding}
              y1={height - padding - 0.20 * plotHeight}
              x2={width - padding}
              y2={height - padding - 0.20 * plotHeight}
              stroke="#C9A227"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Model Curve in Dark Red / Navy */}
          <path
            d={activeTab === 'roc' ? rocPath : prPath}
            fill="none"
            stroke="#13294B"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="dark:stroke-[#E0BB4A]"
          />

          {/* Tick labels */}
          <text x={padding} y={height - padding + 15} fontSize="9" fill="#5C6370" textAnchor="middle">
            0.0
          </text>
          <text x={width - padding} y={height - padding + 15} fontSize="9" fill="#5C6370" textAnchor="middle">
            1.0
          </text>
          <text x={padding - 10} y={height - padding} fontSize="9" fill="#5C6370" textAnchor="end">
            0.0
          </text>
          <text x={padding - 10} y={padding + 5} fontSize="9" fill="#5C6370" textAnchor="end">
            1.0
          </text>

          {/* Axis Labels */}
          <text
            x={width / 2}
            y={height - 8}
            fontSize="10"
            fontWeight="bold"
            fill="#5C6370"
            textAnchor="middle"
          >
            {activeTab === 'roc' ? 'False Positive Rate (1 - Specificity)' : 'Recall (Sensitivity)'}
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
            {activeTab === 'roc' ? 'True Positive Rate (Recall)' : 'Precision'}
          </text>
        </svg>
      </div>
    </div>
  );
};
