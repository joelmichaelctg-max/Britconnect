import React, { useState, useEffect } from 'react';
import {
  Database,
  LayoutDashboard,
  BrainCircuit,
  Sliders,
  Users,
  PieChart,
  Sparkles,
  Target,
  MessageSquareCode,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { BRAND } from '../config/constants';

export type PageId =
  | 'data-hub'
  | 'dashboard'
  | 'drivers'
  | 'models'
  | 'scoring'
  | 'segmentation'
  | 'retention'
  | 'campaigns'
  | 'analyst'
  | 'reports'
  | 'settings';

interface LayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  datasetName?: string;
  lastUpdated?: string;
  rowCount?: number;
  qualityScore?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  children: React.ReactNode;
  onOpenQuickSearch?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  activePage,
  onNavigate,
  datasetName = 'BritConnect UK Q4 Baseline (Synthetic Demo)',
  lastUpdated = 'Live Dataset',
  rowCount = 1200,
  qualityScore = 96,
  darkMode,
  onToggleDarkMode,
  children,
  onOpenQuickSearch,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global keyboard shortcut '/' for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        onOpenQuickSearch?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenQuickSearch]);

  const navItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'data-hub', label: 'Home / Data Hub', icon: <Database className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'drivers', label: 'Churn Drivers & Explainability', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'models', label: 'Model Lab', icon: <Sliders className="w-4 h-4" />, badge: '3 ML' },
    { id: 'scoring', label: 'Customer Scoring', icon: <Users className="w-4 h-4" /> },
    { id: 'segmentation', label: 'Segmentation', icon: <PieChart className="w-4 h-4" /> },
    { id: 'retention', label: 'Retention Recommendations', icon: <Sparkles className="w-4 h-4 text-[#E0BB4A]" />, badge: 'AI' },
    { id: 'campaigns', label: 'Campaign Tracker', icon: <Target className="w-4 h-4" /> },
    { id: 'analyst', label: 'AI Analyst (Chatbot)', icon: <MessageSquareCode className="w-4 h-4 text-[#E0BB4A]" />, badge: 'Live' },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Data Management', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-[#091629]' : 'bg-[#F7F5EF]'}`}>
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-68 bg-[#0B1F3A] text-white border-r border-[#1F3A66] shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1F3A66] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#A8841A] flex items-center justify-center text-[#0B1F3A] font-bold font-serif text-lg shadow-sm">
              BC
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white leading-tight font-display">
                {BRAND.name}
              </h1>
              <p className="text-[10px] text-[#E0BB4A] uppercase tracking-wider font-semibold">
                Churn Intelligence
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1F3A66] text-[#E0BB4A]">
            v{BRAND.version}
          </span>
        </div>

        {/* Dataset Pill in Sidebar */}
        <div className="px-4 py-3 bg-[#13294B]/70 border-b border-[#1F3A66]/60">
          <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1">
            <span className="truncate max-w-[140px] font-medium" title={datasetName}>
              {datasetName}
            </span>
            <span className="text-[#C9A227] font-semibold">{qualityScore}/100</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{rowCount.toLocaleString('en-GB')} accounts</span>
            <span>{lastUpdated}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#13294B] text-white shadow-xs'
                    : 'text-gray-300 hover:text-white hover:bg-[#13294B]/50'
                }`}
              >
                {/* Active Gold Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C9A227] rounded-r-md" />
                )}

                <div className="flex items-center gap-2.5 truncate">
                  <span className={`${isActive ? 'text-[#C9A227]' : 'text-gray-400 group-hover:text-[#E0BB4A]'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      item.badge === 'AI' || item.badge === 'Live'
                        ? 'bg-[#C9A227] text-[#0B1F3A]'
                        : 'bg-[#1F3A66] text-gray-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Regulatory & Safety Footer */}
        <div className="p-4 border-t border-[#1F3A66] bg-[#0B1F3A]/80 text-[10px] text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>Ofcom & GDPR Guarded</span>
          </div>
          <span className="text-[9px] text-[#A8841A]">UK Private</span>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-[#0B1F3A] text-white p-5 flex flex-col z-50">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F3A66]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C9A227] text-[#0B1F3A] flex items-center justify-center font-bold">
                  BC
                </div>
                <span className="font-bold text-sm">{BRAND.name}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium ${
                    activePage === item.id ? 'bg-[#13294B] text-[#C9A227]' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#C9A227] text-[#0B1F3A] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white dark:bg-[#13294B] border-b border-[#E2DDD2] dark:border-[#1F3A66] px-4 py-3 sticky top-0 z-20 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Mobile menu trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg text-[#0B1F3A] dark:text-[#F7F5EF] hover:bg-gray-100 dark:hover:bg-[#1F3A66]"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base text-[#0B1F3A] dark:text-[#F7F5EF] truncate">
                    {navItems.find((n) => n.id === activePage)?.label}
                  </span>
                  <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#F7F5EF] dark:bg-[#0B1F3A] text-[#5C6370] dark:text-[#9BA4B4] border border-[#E2DDD2] dark:border-[#1F3A66]">
                    UK Telecoms
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2.5">
              {/* Quick Search Shortcut Pill */}
              <button
                onClick={onOpenQuickSearch}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg text-xs text-[#5C6370] dark:text-[#9BA4B4] hover:border-[#C9A227] transition-colors"
                title="Search customers, metrics, or navigate (Shortcut: /)"
              >
                <Search className="w-3.5 h-3.5 text-[#5C6370]" />
                <span>Search accounts or metrics...</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] text-[10px] font-mono text-[#0B1F3A] dark:text-[#E0BB4A]">
                  /
                </kbd>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-lg text-[#5C6370] dark:text-[#E0BB4A] hover:bg-[#F7F5EF] dark:hover:bg-[#1F3A66] border border-[#E2DDD2] dark:border-[#1F3A66] transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Navy Mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Data Quality Badge */}
              <div
                onClick={() => onNavigate('data-hub')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B1F3A] text-white text-xs cursor-pointer hover:bg-[#1F3A66] transition-colors"
                title="Data Quality Score"
              >
                <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-pulse" />
                <span className="font-semibold text-[#E0BB4A]">{qualityScore}</span>
                <span className="text-[10px] text-gray-300">Score</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
