import React, { useRef } from 'react';
import { Download, Table, AlertCircle, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { exportToCsv } from '../services/exportService';

interface ChartWrapperProps {
  title: string;
  subtitle: string;
  filterNote?: string;
  csvData?: Record<string, any>[];
  csvFilename?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string;
  onRetry?: () => void;
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  filterNote,
  csvData,
  csvFilename,
  isLoading = false,
  isEmpty = false,
  error,
  onRetry,
  children,
  height = 320,
  className = '',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = async () => {
    if (!chartContainerRef.current) return;
    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${(csvFilename || title).toLowerCase().replace(/[^a-z0-9]+/g, '_')}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export chart PNG:', err);
    }
  };

  const handleDownloadCsv = () => {
    if (!csvData || csvData.length === 0) return;
    exportToCsv(csvFilename || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_data`, csvData);
  };

  return (
    <div
      ref={chartContainerRef}
      className={`bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs transition-shadow hover:shadow-md ${className}`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 mb-2 border-b border-[#E2DDD2]/60 dark:border-[#1F3A66]">
        <div>
          <h3 className="text-base font-semibold text-[#0B1F3A] dark:text-[#F7F5EF] flex items-center gap-2">
            {title}
          </h3>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Chart Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {csvData && csvData.length > 0 && (
            <button
              onClick={handleDownloadCsv}
              title="Download Data (CSV)"
              className="p-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A] dark:hover:text-[#F7F5EF] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] rounded-md transition-colors flex items-center gap-1"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-medium">Data (CSV)</span>
            </button>
          )}

          <button
            onClick={handleDownloadPng}
            title="Download Chart as High-Res PNG"
            className="p-1.5 text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:text-[#0B1F3A] dark:hover:text-[#F7F5EF] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] rounded-md transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-medium">PNG</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div style={{ minHeight: height }} className="relative flex flex-col justify-center">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-[#13294B]/80 flex flex-col items-center justify-center z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-[#C9A227] mb-2" />
            <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">Calculating metrics...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="w-8 h-8 text-[#8B1A1A] mb-2" />
            <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F7F5EF]">Failed to render chart</p>
            <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] max-w-sm mt-1 mb-3">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-xs font-medium bg-[#0B1F3A] text-white rounded-md hover:bg-[#1F3A66]"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {isEmpty && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-[#5C6370] dark:text-[#9BA4B4]">No records matching current filters</p>
            <p className="text-xs text-[#5C6370]/80 dark:text-[#9BA4B4]/80 mt-1">Adjust or reset filters to display metrics</p>
          </div>
        )}

        {!isLoading && !error && !isEmpty && children}
      </div>

      {/* Chart Footer Note */}
      {filterNote && (
        <div className="mt-2 pt-2 border-t border-[#E2DDD2]/40 dark:border-[#1F3A66]/60 flex items-center justify-between text-[11px] text-[#5C6370] dark:text-[#9BA4B4]">
          <span>{filterNote}</span>
          <span className="font-mono text-[10px] text-[#A8841A]">No gridlines | Baseline axis</span>
        </div>
      )}
    </div>
  );
};
