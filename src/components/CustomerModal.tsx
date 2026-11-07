import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, ShieldCheck, Calendar, Activity, PoundSterling, FileText } from 'lucide-react';
import type { Customer, ScoredCustomer } from '../types/customer';
import { RiskGauge } from '../charts/RiskGauge';
import { WaterfallChart } from '../charts/WaterfallChart';
import { computeLocalFeatureContributions } from '../ml/importance';
import { engineerCustomerFeatures } from '../services/featureEngineering';
import { generateRetentionRecommendation } from '../services/geminiService';

interface CustomerModalProps {
  customer: Customer | ScoredCustomer | null;
  onClose: () => void;
  onSendToCampaign?: (customer: Customer, plan: any) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customer,
  onClose,
  onSendToCampaign,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'retention' | 'timeline'>('overview');
  const [retentionPlan, setRetentionPlan] = useState<any>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  if (!customer) return null;

  const engineered = (customer as ScoredCustomer).engineered || engineerCustomerFeatures(customer);
  const churnProb = (customer as ScoredCustomer).churnProbability ?? (Number(customer.churnFlag) === 1 ? 0.85 : 0.22);
  const riskTier = (customer as ScoredCustomer).riskTier ?? (churnProb >= 0.75 ? 'Critical' : churnProb >= 0.50 ? 'High' : churnProb >= 0.25 ? 'Medium' : 'Low');

  const localDrivers = (customer as ScoredCustomer).localDrivers || computeLocalFeatureContributions(customer, engineered);

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const res = await generateRetentionRecommendation(
        customer,
        customer.customerSegment || 'Consumer',
        localDrivers,
        {
          monthlyChargeGBP: customer.monthlyChargeGBP,
          churnProb,
        }
      );
      setRetentionPlan(res.recommendation);
      setActiveTab('retention');
    } catch (err) {
      console.error('Plan generation failed:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between border-b border-[#C9A227]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-display">{customer.customerId}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#C9A227] text-[#0B1F3A] font-semibold">
                {customer.customerSegment}
              </span>
              <span className="text-xs text-[#E0BB4A]">
                {customer.city}, {customer.ukNation}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Plan: {customer.planName || customer.serviceType} • {customer.contractType}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1F3A66] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-[#E2DDD2] dark:border-[#1F3A66] px-6 bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
                : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            Account & Risk Profile
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'drivers'
                ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
                : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            Local Churn Drivers ({localDrivers.length})
          </button>
          <button
            onClick={() => setActiveTab('retention')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'retention'
                ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
                : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
            Personalised Retention Plan
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'timeline'
                ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
                : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
            }`}
          >
            Lifecycle Events
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Risk Top Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F7F5EF] dark:bg-[#0B1F3A]/30 p-4 rounded-xl border border-[#E2DDD2] dark:border-[#1F3A66]">
                <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#E2DDD2] dark:border-[#1F3A66] pb-3 md:pb-0">
                  <RiskGauge probability={churnProb} tier={riskTier} size={150} />
                </div>

                <div className="col-span-2 space-y-3">
                  <h4 className="text-sm font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#C9A227]" />
                    Revenue Exposure & Health Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-[#13294B] p-2.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
                      <span className="text-[#5C6370] dark:text-[#9BA4B4]">Monthly Revenue</span>
                      <p className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                        £{Number(customer.monthlyChargeGBP || 0).toFixed(2)}/mo
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#13294B] p-2.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
                      <span className="text-[#5C6370] dark:text-[#9BA4B4]">12M Expected Loss</span>
                      <p className="text-base font-bold text-[#8B1A1A] dark:text-[#FDEDED]">
                        £{(Number(customer.monthlyChargeGBP || 0) * 12 * churnProb).toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#13294B] p-2.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
                      <span className="text-[#5C6370] dark:text-[#9BA4B4]">Customer Satisfaction</span>
                      <p className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                        {customer.satisfactionScore}/10 (NPS: {customer.npsScore})
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#13294B] p-2.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66]">
                      <span className="text-[#5C6370] dark:text-[#9BA4B4]">Tenure Relationship</span>
                      <p className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                        {customer.tenureMonths} months ({engineered.lifecycleStage})
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="w-full py-2 px-4 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-[#C9A227]" />
                      {isGeneratingPlan ? 'Synthesizing with Gemini...' : 'Generate Personalised Retention Plan'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Parameter Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Contract Term</span>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F7F5EF] mt-0.5">{customer.contractType}</p>
                  <p className="text-[11px] text-[#A8841A]">
                    {engineered.outOfContractFlag ? 'Rolling / Out of Contract' : `${engineered.monthsToContractEnd}m to expiry`}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Network Outages (12M)</span>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F7F5EF] mt-0.5">
                    {customer.networkOutages12M} outages
                  </p>
                  <p className="text-[11px] text-[#5C6370]">Segment avg: 0.4</p>
                </div>

                <div className="p-3 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Monthly Data Usage</span>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F7F5EF] mt-0.5">
                    {customer.averageMonthlyUsageGB} GB / {customer.dataAllowanceGB} GB
                  </p>
                  <p className="text-[11px] text-[#5C6370]">Ratio: {(engineered.usageToAllowanceRatio * 100).toFixed(0)}%</p>
                </div>

                <div className="p-3 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Payment Stability</span>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F7F5EF] mt-0.5">
                    {customer.paymentMethod}
                  </p>
                  <p className="text-[11px] text-[#5C6370]">
                    {customer.failedPayments12M > 0 ? `${customer.failedPayments12M} failed payments` : 'Clean payment record'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                <strong>SHAP-Style Feature Attribution:</strong> Shows how each specific attribute of customer{' '}
                <strong>{customer.customerId}</strong> increases or decreases their individual churn probability relative to the overall BritConnect baseline.
              </div>

              <WaterfallChart drivers={localDrivers} baseRisk={0.18} finalRisk={churnProb} />
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-4">
              {!retentionPlan ? (
                <div className="text-center py-10 space-y-3">
                  <Sparkles className="w-10 h-10 text-[#C9A227] mx-auto animate-pulse" />
                  <h4 className="text-base font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    No Retention Plan Generated Yet
                  </h4>
                  <p className="text-xs text-[#5C6370] max-w-sm mx-auto">
                    Generate an Ofcom-compliant, personalized retention plan grounded strictly in customer {customer.customerId}&apos;s verified metrics.
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg text-xs font-semibold hover:bg-[#1F3A66] transition-colors"
                  >
                    {isGeneratingPlan ? 'Synthesizing Plan...' : 'Generate Plan Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Diagnosis */}
                  <div className="p-4 bg-[#FDEDED] dark:bg-[#5E1111]/30 border border-[#8B1A1A]/30 rounded-xl">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A] dark:text-[#FDEDED] mb-1">
                      Factual Diagnosis & Evidence
                    </h5>
                    <p className="text-xs text-[#1A1A1A] dark:text-[#F7F5EF] leading-relaxed">
                      {retentionPlan.diagnosis}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="font-semibold text-[#8B1A1A]">Priority: {retentionPlan.priority}</span>
                      <span className="text-[#5C6370]">•</span>
                      <span className="text-[#5C6370]">Assigned Owner: {retentionPlan.owner}</span>
                    </div>
                  </div>

                  {/* Concrete Actions */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
                      Personalised Action Protocol
                    </h5>
                    {retentionPlan.actions?.map((act: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                            {idx + 1}. {act.title}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[#5C6370] dark:text-[#9BA4B4]">
                            Channel: {act.channel} • {act.timing}
                          </span>
                        </div>
                        <p className="text-xs text-[#1A1A1A] dark:text-[#F7F5EF]">{act.scriptSummary}</p>
                        <p className="text-[11px] text-[#A8841A]">Guardrails: {act.guardrails}</p>
                      </div>
                    ))}
                  </div>

                  {/* Financial Business Impact */}
                  {retentionPlan.financialImpact && (
                    <div className="p-4 bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 rounded-xl border border-[#E2DDD2] dark:border-[#1F3A66] space-y-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1">
                        <PoundSterling className="w-3.5 h-3.5 text-[#C9A227]" />
                        Estimated Business ROI & Payback
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[#5C6370]">Estimated Save Rate</span>
                          <p className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                            {retentionPlan.financialImpact.estimatedSaveRate}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#5C6370]">Retained ARR</span>
                          <p className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                            £{retentionPlan.financialImpact.retainedAnnualRevenueGBP}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#5C6370]">Intervention Cost</span>
                          <p className="font-bold text-[#8B1A1A]">
                            £{retentionPlan.financialImpact.costOfInterventionGBP}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#5C6370]">Expected Net ROI</span>
                          <p className="font-bold text-[#C9A227]">
                            {retentionPlan.financialImpact.netRoiPercent}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compliance and Ethics Note */}
                  <div className="p-3 bg-gray-50 dark:bg-[#0B1F3A]/20 rounded-lg text-[11px] text-[#5C6370] dark:text-[#9BA4B4] border border-[#E2DDD2] dark:border-[#1F3A66] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                    <span>{retentionPlan.complianceAndEthics}</span>
                  </div>

                  {onSendToCampaign && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => onSendToCampaign(customer, retentionPlan)}
                        className="px-4 py-2 bg-[#C9A227] hover:bg-[#A8841A] text-[#0B1F3A] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Send to Campaign Tracker
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4 py-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#5C6370] dark:text-[#9BA4B4]">
                Recorded Account History & Temporal Milestones
              </h5>
              <div className="relative pl-6 border-l-2 border-[#C9A227] space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-[#13294B] border-2 border-[#C9A227]" />
                  <span className="text-xs font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    Join Date: {customer.joinDate}
                  </span>
                  <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                    Acquired via {customer.acquisitionChannel} on {customer.serviceType}.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-[#13294B] border-2 border-[#C9A227]" />
                  <span className="text-xs font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    Contract Start: {customer.contractStartDate}
                  </span>
                  <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                    Subscribed to {customer.planName || 'Standard Package'} under {customer.contractType} terms.
                  </p>
                </div>

                {customer.contractEndDate && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-[#C9A227] border-2 border-white" />
                    <span className="text-xs font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                      Contract Expiry: {customer.contractEndDate}
                    </span>
                    <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                      {engineered.outOfContractFlag ? 'Contract has elapsed; rolling status.' : 'Scheduled commitment termination date.'}
                    </p>
                  </div>
                )}

                {customer.churnDate && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-[#8B1A1A] border-2 border-white" />
                    <span className="text-xs font-semibold text-[#8B1A1A] dark:text-[#FDEDED]">
                      Cancellation Date: {customer.churnDate}
                    </span>
                    <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                      Reason: {customer.churnReason || 'Not stated'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
