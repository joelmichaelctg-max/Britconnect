export interface RawCustomerRecord {
  [key: string]: any;
}

export interface Customer {
  // 38 Data Dictionary columns mapped to camelCase
  customerId: string;
  customerSegment: string;
  age: number;
  ageBand: string;
  gender: string;
  ukNation: string;
  city: string;
  acquisitionChannel: string;
  joinDate: string; // ISO date string YYYY-MM-DD
  tenureMonths: number;
  serviceType: string;
  planName: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate?: string;
  autoRenew: boolean;
  monthlyChargeGBP: number;
  averageMonthlyUsageGB: number;
  dataAllowanceGB: number;
  overageChargesGBP: number;
  discountPercent: number;
  paymentMethod: string;
  directDebit: boolean;
  latePayments12M: number;
  failedPayments12M: number;
  supportTickets12M: number;
  complaints12M: number;
  averageResolutionHours: number;
  networkOutages12M: number;
  satisfactionScore: number; // 1-10
  npsScore: number;
  competitorOfferReceived: boolean;
  churnStatus: 'Active' | 'Churned';
  churnDate?: string;
  churnReason?: string;
  lifetimeRevenueGBP: number;
  monthlyRevenueAtRiskGBP: number;
  churnFlag: number; // 0 or 1
}

export interface EngineeredFeatures {
  usageToAllowanceRatio: number;
  overageFlag: number;
  overageShareOfBill: number;
  effectiveMonthlyCharge: number;
  discountDependence: number;
  monthsToContractEnd: number;
  contractExpiring90d: number;
  outOfContractFlag: number;
  paymentRiskScore: number;
  paymentFailureRate: number;
  serviceFrictionIndex: number;
  complaintRatePerTicket: number;
  slowResolutionFlag: number;
  satisfactionBand: 'Low' | 'Medium' | 'High';
  npsCategory: 'Detractor' | 'Passive' | 'Promoter';
  satNpsGap: number;
  tenureBand: string;
  lifecycleStage: string;
  pricePerGB: number;
  competitorPressure: number;
  [key: string]: any;
}

export type RiskTier = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ScoredCustomer extends Customer {
  engineered: EngineeredFeatures;
  churnProbability: number; // 0 to 1
  riskTier: RiskTier;
  riskRank?: number;
  predictedRevenueAtRiskGBP: number;
  twelveMonthExpectedLossGBP: number;
  clusterId?: number;
  clusterName?: string;
  ruleSegment?: string;
  localDrivers?: LocalDriverContribution[];
}

export interface LocalDriverContribution {
  featureKey: string;
  featureName: string;
  value: any;
  contribution: number; // positive = pushes churn UP (dark red), negative = pushes churn DOWN (navy)
  benchmarkValue?: any;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  column: string;
  message: string;
  count: number;
  sampleRows?: string[];
}

export interface ValidationReport {
  dataQualityScore: number; // 0 - 100
  totalRows: number;
  totalColumns: number;
  mappedColumnsCount: number;
  unmappedColumns: string[];
  duplicateIdCount: number;
  missingValuesSummary: { [column: string]: { count: number; percent: number } };
  outOfRangeCount: number;
  dateLogicDiscrepancies: number;
  targetAgreementIssues: number;
  issues: ValidationIssue[];
}

export interface CleaningStepLog {
  id: string;
  name: string;
  description: string;
  affectedCount: number;
  enabled: boolean;
  reversible: boolean;
}

export interface DatasetVersion {
  id: string;
  name: string;
  createdAt: string;
  rowCount: number;
  qualityScore: number;
  fileName?: string;
  fileSize?: number;
  format?: string;
}

export interface TrainedModelSummary {
  id: string;
  name: string;
  modelType: 'logistic_regression' | 'random_forest' | 'gradient_boosting' | 'baseline';
  trainedAt: string;
  isChampion: boolean;
  featureKeys: string[];
  optimalThreshold: number;
  metrics: {
    rocAuc: number;
    prAuc: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    balancedAccuracy: number;
    brierScore: number;
    logLoss: number;
    confusionMatrix: {
      tp: number;
      fp: number;
      tn: number;
      fn: number;
    };
    cvRocAucMean?: number;
    cvRocAucStd?: number;
  };
  rocCurve: { fpr: number; tpr: number; threshold: number }[];
  prCurve: { recall: number; precision: number; threshold: number }[];
  calibrationData: { predictedProb: number; trueProb: number; count: number }[];
  profitCurve: { threshold: number; profit: number; precision: number; recall: number }[];
  featureImportance: { key: string; name: string; score: number }[];
  parameters: any;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  targetSegment: string;
  channel: string;
  offer: string;
  startDate: string;
  endDate: string;
  budgetGBP: number;
  owner: string;
  status: 'Draft' | 'Active' | 'Completed';
  controlGroupPercent: number; // e.g. 20%
  targetedCount: number;
  contactedCount: number;
  respondedCount: number;
  acceptedCount: number;
  retainedCount: number;
  churnedCount: number;
  costGBP: number;
  lessonsLearned?: string;
  controlTreatedMetrics?: {
    treatedChurnRate: number;
    controlChurnRate: number;
    upliftPercent: number;
    pValue: number;
    retainedRevenueGBP: number;
    roiPercent: number;
  };
}

export interface AppSettings {
  riskTiers: {
    lowMax: number;
    medMax: number;
    highMax: number;
  };
  asOfDate: string; // ISO date string
  assumptions: {
    averageOfferCostGBP: number;
    averageSaveRate: number;
    grossMargin: number;
    assumedRemainingMonths: number;
  };
  leakage: {
    includeTenureMonths: boolean;
    includeLifetimeRevenueGBP: boolean;
  };
  privacy: {
    doNotSendCustomerLevelDataToAI: boolean;
  };
  theme: 'light' | 'dark';
}
