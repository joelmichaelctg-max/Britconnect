import React from 'react';

interface ConfusionMatrixChartProps {
  cm: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export const ConfusionMatrixChart: React.FC<ConfusionMatrixChartProps> = ({ cm }) => {
  const total = cm.tp + cm.fp + cm.tn + cm.fn || 1;

  const cells = [
    {
      label: 'True Negative (TN)',
      sub: 'Correctly Predicted Active',
      count: cm.tn,
      pct: ((cm.tn / total) * 100).toFixed(1),
      bg: 'bg-[#13294B] text-white',
    },
    {
      label: 'False Positive (FP)',
      sub: 'Type I Error: False Alarm',
      count: cm.fp,
      pct: ((cm.fp / total) * 100).toFixed(1),
      bg: 'bg-[#1F3A66]/30 text-[#0B1F3A] dark:text-[#F7F5EF]',
    },
    {
      label: 'False Negative (FN)',
      sub: 'Type II Error: Missed Churner',
      count: cm.fn,
      pct: ((cm.fn / total) * 100).toFixed(1),
      bg: 'bg-[#8B1A1A]/30 text-[#5E1111] dark:text-[#FDEDED]',
    },
    {
      label: 'True Positive (TP)',
      sub: 'Correctly Caught Churner',
      count: cm.tp,
      pct: ((cm.tp / total) * 100).toFixed(1),
      bg: 'bg-[#0B1F3A] text-white ring-2 ring-[#C9A227]',
    },
  ];

  return (
    <div className="py-2">
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border border-[#E2DDD2] dark:border-[#1F3A66] flex flex-col justify-between h-32 transition-transform hover:scale-[1.02] shadow-xs ${c.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
              <span className="font-mono text-xs opacity-80">{c.pct}%</span>
            </div>
            <div className="my-auto">
              <div className="text-2xl font-bold font-sans tracking-tight">{c.count.toLocaleString('en-GB')}</div>
            </div>
            <div className="text-[10px] opacity-75">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-3 pt-2 border-t border-[#E2DDD2]/60 dark:border-[#1F3A66]">
        <span>Actual Churned: {(cm.tp + cm.fn).toLocaleString('en-GB')}</span>
        <span>Actual Active: {(cm.tn + cm.fp).toLocaleString('en-GB')}</span>
      </div>
    </div>
  );
};
