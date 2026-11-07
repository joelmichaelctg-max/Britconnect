import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DATA_DICTIONARY_COLUMNS, type ColumnDefinition } from '../config/schema';
import type { Customer, ValidationReport, ValidationIssue, CleaningStepLog } from '../types/customer';

// Helper: Fuzzy column name matching
export function matchColumnNameToSchema(rawHeader: string): ColumnDefinition | null {
  const normalized = rawHeader.toLowerCase().trim().replace(/[\s_\-#]+/g, ' ');

  for (const col of DATA_DICTIONARY_COLUMNS) {
    if (col.name.toLowerCase() === normalized) return col;
    if (col.key.toLowerCase() === normalized) return col;
    if (col.aliases.some((alias) => alias.toLowerCase() === normalized)) return col;
    // Check if contains key words
    if (normalized.includes(col.name.toLowerCase()) || col.name.toLowerCase().includes(normalized)) {
      return col;
    }
  }

  return null;
}

// Parses dates in UK dd/mm/yyyy, dd-mm-yyyy, ISO yyyy-mm-dd or Excel serial numbers
export function parseDateFlexible(val: any): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;

  // Excel serial number
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    return date.toISOString().split('T')[0];
  }

  const s = String(val).trim();
  if (!s) return undefined;

  // Check UK dd/mm/yyyy or dd-mm-yyyy
  const ukMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ukMatch) {
    const day = ukMatch[1].padStart(2, '0');
    const month = ukMatch[2].padStart(2, '0');
    const year = ukMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Check ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return undefined;
}

export function parseBooleanFlexible(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 't', 'active'].includes(s);
}

// Parse file contents based on extension
export async function parseUploadedFile(file: File): Promise<{ rows: any[]; sheets?: string[]; selectedSheet?: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const firstSheet = sheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    return { rows, sheets: sheetNames, selectedSheet: firstSheet };
  }

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : (parsed.data || parsed.customers || [parsed]);
    return { rows };
  }

  if (extension === 'xml') {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const customerNodes = xmlDoc.querySelectorAll('customer, row, record');
    const rows: any[] = [];
    customerNodes.forEach((node) => {
      const obj: any = {};
      node.childNodes.forEach((child) => {
        if (child.nodeType === 1) {
          obj[child.nodeName] = child.textContent?.trim() || '';
        }
      });
      rows.push(obj);
    });
    return { rows };
  }

  // CSV, TSV, TXT (delimiter auto-detect)
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        resolve({ rows: results.data });
      },
      error: (err: any) => reject(err),
    });
  });
}

// Map raw object rows into structured Customer objects
export function mapRawRowsToCustomers(rawRows: any[], customMapping?: Record<string, string>): { customers: Partial<Customer>[]; mappedCols: Record<string, string> } {
  if (rawRows.length === 0) return { customers: [], mappedCols: {} };

  const firstRow = rawRows[0];
  const rawHeaders = Object.keys(firstRow);
  const columnMap: Record<string, string> = { ...customMapping };

  // Auto-map if not provided
  if (!customMapping) {
    for (const header of rawHeaders) {
      const matched = matchColumnNameToSchema(header);
      if (matched) {
        columnMap[header] = matched.key;
      }
    }
  }

  const customers = rawRows.map((row, idx) => {
    const cust: any = {};

    for (const [rawHeader, targetKey] of Object.entries(columnMap)) {
      if (!targetKey) continue;
      cust[targetKey] = row[rawHeader];
    }

    // Default unique customer ID if missing
    if (!cust.customerId) {
      cust.customerId = `BC-GEN-${idx + 1000}`;
    } else {
      cust.customerId = String(cust.customerId).trim();
    }

    return cust;
  });

  return { customers, mappedCols: columnMap };
}

// Comprehensive Validation Report
export function validateCustomerDataset(customers: Partial<Customer>[]): ValidationReport {
  const totalRows = customers.length;
  const issues: ValidationIssue[] = [];
  const missingSummary: Record<string, { count: number; percent: number }> = {};

  const seenIds = new Set<string>();
  let duplicateIdCount = 0;
  let outOfRangeCount = 0;
  let dateLogicDiscrepancies = 0;
  let targetAgreementIssues = 0;

  // Initialize missing count tracker
  for (const col of DATA_DICTIONARY_COLUMNS) {
    missingSummary[col.key] = { count: 0, percent: 0 };
  }

  customers.forEach((c) => {
    // Duplicate ID check
    if (c.customerId) {
      if (seenIds.has(c.customerId)) {
        duplicateIdCount++;
      } else {
        seenIds.add(c.customerId);
      }
    }

    // Missing values
    for (const col of DATA_DICTIONARY_COLUMNS) {
      const val = (c as any)[col.key];
      const isStructurallyBlank = (col.key === 'churnDate' || col.key === 'churnReason') && c.churnStatus === 'Active';
      if (!isStructurallyBlank && (val === undefined || val === null || val === '')) {
        missingSummary[col.key].count++;
      }
    }

    // Range checks
    if (c.age !== undefined && c.age !== null) {
      if (c.age < 16 || c.age > 110) outOfRangeCount++;
    }
    if (c.satisfactionScore !== undefined && c.satisfactionScore !== null) {
      if (c.satisfactionScore < 1 || c.satisfactionScore > 10) outOfRangeCount++;
    }
    if (c.monthlyChargeGBP !== undefined && c.monthlyChargeGBP < 0) outOfRangeCount++;
    if (c.discountPercent !== undefined && (c.discountPercent < 0 || c.discountPercent > 100)) outOfRangeCount++;

    // Date Logic Checks
    if (c.joinDate && c.contractStartDate && c.joinDate > c.contractStartDate) {
      dateLogicDiscrepancies++;
    }
    if (c.contractStartDate && c.contractEndDate && c.contractEndDate < c.contractStartDate) {
      dateLogicDiscrepancies++;
    }
    if (c.churnDate && c.joinDate && c.churnDate < c.joinDate) {
      dateLogicDiscrepancies++;
    }
    if (c.churnStatus === 'Active' && c.churnDate) {
      dateLogicDiscrepancies++;
    }

    // Consistency Checks (Churn Flag vs Churn Status)
    if (c.churnFlag !== undefined && c.churnStatus) {
      const flagNum = Number(c.churnFlag);
      const isStatusChurned = c.churnStatus.toLowerCase() === 'churned';
      if ((flagNum === 1 && !isStatusChurned) || (flagNum === 0 && isStatusChurned)) {
        targetAgreementIssues++;
      }
    }
  });

  // Calculate percentages and create issue items
  for (const [key, data] of Object.entries(missingSummary)) {
    data.percent = totalRows > 0 ? Number(((data.count / totalRows) * 100).toFixed(1)) : 0;
    if (data.count > 0) {
      const col = DATA_DICTIONARY_COLUMNS.find((k) => k.key === key);
      const isReq = col?.required;
      issues.push({
        severity: isReq ? 'error' : (data.percent > 20 ? 'warning' : 'info'),
        column: col?.name || key,
        message: `${data.count} rows (${data.percent}%) have missing values.`,
        count: data.count,
      });
    }
  }

  if (duplicateIdCount > 0) {
    issues.push({
      severity: 'error',
      column: 'Customer ID',
      message: `${duplicateIdCount} duplicate customer IDs detected. Duplicate records will be resolved during cleaning.`,
      count: duplicateIdCount,
    });
  }

  if (outOfRangeCount > 0) {
    issues.push({
      severity: 'warning',
      column: 'Out of Range Fields',
      message: `${outOfRangeCount} values fall outside logical domain bounds (Age 16-110, CSAT 1-10, Discount 0-100%).`,
      count: outOfRangeCount,
    });
  }

  if (dateLogicDiscrepancies > 0) {
    issues.push({
      severity: 'warning',
      column: 'Date Consistency',
      message: `${dateLogicDiscrepancies} temporal discrepancies detected (e.g. Contract End prior to Start or Active customers with cancellation dates).`,
      count: dateLogicDiscrepancies,
    });
  }

  if (targetAgreementIssues > 0) {
    issues.push({
      severity: 'error',
      column: 'Churn Flag / Status',
      message: `${targetAgreementIssues} rows have conflicting Churn Flag and Churn Status definitions.`,
      count: targetAgreementIssues,
    });
  }

  // Calculate Data Quality Score (0 - 100)
  let score = 100;
  score -= duplicateIdCount > 0 ? Math.min(25, duplicateIdCount * 2) : 0;
  score -= targetAgreementIssues > 0 ? Math.min(20, targetAgreementIssues * 2) : 0;
  score -= dateLogicDiscrepancies > 0 ? Math.min(15, dateLogicDiscrepancies) : 0;
  score -= outOfRangeCount > 0 ? Math.min(15, outOfRangeCount) : 0;

  // Penalty for missing required columns
  const missingRequired = issues.filter((i) => i.severity === 'error' && i.column !== 'Customer ID').length;
  score -= missingRequired * 10;
  score = Math.max(10, Math.min(100, Math.round(score)));

  return {
    dataQualityScore: score,
    totalRows,
    totalColumns: DATA_DICTIONARY_COLUMNS.length,
    mappedColumnsCount: Object.keys(missingSummary).length,
    unmappedColumns: [],
    duplicateIdCount,
    missingValuesSummary: missingSummary,
    outOfRangeCount,
    dateLogicDiscrepancies,
    targetAgreementIssues,
    issues,
  };
}

// Cleaning Pipeline Execution with toggleable steps
export function cleanCustomerDataset(
  rawCustomers: Partial<Customer>[],
  stepToggles: Record<string, boolean> = {}
): { cleaned: Customer[]; logs: CleaningStepLog[] } {
  const logs: CleaningStepLog[] = [
    {
      id: 'step_whitespace_casing',
      name: 'Whitespace & Casing Normalization',
      description: 'Trim strings, standardize categorical spellings, unify Direct Debit and UK Nations.',
      affectedCount: 0,
      enabled: stepToggles['step_whitespace_casing'] !== false,
      reversible: true,
    },
    {
      id: 'step_dates_booleans',
      name: 'Date & Boolean Normalization',
      description: 'Standardize UK dd/mm/yyyy & ISO dates, normalize Y/Yes/1/True to boolean.',
      affectedCount: 0,
      enabled: stepToggles['step_dates_booleans'] !== false,
      reversible: true,
    },
    {
      id: 'step_deduplication',
      name: 'Duplicate ID Resolution',
      description: 'Deduplicate records by Customer ID, retaining the most recent or complete entry.',
      affectedCount: 0,
      enabled: stepToggles['step_deduplication'] !== false,
      reversible: true,
    },
    {
      id: 'step_imputation',
      name: 'Missing Value Imputation',
      description: 'Impute numeric medians by segment, categorical modes, preserve structural blanks for active accounts.',
      affectedCount: 0,
      enabled: stepToggles['step_imputation'] !== false,
      reversible: true,
    },
    {
      id: 'step_winsorising',
      name: 'Extreme Outlier Winsorization',
      description: 'Cap extreme numeric values at 1st and 99th percentiles (usage, charges, support hours).',
      affectedCount: 0,
      enabled: stepToggles['step_winsorising'] !== false,
      reversible: true,
    },
    {
      id: 'step_derived_recompute',
      name: 'Derived Field Consistency',
      description: 'Recompute Tenure Months from Join Date and Age Band from Age where inconsistent.',
      affectedCount: 0,
      enabled: stepToggles['step_derived_recompute'] !== false,
      reversible: true,
    },
  ];

  let processing = [...rawCustomers];

  // 1. Whitespace & Casing
  if (stepToggles['step_whitespace_casing'] !== false) {
    let affected = 0;
    processing = processing.map((c) => {
      let changed = false;
      const copy = { ...c };

      if (copy.customerSegment) {
        const seg = String(copy.customerSegment).trim();
        if (seg.toLowerCase().includes('consumer')) copy.customerSegment = 'Consumer';
        else if (seg.toLowerCase().includes('small')) copy.customerSegment = 'Small Business';
        else if (seg.toLowerCase().includes('enterprise')) copy.customerSegment = 'Enterprise';
        changed = true;
      }
      if (copy.ukNation) {
        const n = String(copy.ukNation).trim().toLowerCase();
        if (n.includes('england')) copy.ukNation = 'England';
        else if (n.includes('scot')) copy.ukNation = 'Scotland';
        else if (n.includes('wale')) copy.ukNation = 'Wales';
        else if (n.includes('north') || n.includes('ni')) copy.ukNation = 'Northern Ireland';
        changed = true;
      }
      if (copy.paymentMethod) {
        const p = String(copy.paymentMethod).trim().toLowerCase();
        if (p.includes('direct') || p.includes('debit')) copy.paymentMethod = 'Direct Debit';
        else if (p.includes('credit')) copy.paymentMethod = 'Credit Card';
        else if (p.includes('bank') || p.includes('transfer')) copy.paymentMethod = 'Bank Transfer';
        changed = true;
      }

      if (changed) affected++;
      return copy;
    });
    const log = logs.find((l) => l.id === 'step_whitespace_casing');
    if (log) log.affectedCount = affected;
  }

  // 2. Dates & Booleans
  if (stepToggles['step_dates_booleans'] !== false) {
    let affected = 0;
    processing = processing.map((c) => {
      const copy = { ...c };
      let changed = false;

      const parsedJoin = parseDateFlexible(copy.joinDate);
      if (parsedJoin && parsedJoin !== copy.joinDate) {
        copy.joinDate = parsedJoin;
        changed = true;
      }

      const parsedStart = parseDateFlexible(copy.contractStartDate);
      if (parsedStart && parsedStart !== copy.contractStartDate) {
        copy.contractStartDate = parsedStart;
        changed = true;
      }

      const parsedEnd = parseDateFlexible(copy.contractEndDate);
      if (parsedEnd && parsedEnd !== copy.contractEndDate) {
        copy.contractEndDate = parsedEnd;
        changed = true;
      }

      const parsedChurn = parseDateFlexible(copy.churnDate);
      if (parsedChurn && parsedChurn !== copy.churnDate) {
        copy.churnDate = parsedChurn;
        changed = true;
      }

      copy.autoRenew = parseBooleanFlexible(copy.autoRenew);
      copy.directDebit = parseBooleanFlexible(copy.directDebit);
      copy.competitorOfferReceived = parseBooleanFlexible(copy.competitorOfferReceived);

      if (changed) affected++;
      return copy;
    });
    const log = logs.find((l) => l.id === 'step_dates_booleans');
    if (log) log.affectedCount = affected;
  }

  // 3. Deduplication
  if (stepToggles['step_deduplication'] !== false) {
    const idMap = new Map<string, any>();
    let dupCount = 0;

    processing.forEach((c) => {
      const id = c.customerId || 'UNKNOWN';
      if (idMap.has(id)) {
        dupCount++;
        // Keep the one with more non-null fields
        const existing = idMap.get(id);
        const existingFilled = Object.values(existing).filter((v) => v !== undefined && v !== null && v !== '').length;
        const currentFilled = Object.values(c).filter((v) => v !== undefined && v !== null && v !== '').length;
        if (currentFilled > existingFilled) {
          idMap.set(id, c);
        }
      } else {
        idMap.set(id, c);
      }
    });

    processing = Array.from(idMap.values());
    const log = logs.find((l) => l.id === 'step_deduplication');
    if (log) log.affectedCount = dupCount;
  }

  // 4. Missing value imputation
  if (stepToggles['step_imputation'] !== false) {
    // Compute medians for numerics
    const medianCharge = computeMedian(processing.map((c) => Number(c.monthlyChargeGBP)).filter((v) => !isNaN(v)));
    const medianUsage = computeMedian(processing.map((c) => Number(c.averageMonthlyUsageGB)).filter((v) => !isNaN(v)));
    const medianSatisfaction = 7;
    let imputedCount = 0;

    processing = processing.map((c) => {
      const copy = { ...c };
      let changed = false;

      if (copy.monthlyChargeGBP === undefined || copy.monthlyChargeGBP === null || isNaN(Number(copy.monthlyChargeGBP))) {
        copy.monthlyChargeGBP = medianCharge || 42.5;
        changed = true;
      } else {
        copy.monthlyChargeGBP = Number(copy.monthlyChargeGBP);
      }

      if (copy.averageMonthlyUsageGB === undefined || copy.averageMonthlyUsageGB === null || isNaN(Number(copy.averageMonthlyUsageGB))) {
        copy.averageMonthlyUsageGB = medianUsage || 280;
        changed = true;
      } else {
        copy.averageMonthlyUsageGB = Number(copy.averageMonthlyUsageGB);
      }

      if (copy.satisfactionScore === undefined || copy.satisfactionScore === null || isNaN(Number(copy.satisfactionScore))) {
        copy.satisfactionScore = medianSatisfaction;
        changed = true;
      } else {
        copy.satisfactionScore = Math.max(1, Math.min(10, Math.round(Number(copy.satisfactionScore))));
      }

      if (copy.npsScore === undefined || copy.npsScore === null || isNaN(Number(copy.npsScore))) {
        copy.npsScore = copy.satisfactionScore >= 8 ? 8 : (copy.satisfactionScore <= 4 ? 3 : 6);
        changed = true;
      } else {
        copy.npsScore = Number(copy.npsScore);
      }

      // Target variable derivation
      if (copy.churnFlag === undefined || copy.churnFlag === null) {
        if (copy.churnStatus) {
          copy.churnFlag = copy.churnStatus.toLowerCase() === 'churned' ? 1 : 0;
          changed = true;
        } else {
          copy.churnFlag = 0;
        }
      } else {
        copy.churnFlag = Number(copy.churnFlag) === 1 ? 1 : 0;
      }

      if (!copy.churnStatus) {
        copy.churnStatus = copy.churnFlag === 1 ? 'Churned' : 'Active';
        changed = true;
      }

      // If Active, preserve structural blanks
      if (copy.churnStatus === 'Active') {
        copy.churnDate = undefined;
        copy.churnReason = undefined;
      }

      if (changed) imputedCount++;
      return copy;
    });

    const log = logs.find((l) => l.id === 'step_imputation');
    if (log) log.affectedCount = imputedCount;
  }

  // 5. Winsorising extreme outliers
  if (stepToggles['step_winsorising'] !== false) {
    let cappedCount = 0;
    const charges = processing.map((c) => Number(c.monthlyChargeGBP)).sort((a, b) => a - b);
    const p99Charge = percentile(charges, 0.99) || 120;
    const p1Charge = percentile(charges, 0.01) || 15;

    processing = processing.map((c) => {
      const copy = { ...c };
      let changed = false;

      if (copy.monthlyChargeGBP !== undefined && copy.monthlyChargeGBP > p99Charge) {
        copy.monthlyChargeGBP = p99Charge;
        changed = true;
      } else if (copy.monthlyChargeGBP !== undefined && copy.monthlyChargeGBP < p1Charge) {
        copy.monthlyChargeGBP = p1Charge;
        changed = true;
      }

      if (copy.networkOutages12M !== undefined && copy.networkOutages12M > 10) {
        copy.networkOutages12M = 10;
        changed = true;
      }

      if (changed) cappedCount++;
      return copy;
    });

    const log = logs.find((l) => l.id === 'step_winsorising');
    if (log) log.affectedCount = cappedCount;
  }

  // 6. Derived field recomputation
  if (stepToggles['step_derived_recompute'] !== false) {
    let derivedCount = 0;
    processing = processing.map((c) => {
      const copy = { ...c };
      let changed = false;

      if (copy.age !== undefined && (!copy.ageBand || copy.ageBand === 'Unknown')) {
        const a = copy.age;
        if (a < 25) copy.ageBand = '18-24';
        else if (a < 35) copy.ageBand = '25-34';
        else if (a < 50) copy.ageBand = '35-49';
        else if (a < 65) copy.ageBand = '50-64';
        else copy.ageBand = '65+';
        changed = true;
      }

      if (copy.joinDate && (!copy.tenureMonths || copy.tenureMonths <= 0)) {
        const join = new Date(copy.joinDate);
        const now = new Date(2026, 10, 1);
        const months = Math.max(1, (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth()));
        copy.tenureMonths = months;
        changed = true;
      }

      if (changed) derivedCount++;
      return copy as Customer;
    });

    const log = logs.find((l) => l.id === 'step_derived_recompute');
    if (log) log.affectedCount = derivedCount;
  }

  return {
    cleaned: processing as Customer[],
    logs,
  };
}

function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
