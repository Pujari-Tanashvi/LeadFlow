import React from "react";
import { Brokerage, Lead, LeadTask } from "../types";
import {
  TrendingUp,
  Users,
  Euro,
  CheckCircle2,
  Clock,
  Zap,
  Building2,
  PieChart,
  BarChart,
  ShieldCheck,
} from "lucide-react";

interface DashboardAnalyticsProps {
  activeBrokerage: Brokerage;
  leads: Lead[];
  tasks: LeadTask[];
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  activeBrokerage,
  leads,
  tasks,
}) => {
  const tenantLeads = leads.filter((l) => l.brokerageId === activeBrokerage.id);
  const tenantTasks = tasks.filter((t) => t.brokerageId === activeBrokerage.id);

  const totalVolume = tenantLeads.reduce((acc, l) => acc + l.loanAmountEur, 0);
  const wonLeads = tenantLeads.filter((l) => l.stage === "won");
  const wonVolume = wonLeads.reduce((acc, l) => acc + l.loanAmountEur, 0);
  const conversionRate =
    tenantLeads.length > 0
      ? Math.round((wonLeads.length / tenantLeads.length) * 100)
      : 0;

  const overdueTasks = tenantTasks.filter((t) => t.isOverdue && !t.isCompleted);
  const completedTasks = tenantTasks.filter((t) => t.isCompleted);

  const stageCounts = {
    new: tenantLeads.filter((l) => l.stage === "new").length,
    contacted: tenantLeads.filter((l) => l.stage === "contacted").length,
    qualified: tenantLeads.filter((l) => l.stage === "qualified").length,
    doc_gathering: tenantLeads.filter((l) => l.stage === "doc_gathering")
      .length,
    bank_underwriting: tenantLeads.filter(
      (l) => l.stage === "bank_underwriting",
    ).length,
    offer_received: tenantLeads.filter((l) => l.stage === "offer_received")
      .length,
    won: wonLeads.length,
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900">
              Pipeline Numbers & SLA Velocity · {activeBrokerage.name}
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Real-time multi-tenant mortgage portfolio performance. Computed
            in-memory with zero stale caching.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200">
          <span>License: {activeBrokerage.licenseNumber}</span>
          <span>·</span>
          <span>Latency: &lt;1ms</span>
        </div>
      </div>

      {/* Top 4 Fast KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Active Loan Pipeline</span>
            <Euro className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            €{(totalVolume / 1000000).toFixed(2)}M
          </div>
          <p className="text-[11px] text-slate-500">
            {tenantLeads.length} open expat applications
          </p>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Won & Notarized Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
            €{(wonVolume / 1000).toFixed(0)}k
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">
            {conversionRate}% pipeline conversion rate
          </p>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Advisor Team Velocity</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {activeBrokerage.activeAdvisors} Brokers
          </div>
          <p className="text-[11px] text-slate-500">
            Avg.{" "}
            {(
              tenantLeads.length / Math.max(1, activeBrokerage.activeAdvisors)
            ).toFixed(1)}{" "}
            active cases per advisor
          </p>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Overdue SLA Triggers</span>
            <Clock
              className={`w-4 h-4 ${overdueTasks.length > 0 ? "text-rose-600" : "text-emerald-600"}`}
            />
          </div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums ${overdueTasks.length > 0 ? "text-rose-600" : "text-slate-900"}`}
          >
            {overdueTasks.length} Overdue
          </div>
          <p className="text-[11px] text-slate-500">
            {completedTasks.length} tasks completed today
          </p>
        </div>
      </div>

      {/* Pipeline Funnel Stage Distribution */}
      <div className="glass-panel p-6 rounded-2xl border border-white/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Expat Mortgage Pipeline Stage Distribution
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "New Inbound", count: stageCounts.new, bg: "bg-blue-500" },
            {
              label: "Contacted",
              count: stageCounts.contacted,
              bg: "bg-indigo-500",
            },
            {
              label: "Qualified",
              count: stageCounts.qualified,
              bg: "bg-sky-500",
            },
            {
              label: "Doc Gathering",
              count: stageCounts.doc_gathering,
              bg: "bg-amber-500",
            },
            {
              label: "Bank Underwriting",
              count: stageCounts.bank_underwriting,
              bg: "bg-purple-500",
            },
            {
              label: "Offer Received",
              count: stageCounts.offer_received,
              bg: "bg-teal-500",
            },
            {
              label: "Won / Signed",
              count: stageCounts.won,
              bg: "bg-emerald-500",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-center"
            >
              <span className="text-[11px] text-slate-500 font-medium block truncate">
                {item.label}
              </span>
              <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                {item.count}
              </span>
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div
                  className={`h-full ${item.bg}`}
                  style={{
                    width: `${tenantLeads.length > 0 ? (item.count / tenantLeads.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expat Relocation Demographic Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visa & Permit Types */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Residency & Employment Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Lenders apply different deposit requirements based on residency and
            income type.
          </p>

          <div className="space-y-3">
            {[
              {
                label: "EU Blue Card Holders",
                share: "38%",
                count: "11 cases",
                minEquity: "10–15%",
              },
              {
                label: "Permanent Employment",
                share: "34%",
                count: "10 cases",
                minEquity: "5–10%",
              },
              {
                label: "Permanent Residence",
                share: "18%",
                count: "5 cases",
                minEquity: "10%",
              },
              {
                label: "Self-Employed",
                share: "10%",
                count: "2 cases",
                minEquity: "20–30%",
              },
            ].map((dem, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    {dem.label}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {dem.count} · Required equity: {dem.minEquity}
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {dem.share}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Partner Readiness */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Lending Partner Integration Status
          </h3>
          <p className="text-xs text-slate-500">
            Underwriting connections with the brokerage's lending partners.
          </p>

          <div className="space-y-3">
            {[
              {
                name: "ING Deutschland",
                status: "Connected",
                rate: "3.38% p.a.",
                fastTrack: "Yes (Digital)",
              },
              {
                name: "Commerzbank AG",
                status: "Connected",
                rate: "3.42% p.a.",
                fastTrack: "Yes (Expats welcome)",
              },
              {
                name: "Berliner Sparkasse",
                status: "Connected",
                rate: "3.49% p.a.",
                fastTrack: "Regional specialist",
              },
              {
                name: "DSL Bank (Deutsche Bank Gruppe)",
                status: "Connected",
                rate: "3.35% p.a.",
                fastTrack: "Large dossiers",
              },
            ].map((bank, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    {bank.name}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Avg. 10yr fix: {bank.rate} · {bank.fastTrack}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {bank.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
