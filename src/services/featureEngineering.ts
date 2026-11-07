import type { Customer, EngineeredFeatures } from '../types/customer';

export interface FeatureCatalogueItem {
  key: string;
  name: string;
  category: 'Usage & Billing' | 'Contract & Commercial' | 'Customer Friction & Support' | 'Engagement & NPS' | 'Lifecycle & Pressure';
  formula: string;
  description: string;
  businessRationale: string;
  leakageStatus: 'safe';
}

export const FEATURE_CATALOGUE: FeatureCatalogueItem[] = [
  {
    key: 'usageToAllowanceRatio',
    name: 'Usage to Allowance Ratio',
    category: 'Usage & Billing',
    formula: 'Average Monthly Usage GB ÷ Data Allowance GB',
    description: 'Fraction of data allowance consumed monthly.',
    businessRationale: 'High ratios (>0.9) trigger overage bill anxiety, while very low (<0.2) suggest unneeded plan spend.',
    leakageStatus: 'safe',
  },
  {
    key: 'overageFlag',
    name: 'Overage Flag',
    category: 'Usage & Billing',
    formula: '1 if Overage Charges > £0 or Usage > Allowance, else 0',
    description: 'Binary indicator of extra billing charges beyond allowance.',
    businessRationale: 'Overages are the single highest driver of sudden bill shock cancellations.',
    leakageStatus: 'safe',
  },
  {
    key: 'overageShareOfBill',
    name: 'Overage Share of Bill',
    category: 'Usage & Billing',
    formula: 'Overage Charges ÷ (Monthly Charge + Overage Charges)',
    description: 'Proportion of total bill derived from variable overage penalties.',
    businessRationale: 'Measures tariff mis-fit where customer is on too small a plan.',
    leakageStatus: 'safe',
  },
  {
    key: 'effectiveMonthlyCharge',
    name: 'Effective Monthly Charge GBP',
    category: 'Usage & Billing',
    formula: 'Monthly Charge × (1 - Discount Percent ÷ 100)',
    description: 'Actual net price paid by customer after discount.',
    businessRationale: 'Real cash collected per customer; true baseline for price sensitivity.',
    leakageStatus: 'safe',
  },
  {
    key: 'discountDependence',
    name: 'Discount Dependence',
    category: 'Usage & Billing',
    formula: 'Discount Amount ÷ Monthly Charge',
    description: 'Relative level of promotional price discounting.',
    businessRationale: 'Highly discounted customers are susceptible to churn when promos expire.',
    leakageStatus: 'safe',
  },
  {
    key: 'monthsToContractEnd',
    name: 'Months to Contract End',
    category: 'Contract & Commercial',
    formula: '(Contract End Date - As-Of Date) in months (0 if rolling)',
    description: 'Remaining commitment window until contract expires.',
    businessRationale: 'Window of highest churn probability is within 90 days before and after expiry.',
    leakageStatus: 'safe',
  },
  {
    key: 'contractExpiring90d',
    name: 'Contract Expiring 90 Days',
    category: 'Contract & Commercial',
    formula: '1 if 0 < Months to Contract End ≤ 3, else 0',
    description: 'Flag indicating imminent renewal window.',
    businessRationale: 'Regulatory Ofcom requirement for End-of-Contract Notification (ECN).',
    leakageStatus: 'safe',
  },
  {
    key: 'outOfContractFlag',
    name: 'Out of Contract Flag',
    category: 'Contract & Commercial',
    formula: '1 if Month-to-Month or Past Expiry Date, else 0',
    description: 'Customer is on a rolling tariff with zero early cancellation penalty.',
    businessRationale: 'Zero switching friction makes out-of-contract users prime competitor targets.',
    leakageStatus: 'safe',
  },
  {
    key: 'paymentRiskScore',
    name: 'Payment Risk Score',
    category: 'Usage & Billing',
    formula: '(Late Payments 12M × 1.5) + (Failed Payments 12M × 3.0)',
    description: 'Weighted measure of collections friction and billing stability.',
    businessRationale: 'Failed Direct Debits often precede involuntary and voluntary churn.',
    leakageStatus: 'safe',
  },
  {
    key: 'paymentFailureRate',
    name: 'Payment Failure Rate',
    category: 'Usage & Billing',
    formula: 'Failed Payments ÷ (Failed + Late + 12)',
    description: 'Rate of billing failures per payment cycle.',
    businessRationale: 'Identifies chronic payment friction.',
    leakageStatus: 'safe',
  },
  {
    key: 'serviceFrictionIndex',
    name: 'Service Friction Index',
    category: 'Customer Friction & Support',
    formula: 'Tickets + (Complaints × 2.0) + (Resolution Hours ÷ 24) + (Outages × 2.5)',
    description: 'Standardized cumulative service irritation score.',
    businessRationale: 'Combines technical downtime with support responsiveness into a single stress metric.',
    leakageStatus: 'safe',
  },
  {
    key: 'complaintRatePerTicket',
    name: 'Complaint Escalation Rate',
    category: 'Customer Friction & Support',
    formula: 'Complaints 12M ÷ max(1, Support Tickets 12M)',
    description: 'Proportion of support issues that escalate to formal complaints.',
    businessRationale: 'High rates signal poor first-contact resolution.',
    leakageStatus: 'safe',
  },
  {
    key: 'slowResolutionFlag',
    name: 'Slow Support Resolution Flag',
    category: 'Customer Friction & Support',
    formula: '1 if Average Resolution Hours > 24, else 0',
    description: 'Flag for support cases taking more than a full business day.',
    businessRationale: 'Prolonged resolution times severely degrade customer trust.',
    leakageStatus: 'safe',
  },
  {
    key: 'satisfactionBand',
    name: 'Satisfaction Band',
    category: 'Engagement & NPS',
    formula: 'Low (1-4), Medium (5-7), High (8-10)',
    description: 'Categorical grouping of CSAT score.',
    businessRationale: 'Simplifies sentiment stratification for executive reporting.',
    leakageStatus: 'safe',
  },
  {
    key: 'npsCategory',
    name: 'NPS Category',
    category: 'Engagement & NPS',
    formula: 'Detractor (0-6), Passive (7-8), Promoter (9-10)',
    description: 'Standard telecom NPS classification.',
    businessRationale: 'Detractors have a 5× higher likelihood of actively seeking rival providers.',
    leakageStatus: 'safe',
  },
  {
    key: 'satNpsGap',
    name: 'Satisfaction vs NPS Gap',
    category: 'Engagement & NPS',
    formula: 'Satisfaction Score (1-10) - (NPS Score clamped 0-10)',
    description: 'Discrepancy between immediate service satisfaction and brand advocacy.',
    businessRationale: 'Customers who rate service 8/10 but NPS 3/10 have silent latent churn intent.',
    leakageStatus: 'safe',
  },
  {
    key: 'tenureBand',
    name: 'Tenure Band',
    category: 'Lifecycle & Pressure',
    formula: '0-6M, 7-12M, 13-24M, 25-48M, 48M+',
    description: 'Customer age in relation to lifecycle stages.',
    businessRationale: 'New customers experience early-life onboarding churn; mid-tenure face contract expiry.',
    leakageStatus: 'safe',
  },
  {
    key: 'lifecycleStage',
    name: 'Lifecycle Stage',
    category: 'Lifecycle & Pressure',
    formula: 'New, Onboarding, Established, Mature, Legacy',
    description: 'Marketing lifecycle stage label.',
    businessRationale: 'Enables lifecycle-appropriate retention interventions.',
    leakageStatus: 'safe',
  },
  {
    key: 'pricePerGB',
    name: 'Price per Gigabyte (£/GB)',
    category: 'Usage & Billing',
    formula: 'Effective Monthly Charge ÷ max(1, Data Allowance GB)',
    description: 'Unit cost paid per included gigabyte.',
    businessRationale: 'High unit prices make customers vulnerable to competitor price-matching.',
    leakageStatus: 'safe',
  },
  {
    key: 'competitorPressure',
    name: 'Competitor Pressure Index',
    category: 'Lifecycle & Pressure',
    formula: 'Competitor Offer × (CSAT ≤ 5 ? 2.0 : 1.0) × (Expiring ? 1.5 : 1.0)',
    description: 'Interaction metric between competitor offers and vulnerability factors.',
    businessRationale: 'Competitor offers are lethal when combined with dissatisfaction and imminent contract expiry.',
    leakageStatus: 'safe',
  },
];

export function engineerCustomerFeatures(customer: Customer, asOfDateStr = '2026-11-01'): EngineeredFeatures {
  const asOf = new Date(asOfDateStr);

  // 1. Usage & Allowance
  const usage = Number(customer.averageMonthlyUsageGB) || 0;
  const allowance = Number(customer.dataAllowanceGB) || 500;
  const usageToAllowanceRatio = Number((usage / Math.max(1, allowance)).toFixed(3));
  const overageCharges = Number(customer.overageChargesGBP) || 0;
  const overageFlag = overageCharges > 0 || usage > allowance ? 1 : 0;
  const monthlyCharge = Number(customer.monthlyChargeGBP) || 40;
  const overageShareOfBill = Number((overageCharges / Math.max(1, monthlyCharge + overageCharges)).toFixed(3));

  // 2. Charges & Discounts
  const discountPct = Number(customer.discountPercent) || 0;
  const effectiveMonthlyCharge = Number((monthlyCharge * (1 - discountPct / 100)).toFixed(2));
  const discountDependence = Number((discountPct / 100).toFixed(3));

  // 3. Contract & Expiry
  const isMonthToMonth = (customer.contractType || '').toLowerCase().includes('month');
  let monthsToContractEnd = 0;
  if (!isMonthToMonth && customer.contractEndDate) {
    const end = new Date(customer.contractEndDate);
    if (!isNaN(end.getTime())) {
      const diffMs = end.getTime() - asOf.getTime();
      monthsToContractEnd = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    }
  }

  const contractExpiring90d = !isMonthToMonth && monthsToContractEnd > 0 && monthsToContractEnd <= 3 ? 1 : 0;
  const outOfContractFlag = isMonthToMonth || monthsToContractEnd === 0 ? 1 : 0;

  // 4. Payment Risk
  const late = Number(customer.latePayments12M) || 0;
  const failed = Number(customer.failedPayments12M) || 0;
  const paymentRiskScore = Number((late * 1.5 + failed * 3.0).toFixed(1));
  const paymentFailureRate = Number((failed / Math.max(1, failed + late + 12)).toFixed(3));

  // 5. Service Friction
  const tickets = Number(customer.supportTickets12M) || 0;
  const complaints = Number(customer.complaints12M) || 0;
  const resolutionHours = Number(customer.averageResolutionHours) || 8;
  const outages = Number(customer.networkOutages12M) || 0;

  const serviceFrictionIndex = Number((tickets + complaints * 2.0 + resolutionHours / 24 + outages * 2.5).toFixed(2));
  const complaintRatePerTicket = Number((complaints / Math.max(1, tickets)).toFixed(3));
  const slowResolutionFlag = resolutionHours > 24 ? 1 : 0;

  // 6. Satisfaction & NPS
  const csat = Number(customer.satisfactionScore) || 7;
  let satisfactionBand: 'Low' | 'Medium' | 'High' = 'Medium';
  if (csat <= 4) satisfactionBand = 'Low';
  else if (csat >= 8) satisfactionBand = 'High';

  const nps = Number(customer.npsScore) || 7;
  let npsCategory: 'Detractor' | 'Passive' | 'Promoter' = 'Passive';
  // If NPS is scale 0-10
  if (nps <= 6) npsCategory = 'Detractor';
  else if (nps >= 9) npsCategory = 'Promoter';

  const satNpsGap = Number((csat - Math.min(10, Math.max(0, nps))).toFixed(1));

  // 7. Tenure & Lifecycle
  const tenure = Number(customer.tenureMonths) || 12;
  let tenureBand = '13-24M';
  if (tenure <= 6) tenureBand = '0-6M';
  else if (tenure <= 12) tenureBand = '7-12M';
  else if (tenure <= 24) tenureBand = '13-24M';
  else if (tenure <= 48) tenureBand = '25-48M';
  else tenureBand = '48M+';

  let lifecycleStage = 'Established';
  if (tenure <= 3) lifecycleStage = 'New Customer';
  else if (tenure <= 6) lifecycleStage = 'Onboarding';
  else if (tenure <= 24) lifecycleStage = 'Established';
  else if (tenure <= 48) lifecycleStage = 'Mature';
  else lifecycleStage = 'Long-Term Advocate';

  const pricePerGB = Number((effectiveMonthlyCharge / Math.max(1, allowance)).toFixed(4));

  // 8. Competitor Pressure
  const competitorReceived = customer.competitorOfferReceived ? 1 : 0;
  let compPressure = competitorReceived;
  if (csat <= 5) compPressure *= 2.0;
  if (contractExpiring90d || outOfContractFlag) compPressure *= 1.5;

  return {
    usageToAllowanceRatio,
    overageFlag,
    overageShareOfBill,
    effectiveMonthlyCharge,
    discountDependence,
    monthsToContractEnd,
    contractExpiring90d,
    outOfContractFlag,
    paymentRiskScore,
    paymentFailureRate,
    serviceFrictionIndex,
    complaintRatePerTicket,
    slowResolutionFlag,
    satisfactionBand,
    npsCategory,
    satNpsGap,
    tenureBand,
    lifecycleStage,
    pricePerGB,
    competitorPressure: Number(compPressure.toFixed(2)),
  };
}
