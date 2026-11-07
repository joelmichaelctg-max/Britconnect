import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Users,
  TrendingDown,
  Layers,
  Sparkles,
  Download,
  Info,
  CheckCircle,
  Sliders,
} from 'lucide-react';
import type { Customer, ScoredCustomer } from '../types/customer';
import { computeRuleBasedSegments, runKMeansClustering, computeKMeansElbowCurve, type RuleSegment } from '../ml/clustering';
import { ChartWrapper } from '../charts/ChartWrapper';
import { ClusterBubbleChart } from '../charts/ClusterBubbleChart';
import { HelpDrawer } from '../components/HelpDrawer';
import { exportToCsv } from '../services/exportService';

interface SegmentationPageProps {
  customers: Customer[];
  scoredCustomers: ScoredCustomer[];
  onSelectSegmentCustomerList?: (customerIds: string[], segmentName: string) => void;
}

export const SegmentationPage: React.FC<SegmentationPageProps> = ({
  customers,
  scoredCustomers,
  onSelectSegmentCustomerList,
}) => {
  const [segmentMode, setSegmentMode] = useState<'rules' | 'kmeans'>('rules');
  const [kValue, setKValue] = useState(4);
  const [showHelp, setShowHelp] = useState(false);

  // Scored risk lookup map
  const scoredRiskMap = useMemo(() => {
    const map: Record<string, number> = {};
    scoredCustomers.forEach((c) => {
      map[c.customerId] = c.churnProbability;
    });
    return map;
  }, [scoredCustomers]);

  // Compute Rule-based segments
  const ruleSegments = useMemo(() => {
    return computeRuleBasedSegments(customers, scoredRiskMap);
  }, [customers, scoredRiskMap]);

  // Compute K-Means Clustering
  const kmeansResult = useMemo(() => {
    return runKMeansClustering(customers, kValue);
  }, [customers, kValue]);

  // Elbow Curve Data for K=2 to 7
  const elbowCurve = useMemo(() => {
    return computeKMeansElbowCurve(customers);
  }, [customers]);

  // Bubble chart dataset
  const bubbleData = useMemo(() => {
    if (segmentMode === 'rules') {
      return ruleSegments.map((s) => ({
        id: s.id,
        name: s.name,
        churnRate: s.churnRate,
        arpu: s.arpu,
        size: s.size,
        sharePercent: s.sharePercent,
        strategy: s.recommendedStrategy,
      }));
    }

    return kmeansResult.clusters.map((c) => ({
      id: c.id,
      name: c.name,
      churnRate: c.churnRate,
      arpu: c.arpu,
      size: c.size,
      sharePercent: c.sharePercent,
      strategy: c.recommendedStrategy,
    }));
  }, [segmentMode, ruleSegments, kmeansResult]);

  const handleDownloadSegmentList = (segmentName: string, customerIds: string[]) => {
    const idSet = new Set(customerIds);
    const segmentCustomers = customers.filter((c) => idSet.has(c.customerId));
    exportToCsv(`BritConnect_Segment_${segmentName.replace(/\s+/g, '_')}`, segmentCustomers);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Subscriber Segmentation & Micro-Cohort Strategy
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Compare rule-based behavioral cohorts with unsupervised K-Means clustering (K=2 to 8 with elbow & silhouette optimization).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] dark:text-[#9BA4B4] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Segmentation Guide
          </button>
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-[#F7F5EF] dark:bg-[#0B1F3A] p-0.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
          <button
            onClick={() => setSegmentMode('rules')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              segmentMode === 'rules'
                ? 'bg-[#13294B] text-white shadow-xs'
                : 'text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            Rule-Based Telecom Segments (6 Cohorts)
          </button>
          <button
            onClick={() => setSegmentMode('kmeans')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              segmentMode === 'kmeans'
                ? 'bg-[#13294B] text-white shadow-xs'
                : 'text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            Unsupervised K-Means Clustering
          </button>
        </div>

        {segmentMode === 'kmeans' && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#5C6370] font-medium">Select Clusters (K):</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6].map((k) => (
                <button
                  key={k}
                  onClick={() => setKValue(k)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                    kValue === k
                      ? 'bg-[#C9A227] text-[#0B1F3A] ring-2 ring-[#0B1F3A]'
                      : 'bg-[#F7F5EF] text-[#5C6370] hover:bg-gray-200'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px] text-[#A8841A]">
              Silhouette Score: {kmeansResult.silhouette}
            </span>
          </div>
        )}
      </div>

      {/* Row 1: Segment Bubble Map & K-Means Elbow Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bubble Chart */}
        <div className="lg:col-span-2">
          <ChartWrapper
            title="Segment Attrition vs ARPU Landscape (Bubble Map)"
            subtitle="X = Churn Rate (%) • Y = ARPU (£) • Bubble Size = Customer Share"
            filterNote="High-ARPU, High-Churn cohorts located in upper right require VIP retention focus."
            csvData={bubbleData}
            csvFilename="segment_bubble_data"
            height={320}
          >
            <ClusterBubbleChart data={bubbleData} height={300} />
          </ChartWrapper>
        </div>

        {/* Elbow & Silhouette Curve (if K-Means) or Segment Quick Breakdown */}
        <div>
          {segmentMode === 'kmeans' ? (
            <ChartWrapper
              title="K-Means Elbow & Silhouette Curve"
              subtitle="Sum of Squared Errors (SSE) across Clusters K=2 to 7"
              filterNote="Optimal elbow point balances compactness and interpretability (recommended K=4)."
              csvData={elbowCurve}
              csvFilename="kmeans_elbow_curve"
              height={320}
            >
              <div className="space-y-3 py-2">
                {elbowCurve.map((pt) => {
                  const maxSse = elbowCurve[0]?.sse || 1000;
                  const barWidth = Math.min(100, Math.round((pt.sse / maxSse) * 100));
                  const isOptimal = pt.k === 4;

                  return (
                    <div key={pt.k} className="space-y-0.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                          K = {pt.k} Clusters
                          {isOptimal && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#C9A227] text-[#0B1F3A] font-bold">
                              Optimal
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[#5C6370]">SSE: {pt.sse.toLocaleString('en-GB')}</span>
                      </div>
                      <div className="h-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className={`h-full rounded-full ${isOptimal ? 'bg-[#C9A227]' : 'bg-[#13294B]'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartWrapper>
          ) : (
            <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-3 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                  Rule-Based Cohort Architecture
                </h3>
                <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-1">
                  Engineered from UK telecoms commercial rules, contract terms, overage thresholds, and Ofcom complaint patterns.
                </p>
                <div className="space-y-2 mt-4 text-xs">
                  {ruleSegments.map((s) => (
                    <div key={s.id} className="p-2 rounded-lg bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 flex items-center justify-between">
                      <span className="font-medium text-[#0B1F3A] dark:text-[#F7F5EF] truncate max-w-[150px]">
                        {s.name}
                      </span>
                      <span className="font-mono font-bold text-[#8B1A1A]">{s.churnRate}% Churn</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#FDF7E7] dark:bg-[#0B1F3A] rounded-lg text-[11px] text-[#A8841A] border border-[#C9A227]/30">
                Rule-based cohorts are 100% human-interpretable and link directly to targeted marketing campaigns.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Segment Comparison Heat-Shaded Matrix */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2DDD2] dark:border-[#1F3A66] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
              Segment Economics & Recommended Retention Strategies
            </h3>
            <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
              Heat-shaded comparison matrix across customer size, churn rate, monthly ARPU, and revenue exposure.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F5EF] dark:bg-[#0B1F3A]/60 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Segment / Cohort Name</th>
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Accounts</th>
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Base Share</th>
                <th className="py-3 px-4 font-semibold text-[#8B1A1A]">Churn Rate %</th>
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Monthly ARPU</th>
                <th className="py-3 px-4 font-semibold text-[#8B1A1A]">Rev at Risk (£)</th>
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Avg CSAT</th>
                <th className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Recommended Action</th>
                <th className="py-3 px-4 text-right font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD2]/60 dark:divide-[#1F3A66]">
              {(segmentMode === 'rules' ? ruleSegments : kmeansResult.clusters).map((seg: any) => (
                <tr key={seg.id} className="hover:bg-[#F7F5EF]/60 dark:hover:bg-[#1F3A66]/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {seg.name}
                  </td>
                  <td className="py-3 px-4 text-[#1A1A1A] dark:text-[#F7F5EF]">
                    {seg.size.toLocaleString('en-GB')}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#5C6370]">
                    {seg.sharePercent}%
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#8B1A1A]">
                    {seg.churnRate}%
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    £{seg.arpu}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#8B1A1A]">
                    £{seg.revenueAtRiskGBP.toLocaleString('en-GB')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {seg.averageSatisfaction}/10
                  </td>
                  <td className="py-3 px-4 text-[#5C6370] dark:text-[#9BA4B4] max-w-xs">
                    {seg.recommendedStrategy}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDownloadSegmentList(seg.name, seg.customerIds || [])}
                      className="px-2.5 py-1 rounded bg-[#F7F5EF] hover:bg-[#EAE6DB] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#F7F5EF] text-[11px] font-semibold transition-colors flex items-center gap-1 ml-auto"
                      title="Download Segment Customer CSV"
                    >
                      <Download className="w-3 h-3" />
                      List (CSV)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Segmentation & Behavioral Clustering"
        sections={[
          {
            heading: 'Rule-Based vs K-Means',
            content: 'Rule-based segmentation applies predefined business logic (e.g. price sensitivity, contract expiry). K-Means unsupervised clustering groups subscribers automatically based on statistical Euclidean similarity across multidimensional vectors.',
          },
          {
            heading: 'Elbow & Silhouette Validation',
            content: 'The elbow curve identifies the point of diminishing returns in variance reduction. Silhouette scores measure intra-cluster cohesion versus separation.',
          },
        ]}
        regulatoryNotes="Segment-based pricing recommendations strictly avoid differential treatment based on protected characteristics."
      />
    </div>
  );
};
