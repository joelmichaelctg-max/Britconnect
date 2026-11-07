import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Download,
  FileText,
  Clock,
  UserCheck,
  AlertCircle,
  PoundSterling,
  Info,
  Sliders,
  Send,
  Edit3,
} from 'lucide-react';
import type { Customer, ScoredCustomer, Campaign } from '../types/customer';
import { generateRetentionRecommendation } from '../services/geminiService';
import { exportElementToPdf, exportToCsv } from '../services/exportService';
import { HelpDrawer } from '../components/HelpDrawer';
import { logAudit } from '../services/db';

interface RetentionPageProps {
  customers: Customer[];
  scoredCustomers: ScoredCustomer[];
  onAddCampaign: (campaign: Partial<Campaign>) => void;
}

export const RetentionPage: React.FC<RetentionPageProps> = ({
  customers,
  scoredCustomers,
  onAddCampaign,
}) => {
  const [targetType, setTargetType] = useState<'top_at_risk' | 'segment' | 'single'>('top_at_risk');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(scoredCustomers[0]?.customerId || 'BC-10001');
  const [selectedSegment, setSelectedSegment] = useState<string>('Price-Sensitive Out-of-Contract');

  const [isGenerating, setIsGenerating] = useState(false);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Editable Financial Assumptions
  const [assumedSaveRate, setAssumedSaveRate] = useState(0.35);
  const [assumedCostGBP, setAssumedCostGBP] = useState(35);
  const [assumedMargin, setAssumedMargin] = useState(0.70);
  const [isApproved, setIsApproved] = useState(false);

  // High-Risk Candidates
  const highRiskCustomers = React.useMemo(() => {
    return [...scoredCustomers]
      .filter((c) => c.churnStatus === 'Active')
      .sort((a, b) => b.churnProbability - a.churnProbability)
      .slice(0, 15);
  }, [scoredCustomers]);

  const handleGenerateRecommendation = async () => {
    setIsGenerating(true);
    setIsApproved(false);

    try {
      let targetCust = scoredCustomers.find((c) => c.customerId === selectedCustomerId) || highRiskCustomers[0] || customers[0];

      const res = await generateRetentionRecommendation(
        targetCust,
        selectedSegment,
        targetCust?.localDrivers || [],
        {
          monthlyChargeGBP: targetCust?.monthlyChargeGBP || 45,
          churnProb: (targetCust as any)?.churnProbability || 0.65,
        }
      );

      setActivePlan(res.recommendation);
      logAudit('RETENTION_PLAN_GENERATED', `Generated retention plan for ${targetCust?.customerId || selectedSegment}`);
    } catch (err) {
      console.error('Retention generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Recalculate financial impact dynamically if user modifies assumptions
  const dynamicFinancials = React.useMemo(() => {
    if (!activePlan) return null;
    const baseRev = activePlan.financialImpact?.retainedAnnualRevenueGBP || 520;
    const recalculatedRev = Math.round(baseRev * (assumedSaveRate / 0.35));
    const cost = assumedCostGBP;
    const netProfit = Math.round(recalculatedRev * assumedMargin - cost);
    const roi = cost > 0 ? Math.round((netProfit / cost) * 100) : 250;
    const payback = cost > 0 ? Number(((cost / Math.max(1, (recalculatedRev * assumedMargin) / 12))).toFixed(1)) : 1.2;

    return {
      saveRateRange: `${Math.round(assumedSaveRate * 100 - 5)}% – ${Math.round(assumedSaveRate * 100 + 5)}%`,
      retainedAnnualRevenueGBP: recalculatedRev,
      costOfInterventionGBP: cost,
      netRoiPercent: roi,
      paybackPeriodMonths: payback,
    };
  }, [activePlan, assumedSaveRate, assumedCostGBP, assumedMargin]);

  // Handle Send to Campaign Tracker
  const handleSendToCampaignTracker = () => {
    if (!activePlan) return;
    onAddCampaign({
      name: `Retention Intervention: ${activePlan.actions?.[0]?.title || 'Tariff Right-Sizing'}`,
      objective: 'Mitigate imminent churn in vulnerable high-risk subscribers',
      targetSegment: targetType === 'segment' ? selectedSegment : 'High & Critical Risk Active Accounts',
      channel: activePlan.actions?.[0]?.channel || 'Phone / Telesales',
      offer: activePlan.actions?.[0]?.title || 'Goodwill Credit & Contract Extension',
      budgetGBP: assumedCostGBP * 100,
      status: 'Active',
      controlGroupPercent: 20,
    });
    alert('Plan successfully converted into an Active Campaign in Campaign Tracker!');
  };

  const handleExportText = () => {
    if (!activePlan) return;
    const content = `
BRITCONNECT CUSTOMER RETENTION PLAN
Generated: ${new Date().toLocaleDateString('en-GB')}
Confidential • UK Telecommunications

1. DIAGNOSIS & EVIDENCE:
${activePlan.diagnosis}

Priority: ${activePlan.priority}
Assigned Owner: ${activePlan.owner}

2. ACTIONS & PROTOCOL:
${activePlan.actions?.map((a: any, i: number) => `
Action ${i + 1}: ${a.title}
Channel: ${a.channel} | Timing: ${a.timing}
Script / Talking Points: ${a.scriptSummary}
Commercial Guardrails: ${a.guardrails}
`).join('\n')}

3. EXPECTED FINANCIAL ROI:
- Estimated Save Rate: ${dynamicFinancials?.saveRateRange}
- Retained ARR: £${dynamicFinancials?.retainedAnnualRevenueGBP}
- Cost of Intervention: £${dynamicFinancials?.costOfInterventionGBP}
- Net ROI: ${dynamicFinancials?.netRoiPercent}%
- Payback Period: ${dynamicFinancials?.paybackPeriodMonths} months

4. COMPLIANCE & ETHICS (UK GDPR & OFCOM):
${activePlan.complianceAndEthics}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BritConnect_Retention_Plan_${selectedCustomerId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="retention-plan-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Personalised Retention Recommendations
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            AI-grounded retention playbooks with factual evidence diagnosis, concrete interventions, and dynamic ROI modeling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] dark:text-[#9BA4B4] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Compliance & Guidelines
          </button>

          {activePlan && (
            <button
              onClick={() => exportElementToPdf('retention-plan-container', `BritConnect_Retention_Plan_${selectedCustomerId}`, 'Retention Playbook')}
              className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#C9A227]" />
              Export PDF Pack
            </button>
          )}
        </div>
      </div>

      {/* Target Audience & Generator Controls Bar */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-semibold">Target Scope</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg p-2 font-medium"
            >
              <option value="top_at_risk">Top At-Risk Customer</option>
              <option value="segment">Macro Behavioral Segment</option>
              <option value="single">Specific Customer ID</option>
            </select>
          </div>

          <div>
            <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-semibold">
              {targetType === 'segment' ? 'Select Segment' : 'Select Customer Account'}
            </label>
            {targetType === 'segment' ? (
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg p-2 font-medium"
              >
                <option value="Price-Sensitive Out-of-Contract">Price-Sensitive Out-of-Contract</option>
                <option value="Service-Frustrated High Value">Service-Frustrated High Value</option>
                <option value="Silent Disengaged">Silent Disengaged</option>
                <option value="Payment-Stressed">Payment-Stressed</option>
                <option value="Competitor-Targeted">Competitor-Targeted</option>
              </select>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg p-2 font-medium"
              >
                {highRiskCustomers.map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.customerId} • £{c.monthlyChargeGBP}/mo • {c.customerSegment} • {c.riskTier}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleGenerateRecommendation}
              disabled={isGenerating}
              className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#1F3A66] disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs ring-1 ring-[#C9A227]"
            >
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              {isGenerating ? 'Synthesizing Plan...' : 'Generate AI Retention Playbook'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Plan Render */}
      {activePlan ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Banner Diagnosis */}
          <div className="bg-[#FDEDED] dark:bg-[#5E1111]/30 border-l-4 border-l-[#8B1A1A] border border-[#8B1A1A]/30 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A] dark:text-[#FDEDED] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Evidence-Based Diagnosis & Root Causes
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#8B1A1A] text-white font-bold text-[11px]">
                  Priority: {activePlan.priority}
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-[#13294B] text-[#0B1F3A] dark:text-[#F7F5EF] font-semibold border border-[#E2DDD2]">
                  Owner: {activePlan.owner}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#1A1A1A] dark:text-[#F7F5EF] leading-relaxed">
              {activePlan.diagnosis}
            </p>
          </div>

          {/* Action Protocols Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
              Personalised Action Protocols ({activePlan.actions?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlan.actions?.map((act: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                        {idx + 1}. {act.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[#5C6370] dark:text-[#9BA4B4]">
                        {act.timing}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#A8841A]">
                      Channel: {act.channel}
                    </div>
                    <p className="text-xs text-[#1A1A1A] dark:text-[#F7F5EF] leading-relaxed">
                      {act.scriptSummary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E2DDD2]/60 dark:border-[#1F3A66] text-[11px] text-[#5C6370] dark:text-[#9BA4B4]">
                    <strong>Guardrails:</strong> {act.guardrails}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Financial ROI Calculator */}
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#E2DDD2] dark:border-[#1F3A66] gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                  <PoundSterling className="w-4 h-4 text-[#C9A227]" />
                  Interactive Financial ROI & Retention Economics
                </h3>
                <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                  Adjust commercial assumptions below to simulate real-time net impact and payback horizons.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#5C6370] block">Save Rate %</label>
                  <input
                    type="number"
                    value={Math.round(assumedSaveRate * 100)}
                    onChange={(e) => setAssumedSaveRate(Number(e.target.value) / 100)}
                    className="w-16 bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-1 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#5C6370] block">Intervention Cost (£)</label>
                  <input
                    type="number"
                    value={assumedCostGBP}
                    onChange={(e) => setAssumedCostGBP(Number(e.target.value))}
                    className="w-16 bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-1 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {dynamicFinancials && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-xl text-center">
                  <span className="text-[#5C6370] text-[11px] block">Estimated Save Rate</span>
                  <strong className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {dynamicFinancials.saveRateRange}
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-xl text-center">
                  <span className="text-[#5C6370] text-[11px] block">Retained Annual Rev (ARR)</span>
                  <strong className="text-base font-bold text-[#13294B] dark:text-[#C9A227]">
                    £{dynamicFinancials.retainedAnnualRevenueGBP.toLocaleString('en-GB')}
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-xl text-center">
                  <span className="text-[#5C6370] text-[11px] block">Net Commercial ROI</span>
                  <strong className="text-base font-bold text-[#C9A227]">
                    +{dynamicFinancials.netRoiPercent}%
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-xl text-center">
                  <span className="text-[#5C6370] text-[11px] block">Payback Period</span>
                  <strong className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {dynamicFinancials.paybackPeriodMonths} Months
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Compliance, Ethics & Action Bar */}
          <div className="p-4 bg-gray-50 dark:bg-[#0B1F3A]/30 border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 max-w-xl text-xs text-[#5C6370] dark:text-[#9BA4B4]">
              <ShieldCheck className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#0B1F3A] dark:text-[#F7F5EF] block">UK Regulatory Compliance</strong>
                <span>{activePlan.complianceAndEthics}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleExportText}
                className="px-3 py-2 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-semibold hover:bg-white flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Text Export
              </button>

              <button
                onClick={() => setIsApproved(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isApproved
                    ? 'bg-[#13294B] text-[#C9A227]'
                    : 'bg-[#F7F5EF] text-[#0B1F3A] hover:bg-[#EAE6DB]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isApproved ? 'Approved by Retention Lead' : 'Approve Plan'}
              </button>

              <button
                onClick={handleSendToCampaignTracker}
                className="px-4 py-2 rounded-lg bg-[#C9A227] hover:bg-[#A8841A] text-[#0B1F3A] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Deploy to Campaign Tracker
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white dark:bg-[#13294B] rounded-xl text-center text-xs text-[#5C6370]">
          Select an audience target above and click &quot;Generate AI Retention Playbook&quot; to synthesize recommendations.
        </div>
      )}

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Retention Playbook Guidelines"
        sections={[
          {
            heading: 'Factual Grounding Rule',
            content: 'Retention diagnosis strictly cites pre-computed figures from the active dataset. The AI narrates verified data and never invents metrics.',
          },
          {
            heading: 'Ofcom Fair Treatment Guidance',
            content: 'Contract re-contracting notices must offer clear, transparent information without deceptive discounts, and include standard 14-day statutory cooling-off rights.',
          },
          {
            heading: 'GDPR & Protected Characteristics',
            content: 'Under UK equality and data protection laws, demographic factors like Age and Gender cannot be used to discriminate in tariff pricing.',
          },
        ]}
        regulatoryNotes="End-of-contract notifications and save offers comply fully with Ofcom General Conditions."
      />
    </div>
  );
};
