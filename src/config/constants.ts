export const BRAND = {
  name: 'BritConnect',
  fullName: 'BritConnect AI Customer Churn Intelligence Platform',
  tagline: 'Predictive Churn Analytics, Explainable Machine Learning & Retention Optimization',
  version: '2.4.0',
};

export const PALETTE = {
  navy: {
    deep: '#0B1F3A',
    primary: '#13294B',
    light: '#1F3A66',
    subtle: '#2A4878',
  },
  gold: {
    dark: '#A8841A',
    primary: '#C9A227',
    light: '#E0BB4A',
    soft: '#FDF7E7',
  },
  darkRed: {
    deep: '#5E1111',
    primary: '#8B1A1A',
    light: '#A52A2A',
    soft: '#FDEDED',
  },
  neutrals: {
    offWhite: '#F7F5EF',
    warmGrey: '#EAE6DB',
    card: '#FFFFFF',
    text: '#1A1A1A',
    muted: '#5C6370',
    border: '#E2DDD2',
  },
  categorical: [
    '#13294B', // Navy primary
    '#C9A227', // Gold accent
    '#8B1A1A', // Dark Red
    '#1F3A66', // Navy secondary
    '#E0BB4A', // Light Gold
    '#A52A2A', // Light Dark Red
    '#4A6B82', // Slate Cyan
    '#D97724', // Amber
  ],
};

export interface RiskTierConfig {
  lowMax: number;     // e.g. 0.25 (0 to <25%)
  medMax: number;     // e.g. 0.50 (25% to <50%)
  highMax: number;    // e.g. 0.75 (50% to <75%)
  // Critical is >= highMax (>=75%)
}

export const DEFAULT_RISK_TIERS: RiskTierConfig = {
  lowMax: 0.25,
  medMax: 0.50,
  highMax: 0.75,
};

export interface BusinessAssumptions {
  averageOfferCostGBP: number;    // default £35
  averageSaveRate: number;        // default 32% (0.32)
  grossMargin: number;            // default 70% (0.70)
  assumedRemainingMonths: number; // default 12
}

export const DEFAULT_ASSUMPTIONS: BusinessAssumptions = {
  averageOfferCostGBP: 35,
  averageSaveRate: 0.32,
  grossMargin: 0.70,
  assumedRemainingMonths: 12,
};

export const UK_NATIONS = ['England', 'Scotland', 'Wales', 'Northern Ireland'];

export const UK_TOP_CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
  'Edinburgh',
  'Liverpool',
  'Bristol',
  'Cardiff',
  'Belfast',
  'Newcastle',
  'Sheffield',
  'Nottingham',
  'Southampton',
];

export const SERVICE_TYPES = [
  'Fibre Broadband',
  'Standard Broadband',
  'Mobile 5G',
  'Landline & VoIP',
  'Full Bundle (Quad-play)',
];

export const CONTRACT_TYPES = [
  'Month-to-Month',
  '12 Months',
  '18 Months',
  '24 Months',
];

export const CHURN_REASONS = [
  'Price Competitiveness & Tariff Increases',
  'Network Outages & Unreliable Broadband',
  'Slow Customer Support Resolution',
  'Better Competitor Bundle Deal',
  'Relocation / Moved House',
  'Overage Charges & Bill Shock',
  'Contract Expired / No Re-contracting Contact',
  'Equipment / Router Failure',
];
