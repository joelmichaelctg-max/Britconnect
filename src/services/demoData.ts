import type { Customer } from '../types/customer';
import { CHURN_REASONS } from '../config/constants';

const CITIES_BY_NATION: Record<string, string[]> = {
  England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Newcastle', 'Liverpool', 'Sheffield'],
  Scotland: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
  Wales: ['Cardiff', 'Swansea', 'Newport'],
  'Northern Ireland': ['Belfast', 'Derry', 'Lisburn'],
};

const CHANNELS = ['Online Self-Serve', 'Retail Store', 'Telesales', 'Price Comparison Website', 'Referral'];
const SEGMENTS = ['Consumer', 'Small Business', 'Enterprise'];
const SERVICE_TYPES = ['Fibre Broadband', 'Standard Broadband', 'Mobile 5G', 'Landline & VoIP', 'Full Bundle (Quad-play)'];
const PLANS = ['Fibre 100 Essential', 'Fibre 500 Ultra', 'Gigabit Pro Max', 'Mobile 50GB Flex', 'Business Connect 1G'];
const CONTRACT_TYPES = ['Month-to-Month', '12 Months', '18 Months', '24 Months'];
const PAYMENT_METHODS = ['Direct Debit', 'Credit Card', 'Bank Transfer', 'Cheque'];

export function generateSyntheticCustomerDataset(count = 1200): Customer[] {
  const customers: Customer[] = [];
  const baseYear = 2026;

  for (let i = 1; i <= count; i++) {
    const customerId = `BC-${10000 + i}`;
    const segment = Math.random() < 0.7 ? 'Consumer' : (Math.random() < 0.85 ? 'Small Business' : 'Enterprise');
    
    // Demographics
    const age = Math.floor(18 + Math.random() * 64);
    let ageBand = '18-24';
    if (age >= 25 && age < 35) ageBand = '25-34';
    else if (age >= 35 && age < 50) ageBand = '35-49';
    else if (age >= 50 && age < 65) ageBand = '50-64';
    else if (age >= 65) ageBand = '65+';

    const gender = Math.random() < 0.48 ? 'Female' : (Math.random() < 0.95 ? 'Male' : 'Non-binary / Other');

    // Geography
    const nations = ['England', 'England', 'England', 'Scotland', 'Wales', 'Northern Ireland'];
    const ukNation = nations[Math.floor(Math.random() * nations.length)];
    const cityList = CITIES_BY_NATION[ukNation] || ['London'];
    const city = cityList[Math.floor(Math.random() * cityList.length)];

    const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];

    // Dates & Tenure
    const tenureMonths = Math.floor(1 + Math.random() * 48);
    const joinMonthsAgo = tenureMonths;
    const joinDateObj = new Date(baseYear, 10 - Math.floor(joinMonthsAgo / 12), 15 - (joinMonthsAgo % 28));
    const joinDate = joinDateObj.toISOString().split('T')[0];

    const serviceType = SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
    const planName = PLANS[Math.floor(Math.random() * PLANS.length)];
    const contractType = CONTRACT_TYPES[Math.floor(Math.random() * CONTRACT_TYPES.length)];

    const isMonthToMonth = contractType === 'Month-to-Month';
    const contractTermMonths = isMonthToMonth ? 1 : (contractType === '12 Months' ? 12 : (contractType === '18 Months' ? 18 : 24));
    
    const contractStartObj = new Date(baseYear, 10 - Math.min(10, tenureMonths % 12), 1);
    const contractStartDate = contractStartObj.toISOString().split('T')[0];
    
    let contractEndDate: string | undefined = undefined;
    if (!isMonthToMonth) {
      const endObj = new Date(contractStartObj);
      endObj.setMonth(endObj.getMonth() + contractTermMonths);
      contractEndDate = endObj.toISOString().split('T')[0];
    }

    const autoRenew = !isMonthToMonth && Math.random() < 0.72;

    // Financials & Usage
    let baseCharge = serviceType.includes('Fibre') ? 38 : (serviceType.includes('Mobile') ? 22 : (serviceType.includes('Bundle') ? 68 : 30));
    if (segment === 'Small Business') baseCharge *= 1.4;
    if (segment === 'Enterprise') baseCharge *= 2.2;
    const monthlyChargeGBP = Number((baseCharge + (Math.random() * 15 - 5)).toFixed(2));

    const dataAllowanceGB = serviceType.includes('Mobile') ? (Math.random() < 0.5 ? 50 : 100) : (Math.random() < 0.7 ? 500 : 1000);
    const usageFactor = 0.4 + Math.random() * 0.7; // sometimes > 1.0 (overage)
    const averageMonthlyUsageGB = Number((dataAllowanceGB * usageFactor).toFixed(1));

    const isOverLimit = averageMonthlyUsageGB > dataAllowanceGB;
    const overageChargesGBP = isOverLimit ? Number(((averageMonthlyUsageGB - dataAllowanceGB) * 0.85).toFixed(2)) : 0;
    const discountPercent = Math.random() < 0.35 ? Number((5 + Math.random() * 20).toFixed(0)) : 0;

    const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
    const directDebit = paymentMethod === 'Direct Debit';

    // Service friction & experience metrics
    const networkOutages12M = Math.random() < 0.65 ? 0 : (Math.random() < 0.85 ? 1 : Math.floor(2 + Math.random() * 4));
    const supportTickets12M = Math.floor(networkOutages12M * 0.8 + Math.random() * 3);
    const complaints12M = supportTickets12M >= 3 ? (Math.random() < 0.6 ? 1 : 2) : (Math.random() < 0.1 ? 1 : 0);
    const averageResolutionHours = Number((6 + supportTickets12M * 4 + Math.random() * 18).toFixed(1));

    const latePayments12M = !directDebit && Math.random() < 0.25 ? Math.floor(1 + Math.random() * 3) : (Math.random() < 0.05 ? 1 : 0);
    const failedPayments12M = latePayments12M > 1 ? 1 : 0;

    // Satisfaction and NPS
    let sat = 8;
    if (networkOutages12M >= 2) sat -= 2.5;
    if (complaints12M > 0) sat -= 2;
    if (overageChargesGBP > 15) sat -= 1.5;
    if (isMonthToMonth) sat -= 0.5;
    sat = Math.max(1, Math.min(10, Math.round(sat + (Math.random() * 2 - 1))));
    const satisfactionScore = sat;

    let npsScore = satisfactionScore >= 8 ? Math.floor(7 + Math.random() * 3) : (satisfactionScore <= 4 ? Math.floor(Math.random() * 5) : Math.floor(5 + Math.random() * 3));
    const competitorOfferReceived = Math.random() < 0.32;

    // Realistic Churn Determination based on compound factors
    let churnProbabilityScore = 0.10;
    if (isMonthToMonth) churnProbabilityScore += 0.28;
    if (networkOutages12M >= 2) churnProbabilityScore += 0.22;
    if (complaints12M >= 1) churnProbabilityScore += 0.20;
    if (satisfactionScore <= 4) churnProbabilityScore += 0.25;
    if (competitorOfferReceived) churnProbabilityScore += 0.18;
    if (overageChargesGBP > 10) churnProbabilityScore += 0.15;
    if (tenureMonths <= 6) churnProbabilityScore += 0.12;
    if (autoRenew) churnProbabilityScore -= 0.14;
    if (tenureMonths > 24) churnProbabilityScore -= 0.15;
    if (satisfactionScore >= 9) churnProbabilityScore -= 0.25;

    churnProbabilityScore = Math.max(0.02, Math.min(0.95, churnProbabilityScore));
    const isChurned = Math.random() < churnProbabilityScore;

    let churnStatus: 'Active' | 'Churned' = isChurned ? 'Churned' : 'Active';
    let churnFlag = isChurned ? 1 : 0;
    let churnDate: string | undefined = undefined;
    let churnReason: string | undefined = undefined;

    if (isChurned) {
      const churnDateObj = new Date(baseYear, 10, Math.floor(1 + Math.random() * 27));
      churnDate = churnDateObj.toISOString().split('T')[0];

      // Assign reason matching highest friction
      if (networkOutages12M >= 2) {
        churnReason = 'Network Outages & Unreliable Broadband';
      } else if (competitorOfferReceived && Math.random() < 0.7) {
        churnReason = 'Better Competitor Bundle Deal';
      } else if (overageChargesGBP > 10) {
        churnReason = 'Overage Charges & Bill Shock';
      } else if (complaints12M > 0) {
        churnReason = 'Slow Customer Support Resolution';
      } else {
        churnReason = CHURN_REASONS[Math.floor(Math.random() * CHURN_REASONS.length)];
      }
    }

    const lifetimeRevenueGBP = Number((monthlyChargeGBP * tenureMonths * (1 - discountPercent / 100)).toFixed(2));
    const monthlyRevenueAtRiskGBP = isChurned ? 0 : Number((monthlyChargeGBP * churnProbabilityScore).toFixed(2));

    customers.push({
      customerId,
      customerSegment: segment,
      age,
      ageBand,
      gender,
      ukNation,
      city,
      acquisitionChannel: channel,
      joinDate,
      tenureMonths,
      serviceType,
      planName,
      contractType,
      contractStartDate,
      contractEndDate,
      autoRenew,
      monthlyChargeGBP,
      averageMonthlyUsageGB,
      dataAllowanceGB,
      overageChargesGBP,
      discountPercent,
      paymentMethod,
      directDebit,
      latePayments12M,
      failedPayments12M,
      supportTickets12M,
      complaints12M,
      averageResolutionHours,
      networkOutages12M,
      satisfactionScore,
      npsScore,
      competitorOfferReceived,
      churnStatus,
      churnDate,
      churnReason,
      lifetimeRevenueGBP,
      monthlyRevenueAtRiskGBP,
      churnFlag,
    });
  }

  return customers;
}

export function generateSampleCsvTemplate(): string {
  const headers = [
    'Customer ID',
    'Customer Segment',
    'Age',
    'Age Band',
    'Gender',
    'UK Nation',
    'City',
    'Acquisition Channel',
    'Join Date',
    'Tenure Months',
    'Service Type',
    'Plan Name',
    'Contract Type',
    'Contract Start Date',
    'Contract End Date',
    'Auto Renew',
    'Monthly Charge GBP',
    'Average Monthly Usage GB',
    'Data Allowance GB',
    'Overage Charges GBP',
    'Discount Percent',
    'Payment Method',
    'Direct Debit',
    'Late Payments 12M',
    'Failed Payments 12M',
    'Support Tickets 12M',
    'Complaints 12M',
    'Average Resolution Hours',
    'Network Outages 12M',
    'Satisfaction Score 1 10',
    'NPS Score',
    'Competitor Offer Received',
    'Churn Status',
    'Churn Date',
    'Churn Reason',
    'Lifetime Revenue GBP',
    'Monthly Revenue At Risk GBP',
    'Churn Flag',
  ];

  const demoRows = generateSyntheticCustomerDataset(10);
  const rows = demoRows.map((c) => [
    c.customerId,
    c.customerSegment,
    c.age,
    c.ageBand,
    c.gender,
    c.ukNation,
    c.city,
    c.acquisitionChannel,
    c.joinDate,
    c.tenureMonths,
    c.serviceType,
    c.planName,
    c.contractType,
    c.contractStartDate,
    c.contractEndDate || '',
    c.autoRenew ? 'Yes' : 'No',
    c.monthlyChargeGBP,
    c.averageMonthlyUsageGB,
    c.dataAllowanceGB,
    c.overageChargesGBP,
    c.discountPercent,
    c.paymentMethod,
    c.directDebit ? 'Yes' : 'No',
    c.latePayments12M,
    c.failedPayments12M,
    c.supportTickets12M,
    c.complaints12M,
    c.averageResolutionHours,
    c.networkOutages12M,
    c.satisfactionScore,
    c.npsScore,
    c.competitorOfferReceived ? 'Yes' : 'No',
    c.churnStatus,
    c.churnDate || '',
    c.churnReason || '',
    c.lifetimeRevenueGBP,
    c.monthlyRevenueAtRiskGBP,
    c.churnFlag,
  ]);

  return [headers.join(','), ...rows.map((r) => r.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}
