import React from 'react';
import type { Customer } from '../types/customer';

interface CohortHeatmapProps {
  customers: Customer[];
}

export const CohortHeatmap: React.FC<CohortHeatmapProps> = ({ customers }) => {
  // Generate quarterly cohorts based on join date
  const periods = ['M0', 'M3', 'M6', 'M12', 'M18', 'M24'];

  // Group customers by join quarter
  const cohortsMap: Record<string, Customer[]> = {};
  customers.forEach((c) => {
    if (!c.joinDate) return;
    const d = new Date(c.joinDate);
    if (isNaN(d.getTime())) return;
    const year = d.getFullYear();
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const key = `${year} Q${quarter}`;
    if (!cohortsMap[key]) cohortsMap[key] = [];
    cohortsMap[key].push(c);
  });

  const cohortKeys = Object.keys(cohortsMap).sort().slice(-6); // last 6 quarters

  const cohortRows = cohortKeys.map((quarterKey) => {
    const cohortMembers = cohortsMap[quarterKey];
    const initialSize = cohortMembers.length;

    // Calculate empirical retention percentages across tenure milestones
    const retentionByMilestone: number[] = periods.map((p, pIdx) => {
      const monthReq = pIdx === 0 ? 0 : pIdx === 1 ? 3 : pIdx === 2 ? 6 : pIdx === 3 ? 12 : pIdx === 4 ? 18 : 24;
      
      const survived = cohortMembers.filter((c) => {
        // If tenure is at least monthReq or customer is still Active
        const isStillActive = c.churnStatus === 'Active';
        const tenure = c.tenureMonths || 0;
        return isStillActive || tenure >= monthReq;
      }).length;

      return initialSize > 0 ? Number(((survived / initialSize) * 100).toFixed(0)) : 100;
    });

    return {
      quarter: quarterKey,
      initialSize,
      retention: retentionByMilestone,
    };
  });

  // Helper function to color cell from navy (100%) to gold/warm (60-70%)
  const getCellBg = (val: number) => {
    if (val >= 95) return 'bg-[#0B1F3A] text-white';
    if (val >= 88) return 'bg-[#13294B] text-white';
    if (val >= 80) return 'bg-[#1F3A66] text-white';
    if (val >= 72) return 'bg-[#A8841A] text-white';
    if (val >= 65) return 'bg-[#C9A227] text-[#0B1F3A] font-semibold';
    return 'bg-[#E0BB4A] text-[#0B1F3A] font-bold';
  };

  return (
    <div className="overflow-x-auto py-2">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E2DDD2] dark:border-[#1F3A66]">
            <th className="py-2 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Cohort</th>
            <th className="py-2 px-3 font-semibold text-[#5C6370] dark:text-[#9BA4B4]">Acquired</th>
            {periods.map((p) => (
              <th key={p} className="py-2 px-3 text-center font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2DDD2]/60 dark:divide-[#1F3A66]">
          {cohortRows.map((row) => (
            <tr key={row.quarter} className="hover:bg-[#F7F5EF]/50 dark:hover:bg-[#1F3A66]/30">
              <td className="py-2.5 px-3 font-medium text-[#1A1A1A] dark:text-[#F7F5EF] whitespace-nowrap">
                {row.quarter}
              </td>
              <td className="py-2.5 px-3 text-[#5C6370] dark:text-[#9BA4B4]">
                {row.initialSize.toLocaleString('en-GB')}
              </td>
              {row.retention.map((pct, idx) => (
                <td key={idx} className="p-1 text-center">
                  <div
                    className={`py-1.5 px-2 rounded font-mono text-[11px] shadow-2xs transition-all ${getCellBg(
                      pct
                    )}`}
                    title={`${row.quarter} at ${periods[idx]}: ${pct}% retained`}
                  >
                    {pct}%
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-[#5C6370] dark:text-[#9BA4B4] mt-3 pt-2 border-t border-[#E2DDD2]/60 dark:border-[#1F3A66]">
        <span>Scale: Navy (&gt;90% Retained) → Gold (&lt;70% Retention)</span>
        <span className="font-mono text-[10px]">Empirical cohort matrix</span>
      </div>
    </div>
  );
};
