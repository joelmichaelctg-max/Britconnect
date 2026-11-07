import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Eye, Columns } from 'lucide-react';
import { exportToCsv, exportToExcel } from '../services/exportService';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  defaultVisible?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  onRowClick?: (row: T) => void;
  title?: string;
  pageSizeDefault?: number;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Search table...',
  searchKeys = ['customerId', 'city', 'planName', 'customerSegment'],
  onRowClick,
  title,
  pageSizeDefault = 15,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeDefault);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((c) => {
      map[c.key] = c.defaultVisible !== false;
    });
    return map;
  });
  const [showColumnChooser, setShowColumnChooser] = useState(false);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((k) => String(row[k] || '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, search, searchKeys, sortKey, sortAsc]);

  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const pageData = processedData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleExportCsv = () => {
    exportToCsv(title ? `${title.replace(/\s+/g, '_')}_export` : 'table_export', processedData);
  };

  const handleExportExcel = () => {
    exportToExcel(title ? `${title.replace(/\s+/g, '_')}_export` : 'table_export', [
      { sheetName: 'Data', data: processedData },
    ]);
  };

  const activeCols = columns.filter((c) => visibleColumns[c.key]);

  return (
    <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 border-b border-[#E2DDD2] dark:border-[#1F3A66] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#5C6370] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg text-xs text-[#1A1A1A] dark:text-[#F7F5EF] focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Column Chooser Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnChooser(!showColumnChooser)}
              className="p-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] rounded-md transition-colors flex items-center gap-1 border border-[#E2DDD2] dark:border-[#1F3A66]"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Columns</span>
            </button>

            {showColumnChooser && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-3 shadow-xl z-30 space-y-1.5">
                <span className="text-[11px] font-bold text-[#0B1F3A] dark:text-[#F7F5EF] uppercase block mb-1">
                  Toggle Columns
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 text-xs text-[#1A1A1A] dark:text-[#F7F5EF] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[c.key]}
                        onChange={(e) =>
                          setVisibleColumns({ ...visibleColumns, [c.key]: e.target.checked })
                        }
                        className="rounded text-[#0B1F3A] focus:ring-[#C9A227]"
                      />
                      <span className="truncate">{c.header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Actions */}
          <button
            onClick={handleExportCsv}
            className="p-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] rounded-md transition-colors flex items-center gap-1 border border-[#E2DDD2] dark:border-[#1F3A66]"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="p-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] rounded-md transition-colors flex items-center gap-1 border border-[#E2DDD2] dark:border-[#1F3A66]"
            title="Export Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#C9A227]" />
            <span className="text-[11px] font-medium hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F5EF] dark:bg-[#0B1F3A]/60 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
              {activeCols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortable !== false && handleSort(c.key)}
                  className={`py-3 px-3.5 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] whitespace-nowrap ${
                    c.sortable !== false ? 'cursor-pointer select-none hover:bg-[#EAE6DB]/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{c.header}</span>
                    {sortKey === c.key && (
                      sortAsc ? <ChevronUp className="w-3 h-3 text-[#C9A227]" /> : <ChevronDown className="w-3 h-3 text-[#C9A227]" />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="py-3 px-3.5 text-right font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD2]/60 dark:divide-[#1F3A66]">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length + (actions ? 1 : 0)} className="py-8 text-center text-[#5C6370]">
                  No matching records found.
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={row.customerId || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-[#F7F5EF]/60 dark:hover:bg-[#1F3A66]/30 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {activeCols.map((c) => (
                    <td key={c.key} className="py-2.5 px-3.5 text-[#1A1A1A] dark:text-[#F7F5EF] whitespace-nowrap">
                      {c.render ? c.render(row) : String(row[c.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-[#E2DDD2] dark:border-[#1F3A66] bg-[#F7F5EF]/60 dark:bg-[#0B1F3A]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5C6370] dark:text-[#9BA4B4]">
        <span>
          Showing {pageData.length > 0 ? page * pageSize + 1 : 0} to{' '}
          {Math.min((page + 1) * pageSize, processedData.length)} of {processedData.length.toLocaleString('en-GB')} entries
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded px-1.5 py-0.5 text-xs"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded border border-[#E2DDD2] dark:border-[#1F3A66] disabled:opacity-40 hover:bg-white"
            >
              Prev
            </button>
            <span className="px-2">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded border border-[#E2DDD2] dark:border-[#1F3A66] disabled:opacity-40 hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
