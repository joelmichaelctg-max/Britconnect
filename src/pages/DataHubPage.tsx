import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { Customer, ValidationReport, CleaningStepLog, DatasetVersion } from '../types/customer';
import {
  parseUploadedFile,
  mapRawRowsToCustomers,
  validateCustomerDataset,
  cleanCustomerDataset,
} from '../services/dataCleaning';
import { generateSyntheticCustomerDataset, generateSampleCsvTemplate } from '../services/demoData';
import { exportToCsv } from '../services/exportService';
import { HelpDrawer } from '../components/HelpDrawer';
import { db, logAudit } from '../services/db';

interface DataHubPageProps {
  currentCustomers: Customer[];
  onDataLoaded: (customers: Customer[], versionName: string) => void;
  onNavigateToModelLab: () => void;
  datasetVersions: DatasetVersion[];
  onRestoreVersion: (version: DatasetVersion) => void;
}

export const DataHubPage: React.FC<DataHubPageProps> = ({
  currentCustomers,
  onDataLoaded,
  onNavigateToModelLab,
  datasetVersions,
  onRestoreVersion,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'validation' | 'cleaning' | 'versions'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedRawRows, setUploadedRawRows] = useState<any[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Validation and cleaning state
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(() => {
    return currentCustomers.length > 0 ? validateCustomerDataset(currentCustomers) : null;
  });

  const [cleaningToggles, setCleaningToggles] = useState<Record<string, boolean>>({
    step_whitespace_casing: true,
    step_dates_booleans: true,
    step_deduplication: true,
    step_imputation: true,
    step_winsorising: true,
    step_derived_recompute: true,
  });

  const [cleaningLogs, setCleaningLogs] = useState<CleaningStepLog[]>([]);
  const [conflictRule, setConflictRule] = useState<'replace' | 'append_newest' | 'append_existing' | 'new_version'>('replace');
  const [showHelp, setShowHelp] = useState(false);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setPreviewFileName(file.name);
    setIsProcessing(true);

    try {
      const parsed = await parseUploadedFile(file);
      setUploadedRawRows(parsed.rows);
      if (parsed.sheets && parsed.sheets.length > 1) {
        setSheets(parsed.sheets);
        setSelectedSheet(parsed.selectedSheet || parsed.sheets[0]);
      }

      // Initial validation on raw mapped rows
      const { customers } = mapRawRowsToCustomers(parsed.rows);
      const report = validateCustomerDataset(customers);
      setValidationReport(report);
      setActiveTab('validation');
    } catch (err: any) {
      alert(`Error reading file: ${err?.message || 'Unsupported or malformed file.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Synthetic Demo Baseline
  const handleLoadDemoDataset = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const demo = generateSyntheticCustomerDataset(1200);
      const report = validateCustomerDataset(demo);
      setValidationReport(report);

      const { cleaned, logs } = cleanCustomerDataset(demo, cleaningToggles);
      setCleaningLogs(logs);

      onDataLoaded(cleaned, 'BritConnect UK Q4 Baseline (Synthetic Demo)');
      logAudit('LOAD_DEMO_DATASET', 'Loaded 1,200 synthetic UK telecom customer records.');
      setIsProcessing(false);
      setActiveTab('validation');
    }, 400);
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvStr = generateSampleCsvTemplate();
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BritConnect_Customer_Data_Template_38Cols.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Commit and Clean Pipeline
  const handleCommitData = () => {
    if (!uploadedRawRows) {
      // Re-clean existing
      const { cleaned, logs } = cleanCustomerDataset(currentCustomers, cleaningToggles);
      setCleaningLogs(logs);
      onDataLoaded(cleaned, 'BritConnect Active Dataset (Cleaned)');
      alert('Cleaning pipeline successfully re-applied!');
      return;
    }

    const { customers } = mapRawRowsToCustomers(uploadedRawRows);
    const { cleaned, logs } = cleanCustomerDataset(customers, cleaningToggles);
    setCleaningLogs(logs);

    let finalDataset = cleaned;
    if (conflictRule === 'append_newest') {
      const existingMap = new Map(currentCustomers.map((c) => [c.customerId, c]));
      cleaned.forEach((c) => existingMap.set(c.customerId, c));
      finalDataset = Array.from(existingMap.values());
    } else if (conflictRule === 'append_existing') {
      const existingMap = new Map(currentCustomers.map((c) => [c.customerId, c]));
      cleaned.forEach((c) => {
        if (!existingMap.has(c.customerId)) existingMap.set(c.customerId, c);
      });
      finalDataset = Array.from(existingMap.values());
    }

    const versionName = previewFileName || `Uploaded Dataset v${datasetVersions.length + 1}`;
    onDataLoaded(finalDataset, versionName);
    logAudit('DATASET_COMMITTED', `Committed ${finalDataset.length} rows (${versionName}). Rule: ${conflictRule}`);
    setUploadedRawRows(null);
    setActiveTab('cleaning');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Data Hub & Ingestion Pipeline
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Multi-format file upload, automated validation report (0–100 quality score), and reversible cleaning pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] dark:text-[#9BA4B4] hover:bg-white dark:hover:bg-[#13294B] flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            How to read this page
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            CSV Data Dictionary Template
          </button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#C9A227]">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">Upload Data</p>
              <p className="text-[10px] text-[#5C6370]">38-Column Schema</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#5C6370]" />

          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              validationReport ? 'bg-[#0B1F3A] text-white ring-2 ring-[#C9A227]' : 'bg-[#E2DDD2] text-[#5C6370]'
            }`}>
              2
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">Validate & Clean</p>
              <p className="text-[10px] text-[#5C6370]">Quality Score {validationReport?.dataQualityScore ?? 0}/100</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#5C6370]" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#E2DDD2] text-[#5C6370] flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">Train & Score</p>
              <p className="text-[10px] text-[#5C6370]">Model Lab & Predictions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E2DDD2] dark:border-[#1F3A66] gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('upload')}
          className={`py-2.5 px-4 border-b-2 transition-all ${
            activeTab === 'upload'
              ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
              : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
          }`}
        >
          Upload & Ingest
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`py-2.5 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'validation'
              ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
              : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
          }`}
        >
          Validation Report
          {validationReport && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0B1F3A] text-[#E0BB4A]">
              {validationReport.dataQualityScore}/100
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('cleaning')}
          className={`py-2.5 px-4 border-b-2 transition-all ${
            activeTab === 'cleaning'
              ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
              : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
          }`}
        >
          Cleaning Pipeline & Toggles
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`py-2.5 px-4 border-b-2 transition-all ${
            activeTab === 'versions'
              ? 'border-[#C9A227] text-[#0B1F3A] dark:text-[#E0BB4A]'
              : 'border-transparent text-[#5C6370] hover:text-[#0B1F3A]'
          }`}
        >
          Version History ({datasetVersions.length})
        </button>
      </div>

      {/* TAB 1: UPLOAD & INGEST */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Zone */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#13294B] border-2 border-dashed border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl p-8 text-center hover:border-[#C9A227] hover:bg-[#F7F5EF]/40 transition-colors relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.tsv,.txt,.xml,.parquet"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <UploadCloud className="w-12 h-12 text-[#C9A227] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                Drop your telecom customer data file here
              </h3>
              <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-1 max-w-md mx-auto">
                Drag and drop or browse from your device. Supported formats: .csv, .xlsx, .xls, .json, .tsv, .txt, .xml.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[11px] font-mono text-[#5C6370] dark:text-[#9BA4B4]">
                  38 Target Columns
                </span>
                <span className="px-2 py-0.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[11px] font-mono text-[#5C6370] dark:text-[#9BA4B4]">
                  UK dd/mm/yyyy & ISO
                </span>
                <span className="px-2 py-0.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[11px] font-mono text-[#5C6370] dark:text-[#9BA4B4]">
                  Target Leakage Protected
                </span>
              </div>
            </div>

            {/* Ingestion Conflict Rule Picker */}
            <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#C9A227]" />
                Ingestion Conflict & Versioning Strategy
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  conflictRule === 'replace'
                    ? 'border-[#C9A227] bg-[#FDF7E7] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#E0BB4A]'
                    : 'border-[#E2DDD2] dark:border-[#1F3A66]'
                }`}>
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictRule === 'replace'}
                    onChange={() => setConflictRule('replace')}
                    className="mr-2 text-[#C9A227]"
                  />
                  <strong>Replace Dataset</strong>
                  <p className="text-[11px] text-[#5C6370] mt-1">Replace active base with uploaded file.</p>
                </label>

                <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  conflictRule === 'append_newest'
                    ? 'border-[#C9A227] bg-[#FDF7E7] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#E0BB4A]'
                    : 'border-[#E2DDD2] dark:border-[#1F3A66]'
                }`}>
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictRule === 'append_newest'}
                    onChange={() => setConflictRule('append_newest')}
                    className="mr-2 text-[#C9A227]"
                  />
                  <strong>Append (Keep Newest)</strong>
                  <p className="text-[11px] text-[#5C6370] mt-1">Merge by Customer ID, overwriting duplicates with newest.</p>
                </label>

                <label className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  conflictRule === 'append_existing'
                    ? 'border-[#C9A227] bg-[#FDF7E7] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#E0BB4A]'
                    : 'border-[#E2DDD2] dark:border-[#1F3A66]'
                }`}>
                  <input
                    type="radio"
                    name="conflict"
                    checked={conflictRule === 'append_existing'}
                    onChange={() => setConflictRule('append_existing')}
                    className="mr-2 text-[#C9A227]"
                  />
                  <strong>Append (Keep Existing)</strong>
                  <p className="text-[11px] text-[#5C6370] mt-1">Merge by Customer ID, retaining existing records on conflict.</p>
                </label>
              </div>

              {uploadedRawRows && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCommitData}
                    className="px-5 py-2.5 bg-[#0B1F3A] hover:bg-[#1F3A66] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4 text-[#C9A227]" />
                    Run Cleaning Pipeline & Ingest {uploadedRawRows.length} Rows
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Synthetic Demo Baseline Card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#0B1F3A] to-[#13294B] text-white rounded-2xl p-6 space-y-4 shadow-md border border-[#1F3A66]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E0BB4A]" />
                <h3 className="text-base font-bold font-display">Instant Synthetic Baseline</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Test the platform immediately with <strong>1,200 verified synthetic UK telecom customer records</strong>. Pre-populated with contract types, network outages, Ofcom complaint metrics, satisfaction scores, and realistic churn outcomes.
              </p>
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Exact 38 Data Dictionary fields</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Realistic UK city & nation distributions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Ground-truth churn correlation drivers</span>
                </div>
              </div>
              <button
                onClick={handleLoadDemoDataset}
                disabled={isProcessing}
                className="w-full py-2.5 bg-[#C9A227] hover:bg-[#A8841A] text-[#0B1F3A] font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                {isProcessing ? 'Generating Records...' : 'Load BritConnect Synthetic Demo (1,200)'}
              </button>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-4 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-[#0B1F3A] dark:text-[#F7F5EF] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                <span>Client-Side In-Memory Persistence</span>
              </div>
              <p className="text-[#5C6370] dark:text-[#9BA4B4] leading-relaxed">
                Uploaded customer records remain persisted inside your browser&apos;s IndexedDB. Raw PII is never transmitted to external servers without consent.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VALIDATION REPORT */}
      {activeTab === 'validation' && (
        <div className="space-y-6">
          {validationReport ? (
            <div className="space-y-6">
              {/* Quality Score Top Card */}
              <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl ${
                    validationReport.dataQualityScore >= 80
                      ? 'bg-[#0B1F3A] text-[#E0BB4A] ring-4 ring-[#C9A227]/30'
                      : validationReport.dataQualityScore >= 60
                      ? 'bg-[#C9A227] text-[#0B1F3A]'
                      : 'bg-[#8B1A1A] text-white'
                  }`}>
                    <span>{validationReport.dataQualityScore}</span>
                    <span className="text-[9px] uppercase tracking-wider font-normal">Score</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                      Data Quality Score: {validationReport.dataQualityScore >= 80 ? 'Production Ready (Grade A)' : 'Needs Cleaning (Grade B)'}
                    </h3>
                    <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                      Audited {validationReport.totalRows.toLocaleString('en-GB')} rows against all 38 dictionary specifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      exportToCsv('BritConnect_Data_Quality_Report', validationReport.issues);
                    }}
                    className="px-3 py-1.5 border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg text-xs font-medium text-[#5C6370] hover:bg-white flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Validation Report (CSV)
                  </button>
                  <button
                    onClick={() => setActiveTab('cleaning')}
                    className="px-4 py-1.5 bg-[#0B1F3A] text-white rounded-lg text-xs font-semibold hover:bg-[#1F3A66] flex items-center gap-1.5"
                  >
                    Proceed to Cleaning Pipeline
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Validation Summary Matrix */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Duplicate Customer IDs</span>
                  <p className="text-lg font-bold text-[#0B1F3A] dark:text-[#F7F5EF] mt-0.5">
                    {validationReport.duplicateIdCount}
                  </p>
                  <span className="text-[10px] text-[#A8841A]">Resolved automatically</span>
                </div>

                <div className="p-3.5 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Out of Range Values</span>
                  <p className="text-lg font-bold text-[#0B1F3A] dark:text-[#F7F5EF] mt-0.5">
                    {validationReport.outOfRangeCount}
                  </p>
                  <span className="text-[10px] text-[#5C6370]">Age, CSAT, charges bounds</span>
                </div>

                <div className="p-3.5 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Temporal Date Logic</span>
                  <p className="text-lg font-bold text-[#0B1F3A] dark:text-[#F7F5EF] mt-0.5">
                    {validationReport.dateLogicDiscrepancies}
                  </p>
                  <span className="text-[10px] text-[#5C6370]">Start vs expiry vs cancellation</span>
                </div>

                <div className="p-3.5 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl">
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">Target Flag Consistency</span>
                  <p className="text-lg font-bold text-[#0B1F3A] dark:text-[#F7F5EF] mt-0.5">
                    {validationReport.targetAgreementIssues}
                  </p>
                  <span className="text-[10px] text-[#5C6370]">Churn Flag vs Churn Status</span>
                </div>
              </div>

              {/* Detailed Issues Table */}
              <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
                    Detected Schema Discrepancies & Recommendations
                  </h4>
                </div>
                <div className="divide-y divide-[#E2DDD2]/60 dark:divide-[#1F3A66] text-xs">
                  {validationReport.issues.length === 0 ? (
                    <div className="p-8 text-center text-[#5C6370]">
                      <CheckCircle className="w-8 h-8 text-[#C9A227] mx-auto mb-2" />
                      Zero schema discrepancies detected! Dataset is completely compliant.
                    </div>
                  ) : (
                    validationReport.issues.map((iss, idx) => (
                      <div key={idx} className="p-3.5 flex items-start gap-3">
                        {iss.severity === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-[#8B1A1A] shrink-0 mt-0.5" />
                        ) : iss.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-[#13294B] shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">{iss.column}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              iss.severity === 'error'
                                ? 'bg-[#FDEDED] text-[#8B1A1A]'
                                : iss.severity === 'warning'
                                ? 'bg-[#FDF7E7] text-[#A8841A]'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {iss.severity}
                            </span>
                          </div>
                          <p className="text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">{iss.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white dark:bg-[#13294B] rounded-xl text-center text-xs text-[#5C6370]">
              No dataset loaded for validation. Upload a file or load the synthetic demo baseline.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLEANING PIPELINE */}
      {activeTab === 'cleaning' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                  Automatic Cleaning Pipeline Configuration
                </h3>
                <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
                  Every step is audited, logged, and toggleable. Enable or disable specific cleaning modules below.
                </p>
              </div>

              <button
                onClick={handleCommitData}
                className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C9A227]" />
                Execute Cleaning Transformation
              </button>
            </div>

            <div className="divide-y divide-[#E2DDD2] dark:divide-[#1F3A66] text-xs">
              {[
                {
                  id: 'step_whitespace_casing',
                  name: 'Whitespace & Categorical Casing Standardisation',
                  desc: 'Standardize casing, trim whitespace, unify payment methods and UK nations.',
                },
                {
                  id: 'step_dates_booleans',
                  name: 'UK Date & Boolean Normalisation',
                  desc: 'Parse UK dd/mm/yyyy & ISO dates; standardise Yes/No/Y/1/True to boolean.',
                },
                {
                  id: 'step_deduplication',
                  name: 'Duplicate Customer ID Resolution',
                  desc: 'Deduplicate records by keeping the most complete or most recent customer entry.',
                },
                {
                  id: 'step_imputation',
                  name: 'Missing Value Imputation',
                  desc: 'Impute numeric median by segment and categorical mode. Preserve structural blanks for active accounts.',
                },
                {
                  id: 'step_winsorising',
                  name: 'Extreme Numerical Outlier Winsorization (1st / 99th Percentiles)',
                  desc: 'Cap excessive usage, negative/extreme charges, and support hours at 1st and 99th percentiles.',
                },
                {
                  id: 'step_derived_recompute',
                  name: 'Derived Field Consistency Recomputation',
                  desc: 'Recompute Tenure Months from Join Date and Age Band from Age where conflicting.',
                },
              ].map((step) => (
                <div key={step.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] block">{step.name}</span>
                    <span className="text-[#5C6370] dark:text-[#9BA4B4]">{step.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cleaningToggles[step.id] !== false}
                    onChange={(e) =>
                      setCleaningToggles({ ...cleaningToggles, [step.id]: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#0B1F3A] focus:ring-[#C9A227] cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {cleaningLogs.length > 0 && (
            <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
                Latest Cleaning Transformation Audit Logs
              </h4>
              <div className="space-y-2 text-xs">
                {cleaningLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2.5 rounded bg-[#F7F5EF] dark:bg-[#0B1F3A]/40">
                    <span className="font-medium text-[#0B1F3A] dark:text-[#F7F5EF]">{log.name}</span>
                    <span className="font-mono text-[#A8841A]">
                      {log.affectedCount > 0 ? `${log.affectedCount} rows modified` : 'No issues found'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onNavigateToModelLab}
              className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A8841A] text-[#0B1F3A] font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              Next Step: Open Model Lab & Train ML Models
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: VERSION HISTORY */}
      {activeTab === 'versions' && (
        <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
            Audited Dataset Versions
          </h3>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
            Restore previous dataset snapshots or review past ingestion runs.
          </p>

          <div className="divide-y divide-[#E2DDD2] dark:divide-[#1F3A66] text-xs">
            {datasetVersions.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] block">{v.name}</span>
                  <span className="text-[#5C6370] dark:text-[#9BA4B4]">
                    {v.rowCount.toLocaleString('en-GB')} rows • Quality Score: {v.qualityScore}/100 • {new Date(v.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <button
                  onClick={() => onRestoreVersion(v)}
                  className="px-3 py-1.5 rounded border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#0B1F3A] dark:text-[#F7F5EF] hover:bg-white"
                >
                  Restore Version
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Data Hub, Ingestion & Validation"
        sections={[
          {
            heading: '38-Column Source of Truth',
            content: 'The platform ingests UK telecom customer data across 38 standardized fields including service types, contracts, usage, bill shock overages, network outages, and CSAT scores.',
          },
          {
            heading: 'Strict Target Leakage Rule',
            content: 'Churn Status, Churn Date, Churn Reason, Churn Flag, and Monthly Revenue At Risk are strictly prohibited from ever being used as model inputs. Tenure Months and Lifetime Revenue GBP feature leakage toggles.',
          },
          {
            heading: '0–100 Data Quality Score',
            content: 'Calculated using deterministic penalties for duplicate Customer IDs (-2 pts/ea), target agreement conflicts, date logic discrepancies, and out-of-range numerical fields.',
          },
        ]}
        regulatoryNotes="Complies with UK Data Protection Act 2018 and Ofcom guidance on end-of-contract notifications and customer billing fairness."
      />
    </div>
  );
};
