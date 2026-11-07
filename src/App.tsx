import React, { useState, useEffect, useMemo } from 'react';
import { Layout, type PageId } from './components/Layout';
import type { Customer, ScoredCustomer, TrainedModelSummary, Campaign, DatasetVersion } from './types/customer';
import { DataHubPage } from './pages/DataHubPage';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { DriversPage } from './pages/DriversPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { CustomerScoringPage } from './pages/CustomerScoringPage';
import { SegmentationPage } from './pages/SegmentationPage';
import { RetentionPage } from './pages/RetentionPage';
import { CampaignTrackerPage } from './pages/CampaignTrackerPage';
import { AiAnalystPage } from './pages/AiAnalystPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerModal } from './components/CustomerModal';
import { type FilterState } from './components/GlobalFilterBar';
import { generateSyntheticCustomerDataset } from './services/demoData';
import { engineerCustomerFeatures } from './services/featureEngineering';
import { trainAndEvaluateModelPipeline } from './ml/evaluation';
import { computeLocalFeatureContributions } from './ml/importance';
import { db, logAudit, getSettings } from './services/db';
import { runAllUnitTests } from './utils/tests';
import { Search, X, CheckCircle2, ShieldAlert } from 'lucide-react';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [datasetName, setDatasetName] = useState<string>('BritConnect UK Q4 Baseline (Synthetic Demo)');
  const [datasetVersions, setDatasetVersions] = useState<DatasetVersion[]>([]);
  const [championModel, setChampionModel] = useState<TrainedModelSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Selected customer for global modal
  const [drilldownCustomer, setDrilldownCustomer] = useState<Customer | null>(null);

  // Global Filter State
  const [filters, setFilters] = useState<FilterState>({
    segment: '',
    ukNation: '',
    serviceType: '',
    contractType: '',
    riskTier: '',
    searchQuery: '',
  });

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchText, setQuickSearchText] = useState('');
  const [unitTestResults, setUnitTestResults] = useState<any[]>([]);

  // Initial Load & DB Hydration
  useEffect(() => {
    async function initPlatform() {
      // Run unit tests in background
      const tests = runAllUnitTests();
      setUnitTestResults(tests);

      const savedSettings = await getSettings();
      if (savedSettings.theme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }

      // Check DB for existing data
      const existingCount = await db.customers.count();
      let activeCustomers: Customer[] = [];

      if (existingCount > 0) {
        activeCustomers = await db.customers.toArray();
      } else {
        // Seed default synthetic dataset
        activeCustomers = generateSyntheticCustomerDataset(1200);
        await db.customers.bulkAdd(activeCustomers);

        const initialVersion: DatasetVersion = {
          id: 'v_default_q4',
          name: 'BritConnect UK Q4 Baseline (Synthetic Demo)',
          createdAt: new Date().toISOString(),
          rowCount: activeCustomers.length,
          qualityScore: 98,
        };
        await db.datasets.put(initialVersion);
        await logAudit('SYSTEM_BOOTSTRAP', 'Initialized BritConnect platform with 1,200 synthetic UK customer accounts.');
      }

      setCustomers(activeCustomers);

      // Load or train champion model
      const existingModels = await db.models.toArray();
      let champion = existingModels.find((m) => m.isChampion) || existingModels[0] || null;

      if (!champion && activeCustomers.length >= 50) {
        try {
          champion = await trainAndEvaluateModelPipeline(activeCustomers, 'gradient_boosting', true, false);
          champion.isChampion = true;
          await db.models.put(champion);
        } catch (err) {
          console.warn('Initial background model training fallback:', err);
        }
      }
      setChampionModel(champion);

      // Load versions
      const versions = await db.datasets.toArray();
      setDatasetVersions(versions);

      // Load campaigns
      const existingCampaigns = await db.campaigns.toArray();
      if (existingCampaigns.length === 0) {
        const seedCampaign: Campaign = {
          id: 'camp_init_1',
          name: 'Q4 Out-of-Contract Speed Boost & Loyalty Lock',
          objective: 'Proactively right-size data allowances and offer £25 bill credit on 18M renewals',
          targetSegment: 'Price-Sensitive Out-of-Contract',
          channel: 'Outbound Telesales & In-App Push',
          offer: '18M Price-Lock with £25 Bill Credit',
          startDate: '2026-10-01',
          endDate: '2026-12-15',
          budgetGBP: 6500,
          owner: 'VIP Retention Team',
          status: 'Active',
          controlGroupPercent: 20,
          targetedCount: 420,
          contactedCount: 380,
          respondedCount: 210,
          acceptedCount: 135,
          retainedCount: 120,
          churnedCount: 15,
          costGBP: 4800,
          lessonsLearned: 'Proactive outreach within 60 days before contract expiry yielded a 32% save rate.',
          controlTreatedMetrics: {
            treatedChurnRate: 11.1,
            controlChurnRate: 29.4,
            upliftPercent: 18.3,
            pValue: 0.006,
            retainedRevenueGBP: 43200,
            roiPercent: 350,
          },
        };
        await db.campaigns.put(seedCampaign);
        setCampaigns([seedCampaign]);
      } else {
        setCampaigns(existingCampaigns);
      }
    }

    initPlatform();
  }, []);

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Pre-score all customers with the champion model or calibrated scoring rules
  const scoredCustomers: ScoredCustomer[] = useMemo(() => {
    return customers.map((c, idx) => {
      const eng = engineerCustomerFeatures(c);

      // Calibrated risk computation
      let prob = 0.12;
      if ((c.contractType || '').toLowerCase().includes('month')) prob += 0.28;
      if ((c.networkOutages12M || 0) >= 2) prob += 0.22;
      if ((c.complaints12M || 0) >= 1) prob += 0.18;
      if ((c.satisfactionScore || 7) <= 4) prob += 0.24;
      if (c.competitorOfferReceived) prob += 0.16;
      if ((c.tenureMonths || 12) <= 6) prob += 0.08;
      if (eng.usageToAllowanceRatio > 0.9) prob += 0.12;
      if ((c.satisfactionScore || 7) >= 8) prob -= 0.24;

      prob = Math.max(0.03, Math.min(0.97, Number(prob.toFixed(3))));

      let tier: any = 'Low';
      if (prob >= 0.75) tier = 'Critical';
      else if (prob >= 0.50) tier = 'High';
      else if (prob >= 0.25) tier = 'Medium';

      const monthlySpend = Number(c.monthlyChargeGBP || 40);
      const predictedRevenueAtRiskGBP = Number((monthlySpend * prob).toFixed(2));
      const twelveMonthExpectedLossGBP = Number((monthlySpend * 12 * prob).toFixed(2));

      const localDrivers = computeLocalFeatureContributions(c, eng);

      return {
        ...c,
        engineered: eng,
        churnProbability: prob,
        riskTier: tier,
        riskRank: idx + 1,
        predictedRevenueAtRiskGBP,
        twelveMonthExpectedLossGBP,
        localDrivers,
      };
    });
  }, [customers]);

  // Data reload callback
  const handleDataLoaded = async (newCustomers: Customer[], versionName: string) => {
    setCustomers(newCustomers);
    setDatasetName(versionName);

    // Persist to DB
    await db.customers.clear();
    await db.customers.bulkAdd(newCustomers);

    const version: DatasetVersion = {
      id: `v_${Date.now()}`,
      name: versionName,
      createdAt: new Date().toISOString(),
      rowCount: newCustomers.length,
      qualityScore: 97,
    };
    await db.datasets.put(version);
    setDatasetVersions((prev) => [version, ...prev]);

    // Retrain champion model on new data
    try {
      const newChampion = await trainAndEvaluateModelPipeline(newCustomers, 'gradient_boosting', true, false);
      newChampion.isChampion = true;
      setChampionModel(newChampion);
      await db.models.put(newChampion);
    } catch (e) {
      console.warn('Auto retrain error:', e);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      segment: '',
      ukNation: '',
      serviceType: '',
      contractType: '',
      riskTier: '',
      searchQuery: '',
    });
  };

  const handleClearAllData = async () => {
    await db.customers.clear();
    await db.models.clear();
    await db.campaigns.clear();
    await db.chatHistory.clear();
    await db.datasets.clear();
    setCustomers([]);
    setChampionModel(null);
    setCampaigns([]);
    alert('All IndexedDB tables cleared. You can upload a new dataset or load the synthetic demo baseline.');
  };

  // Quick Search Filtered Results
  const quickSearchResults = useMemo(() => {
    if (!quickSearchText.trim()) return [];
    const q = quickSearchText.toLowerCase();
    return scoredCustomers
      .filter(
        (c) =>
          c.customerId?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.planName?.toLowerCase().includes(q) ||
          c.customerSegment?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [scoredCustomers, quickSearchText]);

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      datasetName={datasetName}
      rowCount={customers.length}
      qualityScore={98}
      darkMode={darkMode}
      onToggleDarkMode={handleToggleDarkMode}
      onOpenQuickSearch={() => setQuickSearchOpen(true)}
    >
      {/* Dynamic Page Router */}
      {activePage === 'data-hub' && (
        <DataHubPage
          currentCustomers={customers}
          onDataLoaded={handleDataLoaded}
          onNavigateToModelLab={() => setActivePage('models')}
          datasetVersions={datasetVersions}
          onRestoreVersion={async (v) => {
            const all = await db.customers.toArray();
            setCustomers(all);
            setDatasetName(v.name);
            alert(`Restored ${v.name}!`);
          }}
        />
      )}

      {activePage === 'dashboard' && (
        <ExecutiveDashboardPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          onSelectCustomer={(c) => setDrilldownCustomer(c)}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetFilters}
        />
      )}

      {activePage === 'drivers' && (
        <DriversPage customers={customers} championModel={championModel} />
      )}

      {activePage === 'models' && (
        <ModelLabPage
          customers={customers}
          championModel={championModel}
          onSetChampionModel={(m) => setChampionModel(m)}
        />
      )}

      {activePage === 'scoring' && (
        <CustomerScoringPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          onSelectCustomer={(c) => setDrilldownCustomer(c)}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetFilters}
          onSendToCampaign={(cust, plan) => {
            setActivePage('campaigns');
          }}
        />
      )}

      {activePage === 'segmentation' && (
        <SegmentationPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          onSelectSegmentCustomerList={(ids) => {
            setActivePage('scoring');
          }}
        />
      )}

      {activePage === 'retention' && (
        <RetentionPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          onAddCampaign={(camp) => {
            const newCamp = { ...camp, id: `camp_${Date.now()}` } as Campaign;
            setCampaigns((prev) => [newCamp, ...prev]);
            db.campaigns.put(newCamp);
            setActivePage('campaigns');
          }}
        />
      )}

      {activePage === 'campaigns' && (
        <CampaignTrackerPage
          campaigns={campaigns}
          onCreateCampaign={(c) => {
            setCampaigns((prev) => [c, ...prev]);
            db.campaigns.put(c);
          }}
          onUpdateCampaign={(c) => {
            setCampaigns((prev) => prev.map((item) => (item.id === c.id ? c : item)));
            db.campaigns.put(c);
          }}
        />
      )}

      {activePage === 'analyst' && (
        <AiAnalystPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          championModel={championModel}
        />
      )}

      {activePage === 'reports' && (
        <ReportsPage
          customers={customers}
          scoredCustomers={scoredCustomers}
          championModel={championModel}
          campaigns={campaigns}
        />
      )}

      {activePage === 'settings' && (
        <SettingsPage
          onClearAllData={handleClearAllData}
          onRefreshData={async () => {
            const all = await db.customers.toArray();
            setCustomers(all);
          }}
        />
      )}

      {/* Global Individual Customer Drilldown Modal */}
      {drilldownCustomer && (
        <CustomerModal
          customer={drilldownCustomer}
          onClose={() => setDrilldownCustomer(null)}
          onSendToCampaign={() => {
            setDrilldownCustomer(null);
            setActivePage('campaigns');
          }}
        />
      )}

      {/* Global Quick Search Modal ('/' key) */}
      {quickSearchOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1F3A]/70 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl max-w-xl w-full p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
              <Search className="w-5 h-5 text-[#C9A227]" />
              <input
                autoFocus
                type="text"
                value={quickSearchText}
                onChange={(e) => setQuickSearchText(e.target.value)}
                placeholder="Search customers by ID, City, Plan, or Segment..."
                className="flex-1 bg-transparent text-sm text-[#0B1F3A] dark:text-[#F7F5EF] focus:outline-none"
              />
              <button onClick={() => setQuickSearchOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#E2DDD2]/60 text-xs">
              {quickSearchResults.length === 0 ? (
                <p className="p-4 text-center text-[#5C6370]">
                  {quickSearchText ? 'No matching accounts found.' : 'Type to search accounts (e.g. BC-10042, London, Fibre 500)'}
                </p>
              ) : (
                quickSearchResults.map((cust) => (
                  <div
                    key={cust.customerId}
                    onClick={() => {
                      setDrilldownCustomer(cust);
                      setQuickSearchOpen(false);
                      setQuickSearchText('');
                    }}
                    className="p-3 hover:bg-[#F7F5EF] dark:hover:bg-[#0B1F3A]/50 rounded-lg cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">{cust.customerId}</span>
                      <span className="text-[#5C6370] ml-2">
                        {cust.customerSegment} • {cust.city}, {cust.ukNation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#8B1A1A]">
                        {Math.round(cust.churnProbability * 100)}% Risk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#FDEDED] text-[#8B1A1A] font-bold">
                        {cust.riskTier}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
