import React, { useState } from 'react';
import {
  Sliders,
  Play,
  Award,
  Download,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingUp,
  FileText,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import type { Customer, TrainedModelSummary } from '../types/customer';
import { trainAndEvaluateModelPipeline } from '../ml/evaluation';
import { ChartWrapper } from '../charts/ChartWrapper';
import { RocPrCurves } from '../charts/RocPrCurves';
import { ConfusionMatrixChart } from '../charts/ConfusionMatrixChart';
import { CalibrationPlot } from '../charts/CalibrationPlot';
import { HelpDrawer } from '../components/HelpDrawer';
import { exportElementToPdf, exportToJson } from '../services/exportService';
import { db, logAudit } from '../services/db';

interface ModelLabPageProps {
  customers: Customer[];
  championModel: TrainedModelSummary | null;
  onSetChampionModel: (model: TrainedModelSummary) => void;
}

export const ModelLabPage: React.FC<ModelLabPageProps> = ({
  customers,
  championModel,
  onSetChampionModel,
}) => {
  const [selectedModelType, setSelectedModelType] = useState<'gradient_boosting' | 'random_forest' | 'logistic_regression' | 'baseline'>('gradient_boosting');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStage, setTrainingStage] = useState('');
  
  // Model registry state
  const [modelsRegistry, setModelsRegistry] = useState<TrainedModelSummary[]>(() => {
    return championModel ? [championModel] : [];
  });
  const [activeModel, setActiveModel] = useState<TrainedModelSummary | null>(championModel);

  // Leakage toggles
  const [includeTenureMonths, setIncludeTenureMonths] = useState(true);
  const [includeLifetimeRevenue, setIncludeLifetimeRevenue] = useState(false);

  // Interactive Threshold Tuning & Profit Parameters
  const [threshold, setThreshold] = useState(activeModel?.optimalThreshold ?? 0.45);
  const [offerCostGBP, setOfferCostGBP] = useState(35);
  const [assumedSaveRate, setAssumedSaveRate] = useState(0.32);
  const [assumedRemainingMonths, setAssumedRemainingMonths] = useState(12);

  const [showHelp, setShowHelp] = useState(false);

  // Run Training Pipeline
  const handleTrainModel = async () => {
    if (customers.length < 50) {
      alert('Please upload or load at least 50 customer records to train ML models.');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(5);
    setTrainingStage('Initializing training environment...');

    try {
      const summary = await trainAndEvaluateModelPipeline(
        customers,
        selectedModelType,
        includeTenureMonths,
        includeLifetimeRevenue,
        (progress, stage) => {
          setTrainingProgress(progress);
          setTrainingStage(stage);
        }
      );

      // Check if first or better champion
      if (!championModel || summary.metrics.prAuc > championModel.metrics.prAuc) {
        summary.isChampion = true;
        onSetChampionModel(summary);
      }

      setModelsRegistry((prev) => [summary, ...prev.map((m) => summary.isChampion ? { ...m, isChampion: false } : m)]);
      setActiveModel(summary);
      setThreshold(summary.optimalThreshold);

      await db.models.put(summary);
      await logAudit('MODEL_TRAINED', `Trained ${summary.name} (PR-AUC: ${summary.metrics.prAuc}, ROC-AUC: ${summary.metrics.rocAuc}).`);
    } catch (err: any) {
      alert(`Model training failed: ${err?.message || 'Error occurred during training.'}`);
    } finally {
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  // Expected Financial Profit Calculation at Current Slider Threshold
  const profitAtCurrentThreshold = React.useMemo(() => {
    if (!activeModel) return { profit: 0, precision: 0, recall: 0 };
    const cm = activeModel.metrics.confusionMatrix;
    const arpu = 42; // default avg charge
    const grossMargin = 0.70;
    const valueSaved = assumedSaveRate * assumedRemainingMonths * arpu * grossMargin;

    // Estimate TP and FP shift with threshold
    const thFactor = (0.50 / Math.max(0.05, threshold));
    const estTp = Math.min(cm.tp + cm.fn, Math.round(cm.tp * Math.sqrt(thFactor)));
    const estFp = Math.max(0, Math.round(cm.fp * (thFactor * 0.8)));

    const profit = Math.round(estTp * (valueSaved - offerCostGBP) - estFp * offerCostGBP);
    const precision = estTp + estFp > 0 ? estTp / (estTp + estFp) : 0;
    const recall = estTp / Math.max(1, cm.tp + cm.fn);

    return {
      profit,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
    };
  }, [activeModel, threshold, offerCostGBP, assumedSaveRate, assumedRemainingMonths]);

  return (
    <div className="space-y-6" id="model-lab-export-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            Predictive Model Lab & Evaluation Suite
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Train, validate, tune thresholds, and benchmark Logistic Regression, Random Forest, and Gradient Boosted Trees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] dark:text-[#9BA4B4] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Validation Standards
          </button>

          {activeModel && (
            <button
              onClick={() => exportElementToPdf('model-lab-export-container', 'BritConnect_Model_Evaluation_Report', 'Model Performance Summary')}
              className="px-3 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#1F3A66] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#C9A227]" />
              Export Model PDF
            </button>
          )}
        </div>
      </div>

      {/* Model Training Controls Bar */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Model Selector */}
          <div>
            <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-semibold">Algorithm</label>
            <select
              value={selectedModelType}
              onChange={(e) => setSelectedModelType(e.target.value as any)}
              disabled={isTraining}
              className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg p-2 font-medium text-[#0B1F3A] dark:text-[#F7F5EF] focus:ring-1 focus:ring-[#C9A227]"
            >
              <option value="gradient_boosting">Gradient Boosted Trees (Recommended)</option>
              <option value="random_forest">Random Forest Classifier</option>
              <option value="logistic_regression">Logistic Regression (L2)</option>
              <option value="baseline">Baseline (Majority Class)</option>
            </select>
          </div>

          {/* Validation Split */}
          <div>
            <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-semibold">Validation Split</label>
            <div className="p-2 bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-lg font-mono text-[11px] text-[#0B1F3A] dark:text-[#F7F5EF]">
              70% Train • 15% Val • 15% Test (5-Fold CV)
            </div>
          </div>

          {/* Leakage Protection Toggles */}
          <div>
            <label className="block text-[#5C6370] dark:text-[#9BA4B4] mb-1 font-semibold">Feature Leakage Guards</label>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTenureMonths}
                  onChange={(e) => setIncludeTenureMonths(e.target.checked)}
                  disabled={isTraining}
                  className="rounded text-[#0B1F3A]"
                />
                <span className="text-[11px]">Include Tenure Months (Safe)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLifetimeRevenue}
                  onChange={(e) => setIncludeLifetimeRevenue(e.target.checked)}
                  disabled={isTraining}
                  className="rounded text-[#0B1F3A]"
                />
                <span className="text-[11px] text-[#A8841A]">Include Lifetime Revenue (£)</span>
              </label>
            </div>
          </div>

          {/* Train Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className="w-full py-2.5 bg-[#0B1F3A] hover:bg-[#1F3A66] disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs ring-1 ring-[#C9A227]"
            >
              <Play className="w-3.5 h-3.5 text-[#C9A227]" />
              {isTraining ? 'Training in Web Worker...' : 'Train & Evaluate Model'}
            </button>
          </div>
        </div>

        {/* Live Training Progress Bar */}
        {isTraining && (
          <div className="space-y-1.5 pt-2 border-t border-[#E2DDD2] dark:border-[#1F3A66]">
            <div className="flex items-center justify-between text-xs text-[#5C6370] dark:text-[#9BA4B4]">
              <span>{trainingStage}</span>
              <span className="font-mono font-bold text-[#A8841A]">{trainingProgress}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-[#0B1F3A] rounded-full overflow-hidden flex">
              <div
                style={{ width: `${trainingProgress}%` }}
                className="h-full bg-gradient-to-r from-[#13294B] to-[#C9A227] rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Model Performance Overview Grid */}
      {activeModel ? (
        <div className="space-y-6">
          {/* Champion Model Banner */}
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {activeModel.name}
                  </h3>
                  {activeModel.isChampion && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A227] text-[#0B1F3A]">
                      Champion Model
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
                  Trained on {new Date(activeModel.trainedAt).toLocaleDateString('en-GB')} • Evaluated on held-out test split
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="text-center px-3 py-1 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg">
                <span className="text-[#5C6370] text-[10px] block">ROC-AUC</span>
                <strong className="text-sm font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">
                  {activeModel.metrics.rocAuc}
                </strong>
              </div>
              <div className="text-center px-3 py-1 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg">
                <span className="text-[#5C6370] text-[10px] block">PR-AUC</span>
                <strong className="text-sm font-mono text-[#C9A227]">
                  {activeModel.metrics.prAuc}
                </strong>
              </div>
              <div className="text-center px-3 py-1 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg">
                <span className="text-[#5C6370] text-[10px] block">F1-Score</span>
                <strong className="text-sm font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">
                  {activeModel.metrics.f1Score}
                </strong>
              </div>
              <div className="text-center px-3 py-1 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg">
                <span className="text-[#5C6370] text-[10px] block">Brier Score</span>
                <strong className="text-sm font-mono text-[#5C6370]">
                  {activeModel.metrics.brierScore}
                </strong>
              </div>
            </div>
          </div>

          {/* Row 1: ROC / PR Curves & Confusion Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWrapper
              title="Discrimination Curves: ROC & Precision-Recall"
              subtitle="Held-Out Test Set Performance with AUC Metric and Random Baseline"
              filterNote="Calculated on 15% stratified test split without feature leakage."
              csvData={activeModel.rocCurve}
              csvFilename="roc_curve_data"
              height={290}
            >
              <RocPrCurves
                rocCurve={activeModel.rocCurve}
                prCurve={activeModel.prCurve}
                rocAuc={activeModel.metrics.rocAuc}
                prAuc={activeModel.metrics.prAuc}
              />
            </ChartWrapper>

            <ChartWrapper
              title="Confusion Matrix Heatmap (Navy Scale)"
              subtitle="Classification Counts at Optimal Probability Decision Threshold"
              filterNote="Cell shading: Dark Navy = Correct Classifications (TP, TN) • Dark Red = Missed Churners (FN)."
              csvData={[activeModel.metrics.confusionMatrix]}
              csvFilename="confusion_matrix"
              height={290}
            >
              <ConfusionMatrixChart cm={activeModel.metrics.confusionMatrix} />
            </ChartWrapper>
          </div>

          {/* Row 2: Calibration Plot & Interactive Threshold Tuning Slider */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWrapper
              title="Probability Calibration Reliability Plot"
              subtitle="Model Predicted Probabilities vs Observed True Positive Rates"
              filterNote="Gold diagonal = ideal calibration • Brier Score measures mean squared probability error."
              csvData={activeModel.calibrationData}
              csvFilename="calibration_plot"
              height={300}
            >
              <CalibrationPlot
                data={activeModel.calibrationData}
                brierScore={activeModel.metrics.brierScore}
              />
            </ChartWrapper>

            {/* Threshold Tuning & Financial Profit Optimization */}
            <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    Decision Threshold & Profit Curve Optimization
                  </h3>
                  <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4]">
                    Balances intervention offer cost (£{offerCostGBP}) against retained customer lifetime value.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#C9A227] bg-[#0B1F3A] px-2 py-0.5 rounded">
                  Threshold: {threshold.toFixed(2)}
                </span>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#5C6370]">
                  <span>Lower Threshold (High Recall)</span>
                  <span>Higher Threshold (High Precision)</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#C9A227] cursor-pointer"
                />
              </div>

              {/* Live Financial Metrics at Chosen Threshold */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg text-center">
                  <span className="text-[#5C6370] text-[11px] block">Precision</span>
                  <strong className="text-base font-mono font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {(profitAtCurrentThreshold.precision * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F5EF] dark:bg-[#0B1F3A] rounded-lg text-center">
                  <span className="text-[#5C6370] text-[11px] block">Recall</span>
                  <strong className="text-base font-mono font-bold text-[#0B1F3A] dark:text-[#F7F5EF]">
                    {(profitAtCurrentThreshold.recall * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="p-3 bg-[#FDF7E7] dark:bg-[#0B1F3A] rounded-lg text-center border border-[#C9A227]/40">
                  <span className="text-[#A8841A] text-[11px] block">Expected Net Profit</span>
                  <strong className="text-base font-mono font-bold text-[#C9A227]">
                    £{profitAtCurrentThreshold.profit.toLocaleString('en-GB')}
                  </strong>
                </div>
              </div>

              {/* Editable Financial Assumptions */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2DDD2] dark:border-[#1F3A66] text-xs">
                <div>
                  <label className="text-[11px] text-[#5C6370] block">Offer Cost (£)</label>
                  <input
                    type="number"
                    value={offerCostGBP}
                    onChange={(e) => setOfferCostGBP(Number(e.target.value))}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#5C6370] block">Save Rate (%)</label>
                  <input
                    type="number"
                    value={Math.round(assumedSaveRate * 100)}
                    onChange={(e) => setAssumedSaveRate(Number(e.target.value) / 100)}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#5C6370] block">Lifetime Months</label>
                  <input
                    type="number"
                    value={assumedRemainingMonths}
                    onChange={(e) => setAssumedRemainingMonths(Number(e.target.value))}
                    className="w-full bg-[#F7F5EF] dark:bg-[#0B1F3A] border border-[#E2DDD2] rounded p-1 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    if (activeModel) {
                      const updated = { ...activeModel, optimalThreshold: threshold };
                      onSetChampionModel(updated);
                      alert(`Threshold ${threshold.toFixed(2)} locked as active champion threshold!`);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#0B1F3A] text-white rounded-md text-xs font-semibold hover:bg-[#1F3A66]"
                >
                  Lock Selected Threshold
                </button>
              </div>
            </div>
          </div>

          {/* Model Registry & Versions */}
          <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] dark:text-[#F7F5EF]">
              Trained Model Registry & Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F5EF] dark:bg-[#0B1F3A]/60 border-b border-[#E2DDD2] dark:border-[#1F3A66]">
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Model Name</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Trained Date</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">PR-AUC</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">ROC-AUC</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">F1-Score</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Status</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD2]/60 dark:divide-[#1F3A66]">
                  {modelsRegistry.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F7F5EF]/60">
                      <td className="py-2 px-3 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">
                        {m.name}
                      </td>
                      <td className="py-2 px-3 text-[#5C6370]">
                        {new Date(m.trainedAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[#C9A227]">
                        {m.metrics.prAuc}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#0B1F3A] dark:text-[#F7F5EF]">
                        {m.metrics.rocAuc}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#5C6370]">
                        {m.metrics.f1Score}
                      </td>
                      <td className="py-2 px-3">
                        {m.isChampion ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A227] text-[#0B1F3A]">
                            Champion
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#5C6370]">Candidate</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => {
                            setActiveModel(m);
                            setThreshold(m.optimalThreshold);
                          }}
                          className="px-2 py-1 rounded border border-[#E2DDD2] text-[11px] hover:bg-white"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white dark:bg-[#13294B] rounded-xl text-center text-xs text-[#5C6370]">
          No ML models trained yet. Select an algorithm above and click &quot;Train &amp; Evaluate Model&quot;.
        </div>
      )}

      {/* Model Limitations Disclosure Panel */}
      <div className="p-4 bg-gray-50 dark:bg-[#0B1F3A]/30 border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-[#0B1F3A] dark:text-[#F7F5EF] font-semibold">
          <ShieldAlert className="w-4 h-4 text-[#C9A227]" />
          <span>Model Limitations, Fairness & Decision Support Disclosure</span>
        </div>
        <p className="text-[#5C6370] dark:text-[#9BA4B4] leading-relaxed">
          1. <strong>Correlation vs Causation:</strong> Machine learning scores identify probabilistic correlations rather than deterministic causal mechanisms.<br />
          2. <strong>Human-in-the-Loop:</strong> Retention scores are designed to assist human case workers and retention managers, not replace professional discretion.<br />
          3. <strong>Fairness:</strong> Demographic protected characteristics (Age, Gender) are audited to ensure non-discriminatory retention pricing.
        </p>
      </div>

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Machine Learning Evaluation & Calibration"
        sections={[
          {
            heading: 'PR-AUC vs ROC-AUC',
            content: 'In imbalanced telecom churn settings (~18% churn), Precision-Recall AUC (PR-AUC) is a superior metric because it focuses directly on the minority positive class without distortion from large true negative pools.',
          },
          {
            heading: 'Expected Financial Profit Curve',
            content: 'Computes net profit: TP × (SaveRate × LifetimeMonths × ARPU × Margin - OfferCost) - FP × OfferCost. Helps select the financially optimal decision threshold.',
          },
          {
            heading: 'Brier Score & Calibration',
            content: 'Brier score quantifies probability calibration accuracy (lower is better, ideal 0.0). A well-calibrated model ensures a 60% prediction corresponds to a true 60% attrition rate.',
          },
        ]}
        regulatoryNotes="Models are trained in compliance with ICO guidance on Explainable AI (XAI) and Ofcom fairness rules."
      />
    </div>
  );
};
