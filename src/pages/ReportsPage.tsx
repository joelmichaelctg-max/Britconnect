import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Award,
  Users,
} from 'lucide-react';
import type { Customer, ScoredCustomer, TrainedModelSummary, Campaign } from '../types/customer';
import { exportElementToPdf, exportToCsv, exportToExcel } from '../services/exportService';
import { HelpDrawer } from '../components/HelpDrawer';

interface ReportsPageProps {
  customers: Customer[];
  scoredCustomers: ScoredCustomer[];
  championModel: TrainedModelSummary | null;
  campaigns: Campaign[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  customers,
  scoredCustomers,
  championModel,
  campaigns,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('executive');
  
  // Custom Report Builder Sections
  const [sections, setSections] = useState({
    kpis: true,
    churnDrivers: true,
    modelEvaluation: true,
    atRiskList: true,
    retentionPlaybook: true,
    campaignUplift: true,
  });

  const [customExecutiveNotes, setCustomExecutiveNotes] = useState(
    'Q4 customer retention review shows substantial concentration of churn risk among out-of-contract broadband subscribers. Recommend immediate execution of tariff right-sizing and proactive outage goodwill credits.'
  );

  const handleDownloadPdf = () => {
    exportElementToPdf('printable-report-canvas', `BritConnect_${selectedReportType}_Report`, `${selectedReportType.toUpperCase()} SUMMARY`);
  };

  const handleDownloadExcel = () => {
    const atRiskData = scoredCustomers.slice(0, 50).map((c) => ({
      'Customer ID': c.customerId,
      Segment: c.customerSegment,
      Nation: c.ukNation,
      'Monthly Charge': c.monthlyChargeGBP,
      'Churn Probability': `${(c.churnProbability * 100).toFixed(1)}%`,
      'Risk Tier': c.riskTier,
      'Revenue at Risk GBP': c.predictedRevenueAtRiskGBP,
    }));

    exportToExcel(`BritConnect_Comprehensive_Intelligence_Pack`, [
      { sheetName: 'At-Risk Accounts', data: atRiskData },
      { sheetName: 'Campaign Performance', data: campaigns as any },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Executive Reports & Intelligence Packs
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Downloadable branded reports in PDF, Excel, and CSV format with custom section selection and executive annotations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Report Formats
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] hover:bg-white flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C9A227]" />
            Multi-Sheet Excel Pack
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            Download Branded PDF
          </button>
        </div>
      </div>

      {/* Report Configuration & Section Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
            Report Template & Scope
          </h3>

          <div className="space-y-2 text-xs">
            {[
              { id: 'executive', name: 'Executive Summary Briefing Pack' },
              { id: 'quality', name: 'Data Quality & Validation Audit' },
              { id: 'model', name: 'ML Model Performance & Evaluation' },
              { id: 'atrisk', name: 'High-Risk Customer Target Registry' },
              { id: 'campaign', name: 'Campaign Uplift & Control ROI' },
            ].map((tmpl) => (
              <label
                key={tmpl.id}
                className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                  selectedReportType === tmpl.id
                    ? 'border-[#C9A227] bg-[#FDF7E7] dark:bg-[#0B1F3A] text-[#0B1F3A] dark:text-[#E0BB4A] font-semibold'
                    : 'border-[#E2DDD2] dark:border-[#1F3A66]'
                }`}
              >
                <input
                  type="radio"
                  name="reportTmpl"
                  checked={selectedReportType === tmpl.id}
                  onChange={() => setSelectedReportType(tmpl.id)}
                  className="text-[#C9A227]"
                />
                <span>{tmpl.name}</span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E2DDD2] dark:border-[#1F3A66] space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF] block">
              Include Sections
            </span>
            <div className="space-y-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4]">
              {Object.entries(sections).map(([key, isChecked]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                    className="rounded text-[#0B1F3A]"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2DDD2] dark:border-[#1F3A66] space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF] block">
              Executive Commentary / Notes
            </label>
            <textarea
              rows={3}
              value={customExecutiveNotes}
              onChange={(e) => setCustomExecutiveNotes(e.target.value)}
              className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg p-2 text-xs text-[#1A1A1A] dark:text-[#F7F5EF]"
            />
          </div>
        </div>

        {/* Live Report Preview Canvas (for PDF rendering) */}
        <div className="lg:col-span-2">
          <div
            id="printable-report-canvas"
            className="bg-white p-8 rounded-xl border border-[#E2DDD2] shadow-md space-y-6 text-[#1A1A1A]"
          >
            {/* Branded Title Block */}
            <div className="border-b-2 border-[#C9A227] pb-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold tracking-widest text-[#A8841A] uppercase">
                  BritConnect Telecommunications UK
                </span>
                <h1 className="text-2xl font-bold font-serif text-[#0B1F3A] mt-0.5">
                  Customer Churn Intelligence & Retention Report
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Scope: {selectedReportType.toUpperCase()} • Generated: {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>

              <div className="w-12 h-12 rounded-lg bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center font-serif font-bold text-xl">
                BC
              </div>
            </div>

            {/* Executive Annotation Box */}
            {customExecutiveNotes && (
              <div className="p-4 bg-[#FDF7E7] border-l-4 border-l-[#C9A227] rounded-r-lg text-xs leading-relaxed text-[#0B1F3A]">
                <strong className="block mb-1">Executive Commentary:</strong>
                {customExecutiveNotes}
              </div>
            )}

            {/* Core KPIs Section */}
            {sections.kpis && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold tracking-wider text-[#0B1F3A] uppercase border-b border-gray-200 pb-1">
                  1. Portfolio Baseline Metrics
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">Total Accounts</span>
                    <strong className="text-base text-[#0B1F3A]">{customers.length.toLocaleString('en-GB')}</strong>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">Baseline Churn</span>
                    <strong className="text-base text-[#8B1A1A]">
                      {((customers.filter((c) => Number(c.churnFlag) === 1).length / Math.max(1, customers.length)) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">Monthly ARPU</span>
                    <strong className="text-base text-[#0B1F3A]">
                      £{(customers.reduce((a, b) => a + Number(b.monthlyChargeGBP || 0), 0) / Math.max(1, customers.length)).toFixed(2)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-200">
                    <span className="text-gray-500 block text-[10px]">Revenue at Risk</span>
                    <strong className="text-base text-[#8B1A1A]">
                      £{Math.round(scoredCustomers.reduce((a, b) => a + (b.predictedRevenueAtRiskGBP || 0), 0)).toLocaleString('en-GB')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Top Priority At-Risk Accounts */}
            {sections.atRiskList && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold tracking-wider text-[#0B1F3A] uppercase border-b border-gray-200 pb-1">
                  2. Priority Accounts Requiring P1/P2 Intervention
                </h3>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-1.5 font-semibold">Customer ID</th>
                      <th className="p-1.5 font-semibold">Segment</th>
                      <th className="p-1.5 font-semibold">Contract</th>
                      <th className="p-1.5 font-semibold">Spend</th>
                      <th className="p-1.5 font-semibold">Risk %</th>
                      <th className="p-1.5 font-semibold text-right">Rev at Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scoredCustomers.slice(0, 6).map((c) => (
                      <tr key={c.customerId}>
                        <td className="p-1.5 font-bold text-[#0B1F3A]">{c.customerId}</td>
                        <td className="p-1.5 text-gray-700">{c.customerSegment}</td>
                        <td className="p-1.5 text-gray-600">{c.contractType}</td>
                        <td className="p-1.5 font-mono">£{c.monthlyChargeGBP}/mo</td>
                        <td className="p-1.5 font-mono font-bold text-[#8B1A1A]">
                          {Math.round(c.churnProbability * 100)}%
                        </td>
                        <td className="p-1.5 font-mono font-bold text-right text-[#8B1A1A]">
                          £{c.predictedRevenueAtRiskGBP.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Compliance Sign-off */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
              <span>BritConnect Telecommunications plc • Registered in England and Wales</span>
              <span>Ofcom General Conditions & UK GDPR Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Reporting & Export Architecture"
        sections={[
          {
            heading: 'Branded Executive Reports',
            content: 'Generates board-ready documentation featuring the navy/gold header, formal title block, date timestamps, and custom executive notes.',
          },
          {
            heading: 'Multi-Sheet Excel Packs',
            content: 'Consolidates filtered customer churn scores, segment breakdowns, and campaign ROI metrics into a single multi-sheet workbook.',
          },
        ]}
      />
    </div>
  );
};
