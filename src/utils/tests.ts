import { computeClassificationMetrics, vectorizeCustomers } from '../ml/evaluation';
import { cleanCustomerDataset, parseDateFlexible, parseBooleanFlexible } from '../services/dataCleaning';
import { engineerCustomerFeatures } from '../services/featureEngineering';
import { generateSyntheticCustomerDataset } from '../services/demoData';
import { PROHIBITED_FEATURE_KEYS } from '../config/schema';
import type { Customer } from '../types/customer';

export interface TestResult {
  name: string;
  category: 'Metrics' | 'Cleaning' | 'Feature Engineering' | 'Target Leakage';
  passed: boolean;
  message: string;
}

export function runAllUnitTests(): TestResult[] {
  const results: TestResult[] = [];

  // 1. UNIT TEST: Classification Metrics (Hand-checked test vector)
  try {
    // 4 samples: 2 positive, 2 negative
    // True: [1, 1, 0, 0]
    // Probs: [0.9, 0.4, 0.2, 0.8]
    // At threshold 0.5:
    // Pred: [1, 0, 0, 1]
    // TP = 1 (first), FP = 1 (fourth), TN = 1 (third), FN = 1 (second)
    const yTrue = [1, 1, 0, 0];
    const yProbs = [0.9, 0.4, 0.2, 0.8];
    const metrics = computeClassificationMetrics(yTrue, yProbs, 0.5);

    const cm = metrics.confusionMatrix;
    const isCmCorrect = cm.tp === 1 && cm.fp === 1 && cm.tn === 1 && cm.fn === 1;
    const isAccCorrect = metrics.accuracy === 0.5;
    const isPrecCorrect = metrics.precision === 0.5;
    const isRecCorrect = metrics.recall === 0.5;
    const isF1Correct = metrics.f1Score === 0.5;

    results.push({
      name: 'Deterministic Confusion Matrix & F1 Calculation',
      category: 'Metrics',
      passed: isCmCorrect && isAccCorrect && isPrecCorrect && isRecCorrect && isF1Correct,
      message: isCmCorrect
        ? `Passed: TP=${cm.tp}, FP=${cm.fp}, TN=${cm.tn}, FN=${cm.fn}, F1=${metrics.f1Score}`
        : `Failed metric calculation mismatch`,
    });
  } catch (err: any) {
    results.push({
      name: 'Deterministic Confusion Matrix & F1 Calculation',
      category: 'Metrics',
      passed: false,
      message: err?.message,
    });
  }

  // 2. UNIT TEST: Cleaning Rules (Dates, Booleans & Normalization)
  try {
    const rawUkDate = '15/04/2024';
    const parsedUk = parseDateFlexible(rawUkDate);
    const parsedIso = parseDateFlexible('2024-04-15');
    const isDateCorrect = parsedUk === '2024-04-15' && parsedIso === '2024-04-15';

    const boolYes = parseBooleanFlexible('Yes');
    const boolOne = parseBooleanFlexible(1);
    const boolFalse = parseBooleanFlexible('No');
    const isBoolCorrect = boolYes === true && boolOne === true && boolFalse === false;

    // Test deduplication and imputation
    const testCustomers: Partial<Customer>[] = [
      { customerId: 'BC-DUP-1', customerSegment: 'Consumer', monthlyChargeGBP: 40, satisfactionScore: 8 },
      { customerId: 'BC-DUP-1', customerSegment: 'Consumer', monthlyChargeGBP: 45, satisfactionScore: 9, planName: 'Gigabit' },
    ];
    const { cleaned } = cleanCustomerDataset(testCustomers, { step_deduplication: true });
    const isDedupCorrect = cleaned.length === 1 && cleaned[0].planName === 'Gigabit';

    results.push({
      name: 'Data Cleaning Rules (UK Dates, Booleans, Deduplication)',
      category: 'Cleaning',
      passed: isDateCorrect && isBoolCorrect && isDedupCorrect,
      message: isDateCorrect && isBoolCorrect && isDedupCorrect
        ? 'Passed: UK dd/mm/yyyy parsed to ISO, Y/1 normalized to boolean, duplicate IDs resolved.'
        : 'Failed data cleaning normalization tests.',
    });
  } catch (err: any) {
    results.push({
      name: 'Data Cleaning Rules',
      category: 'Cleaning',
      passed: false,
      message: err?.message,
    });
  }

  // 3. UNIT TEST: Feature Engineering Logic
  try {
    const testCust: Customer = {
      customerId: 'BC-TEST',
      customerSegment: 'Consumer',
      age: 40,
      ageBand: '35-49',
      gender: 'Male',
      ukNation: 'England',
      city: 'London',
      acquisitionChannel: 'Online',
      joinDate: '2024-01-01',
      tenureMonths: 12,
      serviceType: 'Fibre Broadband',
      planName: 'Fibre 500',
      contractType: '12 Months',
      contractStartDate: '2024-01-01',
      contractEndDate: '2025-01-01',
      autoRenew: true,
      monthlyChargeGBP: 50,
      averageMonthlyUsageGB: 450,
      dataAllowanceGB: 500,
      overageChargesGBP: 10,
      discountPercent: 20,
      paymentMethod: 'Direct Debit',
      directDebit: true,
      latePayments12M: 1,
      failedPayments12M: 0,
      supportTickets12M: 2,
      complaints12M: 1,
      averageResolutionHours: 12,
      networkOutages12M: 2,
      satisfactionScore: 4,
      npsScore: 3,
      competitorOfferReceived: true,
      churnStatus: 'Active',
      lifetimeRevenueGBP: 600,
      monthlyRevenueAtRiskGBP: 35,
      churnFlag: 0,
    };

    const eng = engineerCustomerFeatures(testCust, '2024-11-01');

    // Expected values
    const isRatioCorrect = eng.usageToAllowanceRatio === 0.9;
    const isOverageCorrect = eng.overageFlag === 1;
    const isEffectiveChargeCorrect = eng.effectiveMonthlyCharge === 40; // 50 * 0.8
    const isNpsCategoryCorrect = eng.npsCategory === 'Detractor';
    const isSatBandCorrect = eng.satisfactionBand === 'Low';

    results.push({
      name: 'Feature Engineering Formulas & Ratio Precision',
      category: 'Feature Engineering',
      passed: isRatioCorrect && isOverageCorrect && isEffectiveChargeCorrect && isNpsCategoryCorrect && isSatBandCorrect,
      message: `Passed: UsageRatio=${eng.usageToAllowanceRatio}, EffectiveCharge=£${eng.effectiveMonthlyCharge}, NPS=${eng.npsCategory}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Feature Engineering Formulas',
      category: 'Feature Engineering',
      passed: false,
      message: err?.message,
    });
  }

  // 4. UNIT TEST: Strict Target Leakage Protection Check
  try {
    const demo = generateSyntheticCustomerDataset(20);
    const vectorized = vectorizeCustomers(demo, true, false);

    let hasLeakage = false;
    let leakedFeatureName = '';

    for (const name of vectorized.featureNames) {
      const normalizedKey = name.toLowerCase().replace(/[\s\-_]+/g, '');
      if (
        normalizedKey.includes('churnstatus') ||
        normalizedKey.includes('churndate') ||
        normalizedKey.includes('churnreason') ||
        normalizedKey.includes('churnflag') ||
        normalizedKey.includes('monthlyrevenueatrisk') ||
        normalizedKey.includes('customerid')
      ) {
        hasLeakage = true;
        leakedFeatureName = name;
        break;
      }
    }

    results.push({
      name: 'Strict Target Leakage Shield (Model Input Verification)',
      category: 'Target Leakage',
      passed: !hasLeakage,
      message: !hasLeakage
        ? `Passed: Verified 0 prohibited post-churn fields in training matrix (${vectorized.featureNames.length} features checked).`
        : `FAILED: Leaked feature detected in training matrix: ${leakedFeatureName}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Target Leakage Protection Check',
      category: 'Target Leakage',
      passed: false,
      message: err?.message,
    });
  }

  return results;
}
