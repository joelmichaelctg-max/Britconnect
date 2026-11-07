# BritConnect AI Customer Churn Intelligence Platform

A responsive web application for UK telecommunications providers to ingest subscriber data, predict churn risk, explain customer friction, and execute personalised, compliant retention strategies.

---

## 1. Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4.
- **Charts:** Bespoke enterprise chart engine built to BritConnect visual guidelines (zero gridlines, subtle baseline axes, direct data labeling, gold benchmarks, interactive tooltips, PNG and CSV exports).
- **Data Ingestion:** Multi-format parser supporting `.csv`, `.xlsx`, `.xls`, `.json`, `.tsv`, `.txt`, and `.xml`.
- **In-Browser Machine Learning:**
  - **Logistic Regression (L2 Regularization)** with gradient descent and feature scaling.
  - **Random Forest Ensemble** with bootstrap sampling and feature sub-sampling.
  - **Gradient Boosted Decision Trees** optimizing log-loss pseudo-residuals with learning rate shrinkage.
  - **Majority Class Baseline** for benchmark comparison.
- **Explainability:** Model-agnostic permutation feature importance, Partial Dependence Plots (PDP) with empirical observed churn overlays, and local SHAP-style waterfall contributions per customer.
- **Segmentation:** Rule-based commercial cohorts and unsupervised K-Means behavioral clustering (K=2–8 with elbow SSE and silhouette optimization).
- **Persistence:** IndexedDB via Dexie for datasets, versions, models, scores, campaigns, and audit trails.
- **AI Analyst & Retention Engine:** Server-side Gemini API (`gemini-3.8-flash` via `@google/genai`) with deterministic local rule-based fallback engines ensuring 100% offline availability and zero numerical hallucination.
- **Reporting:** Branded PDF export (jsPDF + html2canvas) with navy headers and gold rules, multi-sheet Excel workbooks, and CSV downloads.

---

## 2. Environment Variables

Create or configure `.env` (derived from `.env.example`):

```bash
# GEMINI_API_KEY: Optional for Gemini 3.8 Flash narration and recommendations.
# Automatically read server-side by server.ts. Never exposed to browser bundle.
GEMINI_API_KEY="your-gemini-api-key"

# Port (configured to 3000 for AI Studio dev runtime)
PORT=3000
```

---

## 3. Data Dictionary Schema (38 Columns)

1. `Customer ID`: Unique key (e.g. `BC-10042`)
2. `Customer Segment`: Consumer, Small Business, Enterprise
3. `Age`: Customer age in years (16–110)
4. `Age Band`: 18-24, 25-34, 35-49, 50-64, 65+
5. `Gender`: Recorded customer gender
6. `UK Nation`: England, Scotland, Wales, Northern Ireland
7. `City`: Customer town or city
8. `Acquisition Channel`: Online, Retail Store, Telesales, etc.
9. `Join Date`: First joined BritConnect (dd/mm/yyyy or ISO)
10. `Tenure Months`: Length of relationship in months
11. `Service Type`: Fibre Broadband, Standard Broadband, Mobile 5G, Landline, Bundled
12. `Plan Name`: Subscription tariff name
13. `Contract Type`: Month-to-Month, 12 Months, 18 Months, 24 Months
14. `Contract Start Date`: Current contract start date
15. `Contract End Date`: Scheduled contract expiry date
16. `Auto Renew`: Yes / No
17. `Monthly Charge GBP`: Monthly subscription charge (£)
18. `Average Monthly Usage GB`: Average monthly data consumed (GB)
19. `Data Allowance GB`: Included monthly data allowance (GB)
20. `Overage Charges GBP`: Additional usage charges (£)
21. `Discount Percent`: Promotional discount (0–100%)
22. `Payment Method`: Direct Debit, Credit Card, Bank Transfer, Cheque
23. `Direct Debit`: Yes / No
24. `Late Payments 12M`: Late payment incidents in past 12M
25. `Failed Payments 12M`: Failed payment attempts in past 12M
26. `Support Tickets 12M`: Support tickets opened in past 12M
27. `Complaints 12M`: Formal escalated complaints in past 12M
28. `Average Resolution Hours`: Support resolution time (hours)
29. `Network Outages 12M`: Outages experienced in past 12M
30. `Satisfaction Score 1 10`: CSAT score (1–10)
31. `NPS Score`: Net Promoter Score advocacy metric
32. `Competitor Offer Received`: Yes / No
33. `Churn Status`: Active / Churned (*Prohibited feature: Leakage*)
34. `Churn Date`: Cancellation date (*Prohibited feature: Leakage*)
35. `Churn Reason`: Reason for cancellation (*Descriptive analysis only: Leakage*)
36. `Lifetime Revenue GBP`: Cumulative revenue (£) (*Leakage toggle: Excluded by default*)
37. `Monthly Revenue At Risk GBP`: Target-derived metric (*Prohibited feature: Leakage*)
38. `Churn Flag`: Binary outcome: 1 = Churned, 0 = Active (**Target variable**)

---

## 4. Strict Target Leakage Protection

The platform implements an uncompromising target leakage firewall:
- **Prohibited inputs:** `Churn Status`, `Churn Date`, `Churn Reason`, `Churn Flag`, `Monthly Revenue At Risk GBP`, and `Customer ID` are permanently excluded from feature matrices.
- **Tenure Months & Lifetime Revenue:** Churned subscribers cease accumulating tenure and revenue. The platform defaults to keeping `Tenure Months` while strictly excluding `Lifetime Revenue GBP` from model training, providing a configurable toggle in Settings.
- **Cross-Validation Integrity:** One-hot encoders, frequency smoothers, and standard scalers are fitted exclusively on training splits/folds—never on test partitions.

---

## 5. Machine Learning Evaluation Standards

- **Metrics:** ROC-AUC, PR-AUC, Accuracy, Precision, Recall, F1-Score, Balanced Accuracy, Brier Score, and Log Loss.
- **Threshold Optimization:** Interactive slider maximizes expected profit:
  $$\text{Profit} = \text{TP} \times (\text{SaveRate} \times \text{RemainingMonths} \times \text{ARPU} \times \text{Margin} - \text{OfferCost}) - \text{FP} \times \text{OfferCost}$$
- **Champion Model Selection:** Automatically locks the candidate model with superior PR-AUC.

---

## 6. UK Regulatory Compliance & Governance

- **Ofcom General Conditions:** Compliant with rules regarding fair treatment of vulnerable subscribers and End-of-Contract Notifications (ECN).
- **UK GDPR & PECR:** All electronic marketing and retention contact respect consent principles.
- **Non-Discrimination:** Protected demographic characteristics (`Age`, `Gender`) are strictly forbidden as inputs for differential customer retention pricing.

---

## 7. Known Limitations & Disclosures

- **Correlation vs Causation:** Machine learning predictions represent statistical associations rather than deterministic causal proof.
- **Human Discretion:** Recommendations serve as decision support tools for retention specialists, not autonomous contract managers.
- **Data Quality:** Prediction reliability is fundamentally bounded by the accuracy and freshness of ingested operational telemetry.
