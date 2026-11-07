import Dexie, { type Table } from 'dexie';
import type { Customer, DatasetVersion, TrainedModelSummary, Campaign, AppSettings } from '../types/customer';
import { DEFAULT_RISK_TIERS, DEFAULT_ASSUMPTIONS } from '../config/constants';

export interface AuditLogEntry {
  id?: number;
  timestamp: string;
  action: string;
  details: string;
  user?: string;
}

export interface ChatMessageEntry {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
  queryDetails?: any;
  chartData?: any;
  citationPill?: string;
}

export class BritConnectDatabase extends Dexie {
  datasets!: Table<DatasetVersion, string>;
  customers!: Table<Customer, string>;
  models!: Table<TrainedModelSummary, string>;
  campaigns!: Table<Campaign, string>;
  chatHistory!: Table<ChatMessageEntry, number>;
  settings!: Table<{ key: string; value: any }, string>;
  auditLogs!: Table<AuditLogEntry, number>;

  constructor() {
    super('BritConnectChurnDB');
    this.version(1).stores({
      datasets: 'id, name, createdAt',
      customers: 'customerId, customerSegment, ukNation, contractType, churnStatus, churnFlag',
      models: 'id, modelType, trainedAt, isChampion',
      campaigns: 'id, status, targetSegment, startDate',
      chatHistory: '++id, sessionId, timestamp',
      settings: 'key',
      auditLogs: '++id, timestamp, action',
    });
  }
}

export const db = new BritConnectDatabase();

export async function logAudit(action: string, details: string) {
  try {
    await db.auditLogs.add({
      timestamp: new Date().toISOString(),
      action,
      details,
      user: 'Retention Architect',
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await db.settings.get('app_settings');
    if (raw && raw.value) {
      return raw.value;
    }
  } catch (err) {
    console.warn('Could not read settings from db:', err);
  }

  return {
    riskTiers: { ...DEFAULT_RISK_TIERS },
    asOfDate: new Date().toISOString().split('T')[0],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    leakage: {
      includeTenureMonths: true,
      includeLifetimeRevenueGBP: false, // excluded by default per leakage rules
    },
    privacy: {
      doNotSendCustomerLevelDataToAI: true,
    },
    theme: 'light',
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ key: 'app_settings', value: settings });
  await logAudit('SETTINGS_UPDATED', 'Updated application thresholds and privacy settings');
}
