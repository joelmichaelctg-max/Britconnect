import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Calculator,
  UploadCloud,
  Download,
  Info,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { Customer, ScoredCustomer, RiskTier } from '../types/customer';
import { DataTable, type ColumnDef } from '../components/DataTable';
import { CustomerModal } from '../components/CustomerModal';
import { ManualScoringModal } from '../components/ManualScoringModal';
import { BatchScoringModal } from '../components/BatchScoringModal';
import { HelpDrawer } from '../components/HelpDrawer';
import { GlobalFilterBar, type FilterState } from '../components/GlobalFilterBar';

interface CustomerScoringPageProps {
  customers: Customer[];
  scoredCustomers: ScoredCustomer[];
  onSelectCustomer: (customer: Customer) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  onSendToCampaign?: (customer: Customer, plan: any) => void;
}

export const CustomerScoringPage: React.FC<CustomerScoringPageProps> = ({
  customers,
  scoredCustomers,
  onSelectCustomer,
  filters,
  onFilterChange,
  onResetFilters,
  onSendToCampaign,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<ScoredCustomer | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Filter scored customers
  const filteredData = useMemo(() => {
    return scoredCustomers.filter((c) => {
      if (filters.segment && c.customerSegment !== filters.segment) return false;
      if (filters.ukNation && c.ukNation !== filters.ukNation) return false;
      if (filters.serviceType && c.serviceType !== filters.serviceType) return false;
      if (filters.contractType && c.contractType !== filters.contractType) return false;
      if (filters.riskTier && c.riskTier !== filters.riskTier) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const idMatch = c.customerId?.toLowerCase().includes(q);
        const cityMatch = c.city?.toLowerCase().includes(q);
        const planMatch = c.planName?.toLowerCase().includes(q);
        if (!idMatch && !cityMatch && !planMatch) return false;
      }
      return true;
    });
  }, [scoredCustomers, filters]);

  const columns: ColumnDef<ScoredCustomer>[] = [
    {
      key: 'customerId',
      header: 'Customer ID',
      render: (row) => (
        <span className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-1.5">
          {row.customerId}
          {row.riskTier === 'Critical' && (
            <span className="w-2 h-2 rounded-full bg-[#8B1A1A] animate-ping" />
          )}
        </span>
      ),
    },
    {
      key: 'churnProbability',
      header: 'Churn Probability',
      sortable: true,
      render: (row) => {
        const pct = Math.round((row.churnProbability || 0) * 100);
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#8B1A1A] w-10">{pct}%</span>
            <div className="w-16 h-2 bg-gray-100 dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
              <div
                style={{ width: `${pct}%` }}
                className={`h-full rounded-full ${
                  pct >= 75 ? 'bg-[#5E1111]' : pct >= 50 ? 'bg-[#8B1A1A]' : pct >= 25 ? 'bg-[#C9A227]' : 'bg-[#13294B]'
                }`}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'riskTier',
      header: 'Risk Tier',
      sortable: true,
      render: (row) => {
        const tier = row.riskTier || 'Low';
        const color =
          tier === 'Critical'
            ? 'bg-[#5E1111] text-white'
            : tier === 'High'
            ? 'bg-[#FDEDED] text-[#8B1A1A] dark:bg-[#8B1A1A]/30 dark:text-[#FDEDED]'
            : tier === 'Medium'
            ? 'bg-[#FDF7E7] text-[#A8841A] dark:bg-[#A8841A]/30 dark:text-[#E0BB4A]'
            : 'bg-[#13294B]/10 text-[#13294B] dark:bg-[#1F3A66] dark:text-[#E0BB4A]';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
            {tier}
          </span>
        );
      },
    },
    {
      key: 'customerSegment',
      header: 'Segment',
      sortable: true,
    },
    {
      key: 'ukNation',
      header: 'UK Nation',
      sortable: true,
      render: (row) => `${row.city || 'City'}, ${row.ukNation}`,
    },
    {
      key: 'contractType',
      header: 'Contract',
      sortable: true,
    },
    {
      key: 'monthlyChargeGBP',
      header: 'Monthly Charge',
      sortable: true,
      render: (row) => `£${Number(row.monthlyChargeGBP || 0).toFixed(2)}`,
    },
    {
      key: 'predictedRevenueAtRiskGBP',
      header: 'Monthly Risk (£)',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-[#8B1A1A]">
          £{Number(row.predictedRevenueAtRiskGBP || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'satisfactionScore',
      header: 'CSAT / NPS',
      sortable: true,
      render: (row) => `${row.satisfactionScore}/10 (NPS ${row.npsScore})`,
    },
    {
      key: 'tenureMonths',
      header: 'Tenure',
      sortable: true,
      render: (row) => `${row.tenureMonths}m`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={onFilterChange}
        onReset={onResetFilters}
        totalCount={scoredCustomers.length}
        filteredCount={filteredData.length}
      />

      {/* Header with Quick Action Modals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Customer Risk Scoring & Portfolio Registry
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Individual subscriber churn risk scoring (0–100%), Revenue at Risk rankings, and action protocols.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] dark:text-[#9BA4B4] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Scoring Guide
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] bg-white dark:bg-[#13294B] text-xs font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] hover:border-[#C9A227] flex items-center gap-1.5 shadow-2xs"
          >
            <Calculator className="w-3.5 h-3.5 text-[#C9A227]" />
            Score New Customer
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#C9A227]" />
            Batch Score File
          </button>
        </div>
      </div>

      {/* Main Scored Customer DataTable */}
      <DataTable
        title="BritConnect Customer Churn Scores"
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search by Customer ID, City, Plan, or Segment..."
        onRowClick={(row) => setSelectedCustomer(row)}
        pageSizeDefault={15}
        actions={(row) => (
          <button
            onClick={() => setSelectedCustomer(row)}
            className="px-2.5 py-1 rounded bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[#C9A227]" />
            View & Retain
          </button>
        )}
      />

      {/* Drilldown Customer Modal */}
      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSendToCampaign={onSendToCampaign}
        />
      )}

      {/* Manual Customer Scoring Modal */}
      {showManualModal && (
        <ManualScoringModal onClose={() => setShowManualModal(false)} />
      )}

      {/* Batch Unlabelled Scoring Modal */}
      {showBatchModal && (
        <BatchScoringModal onClose={() => setShowBatchModal(false)} />
      )}

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Customer Scoring & Risk Tiers"
        sections={[
          {
            heading: 'Risk Tier Stratification',
            content: 'Low (<25%): Healthy relationship. Medium (25-50%): Early friction signals. High (50-75%): Escalated dissatisfaction. Critical (≥75%): Imminent cancellation risk within 30 days.',
          },
          {
            heading: 'Revenue at Risk (£)',
            content: 'Calculated as Churn Probability × Monthly Subscription Charge (£). Represents expected monthly ARR loss if no retention intervention is deployed.',
          },
        ]}
        regulatoryNotes="Individual customer scoring respects UK GDPR principles of automated decision support with human oversight."
      />
    </div>
  );
};
