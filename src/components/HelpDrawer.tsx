import React from 'react';
import { X, HelpCircle, BookOpen, ShieldAlert } from 'lucide-react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
  regulatoryNotes?: string;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({
  isOpen,
  onClose,
  title,
  sections,
  regulatoryNotes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white dark:bg-[#13294B] shadow-2xl flex flex-col border-l border-[#E2DDD2] dark:border-[#1F3A66] animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="bg-[#0B1F3A] text-white p-5 flex items-center justify-between border-b border-[#C9A227]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#C9A227]" />
            <div>
              <h3 className="text-sm font-bold font-display">How to Read This Page</h3>
              <p className="text-[11px] text-[#E0BB4A]">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1F3A66]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-[#1A1A1A] dark:text-[#F7F5EF]">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <h4 className="font-bold text-[#0B1F3A] dark:text-[#E0BB4A] text-xs uppercase tracking-wide flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#C9A227]" />
                {sec.heading}
              </h4>
              <p className="text-[#5C6370] dark:text-[#9BA4B4] leading-relaxed whitespace-pre-line">
                {sec.content}
              </p>
            </div>
          ))}

          {regulatoryNotes && (
            <div className="p-3.5 bg-[#FDEDED] dark:bg-[#5E1111]/30 border border-[#8B1A1A]/30 rounded-xl space-y-1 mt-6">
              <h5 className="font-bold text-[#8B1A1A] dark:text-[#FDEDED] text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#8B1A1A]" />
                Compliance & Fairness Notice
              </h5>
              <p className="text-[11px] text-[#5C6370] dark:text-[#9BA4B4] leading-relaxed">
                {regulatoryNotes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F5EF] dark:bg-[#0B1F3A]/40 border-t border-[#E2DDD2] dark:border-[#1F3A66] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0B1F3A] text-white rounded-md text-xs font-semibold hover:bg-[#1F3A66]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
