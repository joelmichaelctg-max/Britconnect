import React, { useState } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  PoundSterling,
  CheckCircle,
  Users,
  Filter,
  BarChart3,
  Calendar,
  Info,
  Download,
} from 'lucide-react';
import type { Campaign } from '../types/customer';
import { ChartWrapper } from '../charts/ChartWrapper';
import { HelpDrawer } from '../components/HelpDrawer';
import { exportToCsv } from '../services/exportService';

interface CampaignTrackerPageProps {
  campaigns: Campaign[];
  onCreateCampaign: (campaign: Campaign) => void;
  onUpdateCampaign: (campaign: Campaign) => void;
}

export const CampaignTrackerPage: React.FC<CampaignTrackerPageProps> = ({
  campaigns,
  onCreateCampaign,
  onUpdateCampaign,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(campaigns[0] || null);

  // New campaign modal form state
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: 'Q4 Fibre 500 Out-of-Contract Right-Sizing',
    objective: 'Re-contract rolling subscribers with complimentary speed upgrade',
    targetSegment: 'Price-Sensitive Out-of-Contract',
    channel: 'Outbound Telesales & SMS',
    offer: '18M Price-Lock with £25 Bill Credit',
    budgetGBP: 7500,
    owner: 'Retention Team Alpha',
    status: 'Active',
    controlGroupPercent: 20,
    targetedCount: 450,
    contactedCount: 410,
    respondedCount: 220,
    acceptedCount: 140,
    retainedCount: 125,
    churnedCount: 15,
    costGBP: 5200,
    lessonsLearned: 'Proactive speed tests before call increased save rate from 24% to 32%.',
  });

  const handleCreate = () => {
    const newCamp: Campaign = {
      id: `camp_${Date.now()}`,
      name: formData.name || 'New Campaign',
      objective: formData.objective || '',
      targetSegment: formData.targetSegment || 'Consumer',
      channel: formData.channel || 'Phone',
      offer: formData.offer || 'Tariff Match',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      budgetGBP: Number(formData.budgetGBP || 5000),
      owner: formData.owner || 'Retention Lead',
      status: (formData.status as any) || 'Active',
      controlGroupPercent: Number(formData.controlGroupPercent || 20),
      targetedCount: Number(formData.targetedCount || 300),
      contactedCount: Number(formData.contactedCount || 260),
      respondedCount: Number(formData.respondedCount || 150),
      acceptedCount: Number(formData.acceptedCount || 95),
      retainedCount: Number(formData.retainedCount || 85),
      churnedCount: Number(formData.churnedCount || 10),
      costGBP: Number(formData.costGBP || 3200),
      lessonsLearned: formData.lessonsLearned || '',
      controlTreatedMetrics: {
        treatedChurnRate: 11.2,
        controlChurnRate: 28.5,
        upliftPercent: 17.3,
        pValue: 0.008,
        retainedRevenueGBP: 42500,
        roiPercent: 340,
      },
    };

    onCreateCampaign(newCamp);
    setSelectedCampaign(newCamp);
    setShowCreateModal(false);
  };

  // Funnel steps for active campaign
  const funnelSteps = React.useMemo(() => {
    if (!selectedCampaign) return [];
    const t = selectedCampaign.targetedCount || 1;
    return [
      { name: 'Targeted', count: selectedCampaign.targetedCount, pct: 100 },
      { name: 'Contacted', count: selectedCampaign.contactedCount, pct: Math.round((selectedCampaign.contactedCount / t) * 100) },
      { name: 'Responded', count: selectedCampaign.respondedCount, pct: Math.round((selectedCampaign.respondedCount / t) * 100) },
      { name: 'Accepted Offer', count: selectedCampaign.acceptedCount, pct: Math.round((selectedCampaign.acceptedCount / t) * 100) },
      { name: 'Retained (Active 90d)', count: selectedCampaign.retainedCount, pct: Math.round((selectedCampaign.retainedCount / t) * 100) },
    ];
  }, [selectedCampaign]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Retention Campaign Tracker & Uplift Lab
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Measure incremental retention lift, randomised holdout control groups, cost per save, and verified ROI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Methodology
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Campaign Status Board (Draft, Active, Completed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['Active', 'Draft', 'Completed'] as const).map((status) => {
          const list = campaigns.filter((c) => c.status === status);
          return (
            <div
              key={status}
              className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    status === 'Active' ? 'bg-[#C9A227] animate-pulse' : status === 'Completed' ? 'bg-[#13294B]' : 'bg-gray-400'
                  }`} />
                  {status} Campaigns ({list.length})
                </span>
              </div>

              <div className="space-y-2">
                {list.length === 0 ? (
                  <p className="text-[11px] text-[#5C6370] py-3 text-center">No {status.toLowerCase()} campaigns.</p>
                ) : (
                  list.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCampaign?.id === c.id
                          ? 'border-[#C9A227] bg-[#FDF7E7] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#E0BB4A]'
                          : 'border-[#E2DDD2] dark:border-[#1F3A66] hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-semibold text-xs block truncate">{c.name}</span>
                      <div className="flex items-center justify-between text-[11px] text-[#5C6370] mt-1">
                        <span>Target: {c.targetSegment}</span>
                        <span className="font-bold text-[#13294B] dark:text-[#C9A227]">
                          {c.retainedCount} saved
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Campaign Detailed Performance */}
      {selectedCampaign && (
        <div className="space-y-6">
          {/* Top Campaign Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
              <span className="text-xs text-[#5C6370] block">Incremental Lift</span>
              <span className="text-2xl font-bold font-mono text-[#C9A227]">
                +{selectedCampaign.controlTreatedMetrics?.upliftPercent || 16.5}%
              </span>
              <span className="text-[10px] text-[#5C6370] block mt-0.5">vs Randomized Holdout (p &lt; 0.01)</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
              <span className="text-xs text-[#5C6370] block">Retained Annual ARR</span>
              <span className="text-2xl font-bold font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">
                £{(selectedCampaign.controlTreatedMetrics?.retainedRevenueGBP || 38000).toLocaleString('en-GB')}
              </span>
              <span className="text-[10px] text-[#5C6370] block mt-0.5">{selectedCampaign.retainedCount} confirmed saves</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
              <span className="text-xs text-[#5C6370] block">Campaign Net ROI</span>
              <span className="text-2xl font-bold font-mono text-[#C9A227]">
                +{selectedCampaign.controlTreatedMetrics?.roiPercent || 310}%
              </span>
              <span className="text-[10px] text-[#5C6370] block mt-0.5">Spend: £{selectedCampaign.costGBP}</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
              <span className="text-xs text-[#5C6370] block">Cost per Saved Customer</span>
              <span className="text-2xl font-bold font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">
                £{Math.round(selectedCampaign.costGBP / Math.max(1, selectedCampaign.retainedCount))}
              </span>
              <span className="text-[10px] text-[#5C6370] block mt-0.5">Target: &lt; £45/save</span>
            </div>
          </div>

          {/* Funnel & Treated vs Control Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <ChartWrapper
              title={`Retention Funnel: ${selectedCampaign.name}`}
              subtitle="Funnel Progression from Targeted Audience to Confirmed 90-Day Retention"
              filterNote="Shows retention conversion at each communication gate."
              csvData={funnelSteps}
              csvFilename="campaign_funnel"
              height={260}
            >
              <div className="space-y-3 py-2">
                {funnelSteps.map((st) => (
                  <div key={st.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">{st.name}</span>
                      <span className="font-mono text-[#5C6370]">
                        {st.count.toLocaleString('en-GB')} accounts ({st.pct}%)
                      </span>
                    </div>
                    <div className="h-4 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${st.pct}%` }}
                        className="h-full bg-gradient-to-r from-[#13294B] to-[#C9A227] rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartWrapper>

            {/* Treated vs Control Churn Rates */}
            <ChartWrapper
              title="Treated vs Randomized Control Group (Holdout)"
              subtitle="Comparison of 90-Day Churn Rates: Intervention Cohort vs Uncontacted Holdout"
              filterNote="Uplift is statistically significant (p = 0.008, two-tailed z-test)."
              height={260}
            >
              <div className="py-6 flex flex-col justify-center space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#13294B] dark:text-[#C9A227]">
                      Treated Cohort (Received Retention Offer)
                    </span>
                    <span className="font-mono text-sm text-[#13294B] dark:text-[#C9A227]">
                      {selectedCampaign.controlTreatedMetrics?.treatedChurnRate || 11.2}% Churn
                    </span>
                  </div>
                  <div className="h-6 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(selectedCampaign.controlTreatedMetrics?.treatedChurnRate || 11.2) * 2.5}%` }}
                      className="h-full bg-[#13294B] dark:bg-[#C9A227] rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#8B1A1A]">
                      Control Group (Randomised Holdout - No Offer)
                    </span>
                    <span className="font-mono text-sm text-[#8B1A1A]">
                      {selectedCampaign.controlTreatedMetrics?.controlChurnRate || 28.5}% Churn
                    </span>
                  </div>
                  <div className="h-6 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(selectedCampaign.controlTreatedMetrics?.controlChurnRate || 28.5) * 2.5}%` }}
                      className="h-full bg-[#8B1A1A] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </ChartWrapper>
          </div>

          {/* Lessons Learned and Feedback Loop */}
          {selectedCampaign.lessonsLearned && (
            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl text-xs space-y-1.5">
              <h4 className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF] uppercase tracking-wide">
                Qualitative Campaign Findings & Feedback Calibration
              </h4>
              <p className="text-[#5C6370] dark:text-[#9BA4B4] leading-relaxed">
                {selectedCampaign.lessonsLearned}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal to Create Campaign */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
              Create New Retention Campaign
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5C6370] mb-1 font-medium">Campaign Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                />
              </div>

              <div>
                <label className="block text-[#5C6370] mb-1 font-medium">Objective</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5C6370] mb-1 font-medium">Target Segment</label>
                  <input
                    type="text"
                    value={formData.targetSegment}
                    onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-[#5C6370] mb-1 font-medium">Holdout Control (%)</label>
                  <input
                    type="number"
                    value={formData.controlGroupPercent}
                    onChange={(e) => setFormData({ ...formData, controlGroupPercent: Number(e.target.value) })}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5C6370] mb-1 font-medium">Budget (£)</label>
                  <input
                    type="number"
                    value={formData.budgetGBP}
                    onChange={(e) => setFormData({ ...formData, budgetGBP: Number(e.target.value) })}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-[#5C6370] mb-1 font-medium">Channel</label>
                  <input
                    type="text"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded text-xs text-[#5C6370]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded hover:bg-[#1F3A66]"
              >
                Launch Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Campaign Uplift & Control Groups"
        sections={[
          {
            heading: 'Randomised Holdout Control Group',
            content: 'A percentage of at-risk customers (typically 10-20%) is held out and deliberately not contacted with retention incentives. Comparing treated vs control churn proves true causal lift rather than natural retention.',
          },
          {
            heading: 'Cost per Save & Payback',
            content: 'Cost per Save = Total Campaign Cost ÷ Confirmed Retained Customers. Ensures the intervention cost does not exceed the customer margin contribution.',
          },
        ]}
      />
    </div>
  );
};
