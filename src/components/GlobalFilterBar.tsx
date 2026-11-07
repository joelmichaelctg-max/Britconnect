import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { UK_NATIONS, SERVICE_TYPES, CONTRACT_TYPES } from '../config/constants';

export interface FilterState {
  segment: string;
  ukNation: string;
  serviceType: string;
  contractType: string;
  riskTier: string;
  searchQuery: string;
  startDate?: string;
  endDate?: string;
}

interface GlobalFilterBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const activeFilterChips: { key: keyof FilterState; label: string; value: string }[] = [];

  if (filters.segment) activeFilterChips.push({ key: 'segment', label: 'Segment', value: filters.segment });
  if (filters.ukNation) activeFilterChips.push({ key: 'ukNation', label: 'Nation', value: filters.ukNation });
  if (filters.serviceType) activeFilterChips.push({ key: 'serviceType', label: 'Service', value: filters.serviceType });
  if (filters.contractType) activeFilterChips.push({ key: 'contractType', label: 'Contract', value: filters.contractType });
  if (filters.riskTier) activeFilterChips.push({ key: 'riskTier', label: 'Risk', value: filters.riskTier });

  const isFiltered = activeFilterChips.length > 0 || filters.searchQuery !== '';

  return (
    <div className="bg-white dark:bg-[#13294B] border-b border-[#E2DDD2] dark:border-[#1F3A66] px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center text-[#5C6370] dark:text-[#9BA4B4] font-medium mr-1">
            <Filter className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
            <span>Filters:</span>
          </div>

          {/* Segment */}
          <select
            value={filters.segment}
            onChange={(e) => onChange({ ...filters, segment: e.target.value })}
            className="bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#1A1A1A] dark:text-[#F7F5EF] rounded-md px-2.5 py-1 focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          >
            <option value="">All Segments</option>
            <option value="Consumer">Consumer</option>
            <option value="Small Business">Small Business</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          {/* UK Nation */}
          <select
            value={filters.ukNation}
            onChange={(e) => onChange({ ...filters, ukNation: e.target.value })}
            className="bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#1A1A1A] dark:text-[#F7F5EF] rounded-md px-2.5 py-1 focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          >
            <option value="">All UK Nations</option>
            {UK_NATIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          {/* Service Type */}
          <select
            value={filters.serviceType}
            onChange={(e) => onChange({ ...filters, serviceType: e.target.value })}
            className="bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#1A1A1A] dark:text-[#F7F5EF] rounded-md px-2.5 py-1 focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          >
            <option value="">All Service Types</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Contract Type */}
          <select
            value={filters.contractType}
            onChange={(e) => onChange({ ...filters, contractType: e.target.value })}
            className="bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#1A1A1A] dark:text-[#F7F5EF] rounded-md px-2.5 py-1 focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          >
            <option value="">All Contract Types</option>
            {CONTRACT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Risk Tier */}
          <select
            value={filters.riskTier}
            onChange={(e) => onChange({ ...filters, riskTier: e.target.value })}
            className="bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#1A1A1A] dark:text-[#F7F5EF] rounded-md px-2.5 py-1 focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          >
            <option value="">All Risk Tiers</option>
            <option value="Low">Low Risk (&lt;25%)</option>
            <option value="Medium">Medium Risk (25-50%)</option>
            <option value="High">High Risk (50-75%)</option>
            <option value="Critical">Critical Risk (≥75%)</option>
          </select>
        </div>

        {/* Count summary and Reset button */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#5C6370] dark:text-[#9BA4B4]">
            Showing <strong className="text-[#0B1F3A] dark:text-[#F7F5EF]">{filteredCount.toLocaleString('en-GB')}</strong> of {totalCount.toLocaleString('en-GB')}
          </span>

          {isFiltered && (
            <button
              onClick={onReset}
              className="text-xs text-[#8B1A1A] dark:text-[#E0BB4A] hover:underline flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-[#E2DDD2]/40 dark:border-[#1F3A66]/60">
          <span className="text-[11px] text-[#5C6370] dark:text-[#9BA4B4]">Active:</span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#0B1F3A] text-white dark:bg-[#C9A227] dark:text-[#0B1F3A]"
            >
              <span>{chip.label}: {chip.value}</span>
              <button
                onClick={() => onChange({ ...filters, [chip.key]: '' })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
