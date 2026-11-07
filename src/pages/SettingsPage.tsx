import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Settings,
  ShieldCheck,
  Database,
  Download,
  Upload,
  Trash2,
  Lock,
  Save,
  RotateCcw,
  Info,
  Clock,
  PoundSterling,
  AlertTriangle,
} from 'lucide-react';
import type { AppSettings } from '../types/customer';
import { getSettings, saveSettings, db, logAudit, type AuditLogEntry } from '../services/db';
import { exportToJson } from '../services/exportService';
import { HelpDrawer } from '../components/HelpDrawer';

interface SettingsPageProps {
  onClearAllData: () => void;
  onRefreshData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onClearAllData,
  onRefreshData,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<string>('~4.8 MB');

  useEffect(() => {
    getSettings().then(setSettings);
    db.auditLogs.toArray().then((logs) => {
      setAuditLogs(logs.reverse().slice(0, 25));
    });

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage) {
          const mb = (est.usage / (1024 * 1024)).toFixed(2);
          setStorageEstimate(`${mb} MB`);
        }
      });
    }
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await saveSettings(settings);
    alert('Settings successfully updated and saved to IndexedDB!');
    onRefreshData();
  };

  const handleExportBackup = async () => {
    const allCustomers = await db.customers.toArray();
    const allModels = await db.models.toArray();
    const allCampaigns = await db.campaigns.toArray();
    const currentSettings = await getSettings();

    const backup = {
      app: 'BritConnect AI Churn Platform',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      settings: currentSettings,
      customers: allCustomers,
      models: allModels,
      campaigns: allCampaigns,
    };

    exportToJson(`BritConnect_Backup_${new Date().toISOString().split('T')[0]}`, backup);
    await logAudit('DATA_BACKUP_EXPORTED', `Exported full backup containing ${allCustomers.length} records.`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backup = JSON.parse(evt.target?.result as string);
        if (backup.customers) {
          await db.customers.clear();
          await db.customers.bulkAdd(backup.customers);
        }
        if (backup.settings) {
          await saveSettings(backup.settings);
          setSettings(backup.settings);
        }
        await logAudit('DATA_BACKUP_IMPORTED', `Restored backup containing ${backup.customers?.length || 0} records.`);
        alert('Backup successfully imported!');
        onRefreshData();
      } catch (err: any) {
        alert(`Failed to import backup: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Settings, Governance & Data Management
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Configure risk thresholds, economic assumptions, target leakage toggles, AI privacy constraints, and IndexedDB storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Settings Guide
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-[#C9A227]" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Risk Tier Thresholds & Business Assumptions */}
        <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C9A227]" />
            Risk Tier Cutoff Boundaries
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[#5C6370] dark:text-[#9BA4B4] block mb-1">Low Risk Max</label>
              <input
                type="number"
                step="0.05"
                value={settings.riskTiers.lowMax}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskTiers: { ...settings.riskTiers, lowMax: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2 text-xs font-mono"
              />
              <span className="text-[10px] text-[#5C6370] mt-0.5 block">&lt; {(settings.riskTiers.lowMax * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="text-[#5C6370] dark:text-[#9BA4B4] block mb-1">Medium Risk Max</label>
              <input
                type="number"
                step="0.05"
                value={settings.riskTiers.medMax}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskTiers: { ...settings.riskTiers, medMax: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2 text-xs font-mono"
              />
              <span className="text-[10px] text-[#A8841A] mt-0.5 block">&lt; {(settings.riskTiers.medMax * 100).toFixed(0)}%</span>
            </div>

            <div>
              <label className="text-[#5C6370] dark:text-[#9BA4B4] block mb-1">High Risk Max</label>
              <input
                type="number"
                step="0.05"
                value={settings.riskTiers.highMax}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskTiers: { ...settings.riskTiers, highMax: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2 text-xs font-mono"
              />
              <span className="text-[10px] text-[#8B1A1A] mt-0.5 block">Critical is ≥ {(settings.riskTiers.highMax * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2DDD2] dark:border-[#1F3A66] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
              Commercial Assumptions Defaults
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[#5C6370] block mb-1">Average Offer Cost (£)</label>
                <input
                  type="number"
                  value={settings.assumptions.averageOfferCostGBP}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      assumptions: { ...settings.assumptions, averageOfferCostGBP: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[#5C6370] block mb-1">Average Save Rate (%)</label>
                <input
                  type="number"
                  value={Math.round(settings.assumptions.averageSaveRate * 100)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      assumptions: { ...settings.assumptions, averageSaveRate: Number(e.target.value) / 100 },
                    })
                  }
                  className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Privacy, Leakage & Compliance */}
        <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
            Data Privacy & Target Leakage Guardrails
          </h3>

          <div className="space-y-3 text-xs">
            {/* Privacy Toggle */}
            <div className="p-3 bg-[#FDF7E7] dark:bg-[#0B1F3A]/60 border border-[#C9A227]/30 rounded-xl space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                  Do not send customer-level data to AI (Privacy Mode)
                </span>
                <input
                  type="checkbox"
                  checked={settings.privacy.doNotSendCustomerLevelDataToAI}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      privacy: { doNotSendCustomerLevelDataToAI: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded text-[#0B1F3A] focus:ring-[#C9A227]"
                />
              </label>
              <p className="text-[11px] text-[#5C6370] dark:text-[#9BA4B4]">
                When enabled (default), Gemini receives only pre-computed statistical aggregates and anonymized account identifiers.
              </p>
            </div>

            {/* Leakage Controls */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] block">
                Feature Leakage Inclusion Toggles:
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.leakage.includeTenureMonths}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leakage: { ...settings.leakage, includeTenureMonths: e.target.checked },
                    })
                  }
                  className="rounded text-[#0B1F3A]"
                />
                <span>Include Tenure Months in Model Training (Default: Yes)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.leakage.includeLifetimeRevenueGBP}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      leakage: { ...settings.leakage, includeLifetimeRevenueGBP: e.target.checked },
                    })
                  }
                  className="rounded text-[#0B1F3A]"
                />
                <span className="text-[#A8841A]">Include Lifetime Revenue GBP in Model Training (Default: Excluded)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Data Persistence, Backup, & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage & Backup */}
        <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#C9A227]" />
            IndexedDB Browser Storage
          </h3>

          <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg text-xs space-y-1">
            <span className="text-[#5C6370] block">Estimated Local Storage Used:</span>
            <span className="text-xl font-bold font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">{storageEstimate}</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={handleExportBackup}
              className="w-full py-2 bg-[#F7F5EF] dark:bg-[#0B1F3A] hover:bg-[#EAE6DB] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Full Backup (JSON)
            </button>

            <label className="w-full py-2 bg-[#F7F5EF] dark:bg-[#0B1F3A] hover:bg-[#EAE6DB] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Backup (JSON)</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            <div className="pt-2">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-2 bg-[#FDEDED] hover:bg-[#FCE8E8] text-[#8B1A1A] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Data & Reset Platform
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
            <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A227]" />
              Immutable Activity Audit Trail
            </h3>
            <span className="text-[11px] text-[#5C6370]">Recent 25 actions</span>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F5EF] dark:bg-[#0B1F3A]/60 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                  <th className="p-2 font-semibold">Timestamp</th>
                  <th className="p-2 font-semibold">Action</th>
                  <th className="p-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD2]/60">
                {auditLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2 font-mono text-[11px] text-[#5C6370]">
                      {new Date(log.timestamp).toLocaleTimeString('en-GB')}
                    </td>
                    <td className="p-2 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">{log.action}</td>
                    <td className="p-2 text-[#5C6370] truncate max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Double Confirmation Modal to Clear Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-[#0B1F3A]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#13294B] border border-[#8B1A1A] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#8B1A1A]">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                  Confirm Irreversible Data Deletion
                </h3>
                <p className="text-xs text-[#5C6370] mt-0.5">
                  Are you absolutely sure you want to clear all datasets, trained models, customer scores, and campaigns from your browser?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border rounded text-xs text-[#5C6370]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#5E1111] text-white text-xs font-bold rounded"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Platform Governance & Settings"
        sections={[
          {
            heading: 'Privacy Mode Enforcement',
            content: 'Guarantees that raw customer records are never shared with third-party LLMs. Gemini only receives verified numerical aggregates and anonymized indices.',
          },
          {
            heading: 'Leakage Control Rationale',
            content: 'Lifetime Revenue GBP is excluded from training features by default because churned customers halt revenue accumulation, causing artificial target correlation.',
          },
        ]}
      />
    </div>
  );
};
