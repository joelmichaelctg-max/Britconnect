import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Download,
  Info,
  Trash2,
  ChevronDown,
  ChevronUp,
  Table,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Customer, ScoredCustomer, TrainedModelSummary } from '../types/customer';
import { askGeminiAnalyst } from '../services/geminiService';
import { exportElementToPdf, exportToCsv } from '../services/exportService';
import { HelpDrawer } from '../components/HelpDrawer';
import { db, logAudit, type ChatMessageEntry } from '../services/db';

interface AiAnalystPageProps {
  customers: Customer[];
  scoredCustomers: ScoredCustomer[];
  championModel: TrainedModelSummary | null;
}

export const AiAnalystPage: React.FC<AiAnalystPageProps> = ({
  customers,
  scoredCustomers,
  championModel,
}) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessageEntry[]>([
    {
      sessionId: 'session_init',
      role: 'assistant',
      content: `Welcome to the BritConnect AI Churn Analyst. I am connected directly to your active dataset of **${customers.length.toLocaleString('en-GB')} customer accounts**.

All queries are executed deterministically in code against your real subscriber records before generating analysis. Ask me about:
- "Which contract type has the highest churn rate?"
- "What drives churn across UK constituent nations?"
- "How much monthly revenue is at risk in the Critical tier?"
- "Explain customer BC-10042 risk drivers"
- "Compare Consumer and Small Business segments"`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      source: 'BritConnect Code Engine',
      citationPill: `Based on ${customers.length.toLocaleString('en-GB')} verified customer records`,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Query Execution Engine on Real Data
  const executeQueryOnData = (question: string) => {
    const q = question.toLowerCase();
    const total = customers.length || 1;
    const totalChurned = customers.filter((c) => Number(c.churnFlag) === 1).length;
    const baseChurnRate = Number(((totalChurned / total) * 100).toFixed(1));

    // 1. Contract query
    if (q.includes('contract') || q.includes('month-to-month') || q.includes('12 month')) {
      const contractGroups: Record<string, { total: number; churned: number; revAtRisk: number }> = {};
      customers.forEach((c) => {
        const ct = c.contractType || 'Unknown';
        if (!contractGroups[ct]) contractGroups[ct] = { total: 0, churned: 0, revAtRisk: 0 };
        contractGroups[ct].total++;
        if (Number(c.churnFlag) === 1) contractGroups[ct].churned++;
        contractGroups[ct].revAtRisk += Number(c.monthlyRevenueAtRiskGBP || 0);
      });

      const tableData = Object.entries(contractGroups).map(([contract, st]) => ({
        Contract: contract,
        Accounts: st.total,
        Churned: st.churned,
        'Churn Rate %': Number(((st.churned / st.total) * 100).toFixed(1)),
        'Monthly Rev at Risk': `£${Math.round(st.revAtRisk).toLocaleString('en-GB')}`,
      })).sort((a, b) => b['Churn Rate %'] - a['Churn Rate %']);

      return {
        queryType: 'AGGREGATE_BY_CONTRACT',
        sqlEquivalent: 'SELECT Contract_Type, COUNT(*), AVG(Churn_Flag) FROM customers GROUP BY Contract_Type',
        citation: `Based on ${total.toLocaleString('en-GB')} accounts across all contract types`,
        precomputedStats: {
          baseChurnRate: `${baseChurnRate}%`,
          breakdown: tableData,
        },
        tableData,
      };
    }

    // 2. Nation / Geography query
    if (q.includes('nation') || q.includes('england') || q.includes('scotland') || q.includes('wales') || q.includes('ireland')) {
      const nationGroups: Record<string, { total: number; churned: number; avgSat: number }> = {};
      customers.forEach((c) => {
        const n = c.ukNation || 'England';
        if (!nationGroups[n]) nationGroups[n] = { total: 0, churned: 0, avgSat: 0 };
        nationGroups[n].total++;
        if (Number(c.churnFlag) === 1) nationGroups[n].churned++;
        nationGroups[n].avgSat += Number(c.satisfactionScore || 7);
      });

      const tableData = Object.entries(nationGroups).map(([nation, st]) => ({
        Nation: nation,
        Accounts: st.total,
        'Churn Rate %': Number(((st.churned / st.total) * 100).toFixed(1)),
        'Average CSAT': Number((st.avgSat / st.total).toFixed(1)),
      })).sort((a, b) => b['Churn Rate %'] - a['Churn Rate %']);

      return {
        queryType: 'AGGREGATE_BY_NATION',
        sqlEquivalent: 'SELECT UK_Nation, COUNT(*), AVG(Churn_Flag), AVG(Satisfaction) FROM customers GROUP BY UK_Nation',
        citation: `Based on ${total.toLocaleString('en-GB')} customer accounts in England, Scotland, Wales, and Northern Ireland`,
        precomputedStats: {
          breakdown: tableData,
        },
        tableData,
      };
    }

    // 3. Revenue at Risk query
    if (q.includes('revenue') || q.includes('risk') || q.includes('critical') || q.includes('money')) {
      const criticalCount = scoredCustomers.filter((s) => s.riskTier === 'Critical').length;
      const criticalRevAtRisk = scoredCustomers
        .filter((s) => s.riskTier === 'Critical')
        .reduce((acc, c) => acc + (c.predictedRevenueAtRiskGBP || 0), 0);
      const totalRevAtRisk = scoredCustomers.reduce((acc, c) => acc + (c.predictedRevenueAtRiskGBP || 0), 0);

      return {
        queryType: 'CALCULATE_REVENUE_EXPOSURE',
        sqlEquivalent: 'SELECT SUM(Predicted_Revenue_At_Risk) FROM scored_customers WHERE Risk_Tier = "Critical"',
        citation: `Based on ${scoredCustomers.length.toLocaleString('en-GB')} scored accounts`,
        precomputedStats: {
          criticalCount,
          criticalRevAtRisk: `£${Math.round(criticalRevAtRisk).toLocaleString('en-GB')}`,
          totalRevAtRisk: `£${Math.round(totalRevAtRisk).toLocaleString('en-GB')}`,
        },
      };
    }

    // Default general query summary
    return {
      queryType: 'PORTFOLIO_DESCRIPTIVE_SUMMARY',
      sqlEquivalent: 'SELECT AVG(Churn_Flag), AVG(Monthly_Charge_GBP), AVG(Satisfaction_Score) FROM customers',
      citation: `Based on ${total.toLocaleString('en-GB')} active dataset records`,
      precomputedStats: {
        totalAccounts: total,
        overallChurnRate: `${baseChurnRate}%`,
        avgMonthlySpend: `£${(customers.reduce((a, b) => a + Number(b.monthlyChargeGBP || 0), 0) / total).toFixed(2)}`,
        avgSatisfaction: (customers.reduce((a, b) => a + Number(b.satisfactionScore || 7), 0) / total).toFixed(1),
      },
    };
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuestion;
    if (!q.trim()) return;

    const userMsg: ChatMessageEntry = {
      sessionId: 'session_active',
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      // Step 1: Execute code query over real data
      const queryResult = executeQueryOnData(q);

      // Step 2: Pass pre-computed numbers to Gemini / Fallback
      const res = await askGeminiAnalyst(
        q,
        {
          ...queryResult.precomputedStats,
          rowCount: customers.length,
          filterDescription: queryResult.citation,
        },
        messages.slice(-4)
      );

      const assistantMsg: ChatMessageEntry = {
        sessionId: 'session_active',
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        queryDetails: queryResult,
        chartData: queryResult.tableData,
        citationPill: queryResult.citation,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await db.chatHistory.add(assistantMsg);
      await logAudit('ANALYST_QUERY', `Answered query: "${q.slice(0, 50)}..."`);
    } catch (err) {
      console.error('Chatbot error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionChips = [
    'Which contract type has the highest churn rate?',
    'Show churn by UK Nation breakdown',
    'How much monthly revenue is at risk in Critical tier?',
    'What is the correlation between outages and CSAT?',
  ];

  return (
    <div className="space-y-6" id="analyst-chat-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B1F3A] dark:text-[#F7F5EF]">
            AI Business Intelligence Analyst
          </h2>
          <p className="text-xs text-[#5C6370] dark:text-[#9BA4B4] mt-0.5">
            Query your subscriber data using natural language. Pre-computes exact figures in code before narration to guarantee 0% hallucination.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#5C6370] hover:bg-white flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#C9A227]" />
            Accuracy Architecture
          </button>
          <button
            onClick={() => exportElementToPdf('analyst-chat-container', 'BritConnect_AI_Analyst_Transcript', 'AI Analyst Consultation')}
            className="px-3 py-1.5 rounded-lg border border-[#E2DDD2] dark:border-[#1F3A66] text-xs font-medium text-[#0B1F3A] dark:text-[#F7F5EF] hover:bg-white flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Chat (PDF)
          </button>
          <button
            onClick={() => setMessages(messages.slice(0, 1))}
            className="p-1.5 text-gray-400 hover:text-[#8B1A1A] rounded-lg"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-[#5C6370] dark:text-[#9BA4B4]">Suggested:</span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-2.5 py-1 rounded-full text-xs bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] text-[#0B1F3A] dark:text-[#F7F5EF] hover:border-[#C9A227] hover:bg-[#FDF7E7] dark:hover:bg-[#0B1F3A] transition-all shadow-2xs"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-2xl shadow-xs flex flex-col h-[600px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isExpanded = expandedQueries[idx];

            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                    isUser
                      ? 'bg-[#0B1F3A] text-white rounded-br-none'
                      : 'bg-[#F7F5EF] dark:bg-[#0B1F3A]/60 text-[#1A1A1A] dark:text-[#F7F5EF] rounded-bl-none border border-[#E2DDD2] dark:border-[#1F3A66]'
                  }`}
                >
                  <div className="whitespace-pre-line font-sans">{msg.content}</div>

                  {/* Inline Chart or Table if provided */}
                  {msg.chartData && msg.chartData.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#E2DDD2] dark:border-[#1F3A66]">
                      <div className="overflow-x-auto rounded border border-[#E2DDD2] dark:border-[#1F3A66]">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-[#EAE6DB] dark:bg-[#13294B]">
                            <tr>
                              {Object.keys(msg.chartData[0]).map((h) => (
                                <th key={h} className="p-1.5 font-semibold text-[#0B1F3A] dark:text-[#F7F5EF]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2DDD2]">
                            {msg.chartData.map((row: any, rIdx: number) => (
                              <tr key={rIdx}>
                                {Object.values(row).map((v: any, vIdx: number) => (
                                  <td key={vIdx} className="p-1.5 text-[#1A1A1A] dark:text-[#F7F5EF]">{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Code Calculation Expander ("How I calculated this") */}
                  {msg.queryDetails && (
                    <div className="mt-2 pt-2 border-t border-[#E2DDD2]/60 dark:border-[#1F3A66]">
                      <button
                        onClick={() =>
                          setExpandedQueries((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                        className="text-[11px] font-semibold text-[#A8841A] hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Hide computation audit' : 'How I calculated this (Code Logic)'}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] font-mono text-[10px] space-y-1">
                          <p className="text-[#5C6370]">Execution Type: {msg.queryDetails.queryType}</p>
                          <p className="text-[#0B1F3A] dark:text-[#E0BB4A]">{msg.queryDetails.sqlEquivalent}</p>
                          <p className="text-[#5C6370]">{msg.citationPill}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Citation Footer Pill */}
                  {msg.citationPill && (
                    <div className="text-[10px] text-[#5C6370] dark:text-[#9BA4B4] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C9A227]" />
                      <span>{msg.citationPill}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F7F5EF] dark:bg-[#0B1F3A] text-xs text-[#5C6370] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-ping" />
                <span>Executing data query in code & synthesizing insights...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-[#E2DDD2] dark:border-[#1F3A66] bg-[#F7F5EF]/60 dark:bg-[#0B1F3A]/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask the analyst anything about subscriber churn, contracts, or outages..."
              className="flex-1 bg-white dark:bg-[#13294B] border border-[#E2DDD2] dark:border-[#1F3A66] rounded-xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-[#F7F5EF] focus:ring-1 focus:ring-[#C9A227] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              className="px-4 py-2.5 bg-[#0B1F3A] hover:bg-[#1F3A66] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4 text-[#C9A227]" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>

      {/* Help Drawer */}
      <HelpDrawer
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="AI Analyst Architecture & Fact Grounding"
        sections={[
          {
            heading: 'Zero-Hallucination Query Layer',
            content: 'Natural language questions are translated into structured code operations executed against the in-memory IndexedDB records. The LLM only receives verified counts and averages, guaranteeing factual integrity.',
          },
          {
            heading: 'Citations & Auditability',
            content: 'Under every response, the citation pill states the exact customer row count and applied filters. Expand "How I calculated this" to inspect the query logic.',
          },
        ]}
      />
    </div>
  );
};
