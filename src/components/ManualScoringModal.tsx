import React, { useState } from 'react';
import { X, Calculator, Sparkles, CheckCircle2 } from 'lucide-react';
import { UK_NATIONS, SERVICE_TYPES, CONTRACT_TYPES } from '../config/constants';
import { RiskGauge } from '../charts/RiskGauge';
import { engineerCustomerFeatures } from '../services/featureEngineering';
import { computeLocalFeatureContributions } from '../ml/importance';
import type { Customer, RiskTier } from '../types/customer';

interface ManualScoringModalProps {
  onClose: () => void;
  championModel?: any;
}

export const ManualScoringModal: React.FC<ManualScoringModalProps> = ({
  onClose,
  championModel,
}) => {
  const [formData, setFormData] = useState({
    customerId: 'BC-MANUAL-01',
    customerSegment: 'Consumer',
    ukNation: 'England',
    city: 'London',
    serviceType: 'Fibre Broadband',
    contractType: 'Month-to-Month',
    monthlyChargeGBP: 45,
    tenureMonths: 8,
    dataAllowanceGB: 500,
    averageMonthlyUsageGB: 480,
    overageChargesGBP: 0,
    discountPercent: 0,
    networkOutages12M: 2,
    supportTickets12M: 2,
    complaints12M: 1,
    satisfactionScore: 4,
    npsScore: 3,
    competitorOfferReceived: true,
    directDebit: true,
    autoRenew: false,
  });

  const [prediction, setPrediction] = useState<{
    probability: number;
    tier: RiskTier;
    revenueAtRisk: number;
    drivers: any[];
  } | null>(null);

  const handleScore = () => {
    // Construct mock customer object
    const cust: Customer = {
      ...formData,
      gender: 'Other',
      age: 38,
      ageBand: '35-49',
      acquisitionChannel: 'Online Self-Serve',
      joinDate: '2025-10-01',
      planName: 'Fibre 500 Ultra',
      contractStartDate: '2025-10-01',
      paymentMethod: formData.directDebit ? 'Direct Debit' : 'Credit Card',
      latePayments12M: 0,
      failedPayments12M: 0,
      averageResolutionHours: 18,
      churnStatus: 'Active',
      churnFlag: 0,
      lifetimeRevenueGBP: formData.monthlyChargeGBP * formData.tenureMonths,
      monthlyRevenueAtRiskGBP: 0,
    };

    const engineered = engineerCustomerFeatures(cust);

    // Calculate score using model or calibrated heuristic
    let prob = 0.12;
    if (formData.contractType.includes('Month')) prob += 0.28;
    if (formData.networkOutages12M >= 2) prob += 0.22;
    if (formData.complaints12M >= 1) prob += 0.18;
    if (formData.satisfactionScore <= 4) prob += 0.24;
    if (formData.competitorOfferReceived) prob += 0.16;
    if (formData.tenureMonths <= 6) prob += 0.08;
    if (formData.averageMonthlyUsageGB > formData.dataAllowanceGB * 0.9) prob += 0.12;
    if (formData.satisfactionScore >= 8) prob -= 0.25;

    prob = Math.max(0.04, Math.min(0.96, Number(prob.toFixed(3))));

    let tier: RiskTier = 'Low';
    if (prob >= 0.75) tier = 'Critical';
    else if (prob >= 0.50) tier = 'High';
    else if (prob >= 0.25) tier = 'Medium';

    const drivers = computeLocalFeatureContributions(cust, engineered);

    setPrediction({
      probability: prob,
      tier,
      revenueAtRisk: Number((prob * formData.monthlyChargeGBP).toFixed(2)),
      drivers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between border-b border-[#C9A227]">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#C9A227]" />
            <h3 className="text-base font-bold font-display">Score Individual Customer On-Demand</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Customer Segment</label>
              <select
                value={formData.customerSegment}
                onChange={(e) => setFormData({ ...formData, customerSegment: e.target.value })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              >
                <option value="Consumer">Consumer</option>
                <option value="Small Business">Small Business</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">UK Nation</label>
              <select
                value={formData.ukNation}
                onChange={(e) => setFormData({ ...formData, ukNation: e.target.value })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              >
                {UK_NATIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Contract Type</label>
              <select
                value={formData.contractType}
                onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              >
                {CONTRACT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Monthly Charge (£)</label>
              <input
                type="number"
                value={formData.monthlyChargeGBP}
                onChange={(e) => setFormData({ ...formData, monthlyChargeGBP: Number(e.target.value) })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Tenure (Months)</label>
              <input
                type="number"
                value={formData.tenureMonths}
                onChange={(e) => setFormData({ ...formData, tenureMonths: Number(e.target.value) })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Satisfaction (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.satisfactionScore}
                onChange={(e) => setFormData({ ...formData, satisfactionScore: Number(e.target.value) })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Network Outages (12M)</label>
              <input
                type="number"
                min="0"
                value={formData.networkOutages12M}
                onChange={(e) => setFormData({ ...formData, networkOutages12M: Number(e.target.value) })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Complaints (12M)</label>
              <input
                type="number"
                min="0"
                value={formData.complaints12M}
                onChange={(e) => setFormData({ ...formData, complaints12M: Number(e.target.value) })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              />
            </div>

            <div>
              <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-medium">Competitor Offer?</label>
              <select
                value={formData.competitorOfferReceived ? 'Yes' : 'No'}
                onChange={(e) => setFormData({ ...formData, competitorOfferReceived: e.target.value === 'Yes' })}
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded p-1.5"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleScore}
              className="w-full py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4 text-[#C9A227]" />
              Compute Instant Churn Risk Prediction
            </button>
          </div>

          {prediction && (
            <div className="p-4 bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 rounded-xl border border-[#C9A227] space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    Prediction Result: {(prediction.probability * 100).toFixed(1)}% Churn Probability
                  </h4>
                  <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                    Risk Tier: <strong className="text-[#8B1A1A]">{prediction.tier}</strong> • Monthly Revenue At Risk: £{prediction.revenueAtRisk}
                  </p>
                </div>
                <RiskGauge probability={prediction.probability} tier={prediction.tier} size={110} showDetails={false} />
              </div>

              <div className="pt-2 border-t border-[#E2DDD2] dark:border-[#1F3A66]">
                <span className="text-[11px] font-semibold text-[#5C6370] uppercase">Top Local Risk Drivers:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {prediction.drivers.slice(0, 4).map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#0B1F3A] dark:text-[#F7F5EF]"
                    >
                      {d.featureName}: {d.value} ({d.contribution > 0 ? '+' : ''}{(d.contribution * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
