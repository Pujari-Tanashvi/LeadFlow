import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, PipelineStage, Brokerage } from "../types";
import { soundManager } from "../utils/audio";
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
  Euro,
  Building,
  Clock,
  Mail,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface PipelineBoardProps {
  leads: Lead[];
  activeBrokerage: Brokerage;
  onMoveLead: (leadId: string, newStage: PipelineStage) => void;
  onConvertToClient: (leadId: string) => void;
  onOpenLeadDetails: (lead: Lead) => void;
  lastSimulatedEvent?: string | null;
}

const STAGES: {
  id: PipelineStage;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    id: "new",
    label: "New Inbound",
    description: "Incoming web forms & ads",
    color: "border-blue-400",
  },
  {
    id: "contacted",
    label: "Contacted",
    description: "Initial qualification & call",
    color: "border-indigo-400",
  },
  {
    id: "qualified",
    label: "Qualified",
    description: "Budget & property confirmed",
    color: "border-sky-400",
  },
  {
    id: "doc_gathering",
    label: "Doc Gathering",
    description: "Client uploading 15-40 docs",
    color: "border-amber-400",
  },
  {
    id: "bank_underwriting",
    label: "Bank Underwriting",
    description: "Sparkasse / ING submission",
    color: "border-purple-400",
  },
  {
    id: "won",
    label: "Won / Signed",
    description: "Notarized & funded",
    color: "border-emerald-400",
  },
];

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  leads,
  activeBrokerage,
  onMoveLead,
  onConvertToClient,
  onOpenLeadDetails,
  lastSimulatedEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNationality, setSelectedNationality] = useState("all");
  const [stageNotification, setStageNotification] = useState<{
    leadName: string;
    stage: string;
    emailSent: string;
    taskCreated: string;
  } | null>(null);

  // Filter leads by tenant (Requirement 1: Multi-tenant data isolation)
  const tenantLeads = leads.filter((l) => l.brokerageId === activeBrokerage.id);

  // Filter by search & nationality
  const filteredLeads = tenantLeads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetCity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNat =
      selectedNationality === "all" ||
      l.nationality.includes(selectedNationality);
    return matchesSearch && matchesNat;
  });

  const getStageLeads = (stage: PipelineStage) =>
    filteredLeads.filter((l) => l.stage === stage);

  const handleStageMove = (lead: Lead, direction: "next" | "prev") => {
    soundManager.playClick();
    const currentIndex = STAGES.findIndex((s) => s.id === lead.stage);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < STAGES.length) {
      const newStage = STAGES[newIndex].id;
      onMoveLead(lead.id, newStage);
      soundManager.playSuccess();

      // Trigger visualizer for email & task automation (Requirements 9 & 10)
      let emailTitle = "";
      let taskTitle = "";
      if (newStage === "new") {
        emailTitle = "Immediate Welcome & Expat Mortgage Guide sent";
        taskTitle = "Task created: Call lead within 2 hours";
      } else if (newStage === "contacted") {
        emailTitle = "Borrowing capacity summary dispatched";
        taskTitle =
          "Task created: Send tailored borrowing capacity calculation";
      } else if (newStage === "qualified") {
        emailTitle = "Document checklist requested from the borrower";
        taskTitle = "Task created: Send document request to borrower";
      } else if (newStage === "doc_gathering") {
        emailTitle = "Document checklist & bank portal login sent";
        taskTitle = "Task created: Review credit report and latest payslips";
      } else if (newStage === "bank_underwriting") {
        emailTitle = "Bank submission notification sent";
        taskTitle =
          "Task created: Follow up with Sparkasse/ING underwriting desk";
      } else if (newStage === "offer_received") {
        emailTitle = "Binding offer approval notice sent";
        taskTitle = "Task created: Prepare notary appointment checklist";
      } else if (newStage === "won") {
        emailTitle = "Closing celebration & commission disbursement trigger";
        taskTitle =
          "Task created: Archive dossier to permanent compliance vault";
      }

      setStageNotification({
        leadName: lead.name,
        stage: STAGES[newIndex].label,
        emailSent: emailTitle,
        taskCreated: taskTitle,
      });

      setTimeout(() => {
        setStageNotification(null);
      }, 5000);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Live Sync Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900">
              Live Pipeline Board · {activeBrokerage.name}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              ({tenantLeads.length} Total Tenant Leads)
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Multi-screen live synchronized Kanban board. Advancing stages
            triggers automated emails and SLA advisor tasks.
          </p>
        </div>

        {/* Real-time sync feedback indicator */}
        {lastSimulatedEvent && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-700">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium truncate max-w-xs">
              {lastSimulatedEvent}
            </span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expat client by name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 border border-slate-200/80 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              aria-label="Filter by nationality"
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All Nationalities</option>
              <option value="Indian">Indian</option>
              <option value="Irish">Irish</option>
              <option value="French">French</option>
              <option value="Chinese">Chinese</option>
              <option value="Italian">Italian</option>
              <option value="Ukrainian">Ukrainian</option>
              <option value="British">British</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>
            Active Volume:{" "}
            <strong className="text-slate-900 tabular-nums">
              €
              {(
                tenantLeads.reduce((acc, l) => acc + l.loanAmountEur, 0) /
                1000000
              ).toFixed(2)}
              M
            </strong>
          </span>
        </div>
      </div>

      {/* Live Automation Notification Alert */}
      <AnimatePresence>
        {stageNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-start justify-between gap-3 text-xs text-emerald-900"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  Stage Automation Dispatched for {stageNotification.leadName} →{" "}
                  {stageNotification.stage}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {stageNotification.emailSent}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {stageNotification.taskCreated}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStageNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Columns Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[550px] items-start overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = getStageLeads(stage.id);
          const stageTotalLoan = stageLeads.reduce(
            (acc, l) => acc + l.loanAmountEur,
            0,
          );

          return (
            <div
              key={stage.id}
              className="glass-panel rounded-2xl p-3 border border-white/70 shadow-xs flex flex-col gap-3 min-w-[240px] bg-white/60"
            >
              {/* Column Header */}
              <div className="border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    {stage.label}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-200/70 text-slate-700 tabular-nums">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="truncate">{stage.description}</span>
                  <span className="font-mono tabular-nums text-slate-700 font-semibold">
                    €{(stageTotalLoan / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200/80 rounded-xl text-slate-500 text-xs">
                    No active leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const currentIndex = STAGES.findIndex(
                      (s) => s.id === lead.stage,
                    );
                    const canMovePrev = currentIndex > 0;
                    const canMoveNext = currentIndex < STAGES.length - 1;

                    return (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="p-3.5 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs hover:shadow-md transition-all group space-y-2.5"
                      >
                        {/* Duplicate Alert (Requirement 4: Notice when a new lead is a person the brokerage already knows) */}
                        {lead.duplicateInfo?.isDuplicate && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">
                                Duplicate Notice:
                              </span>{" "}
                              {lead.duplicateInfo.reason}
                            </div>
                          </div>
                        )}

                        {/* Lead Name & City */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {lead.name}
                            </h4>
                            {lead.isClient ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Client
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">
                                Inbound
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{lead.targetCity}</span>
                          </p>
                        </div>

                        {/* Financial Figures */}
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Loan:</span>
                            <span className="font-bold text-slate-900 font-mono tabular-nums">
                              €{lead.loanAmountEur.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Property:</span>
                            <span className="text-slate-700 font-mono tabular-nums">
                              €{lead.propertyPriceEur.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Expat details */}
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <div className="truncate">
                            <span className="text-slate-600 font-medium">
                              Status:
                            </span>{" "}
                            {lead.nationality}
                          </div>
                          <div className="truncate">
                            <span className="text-slate-600 font-medium">
                              Source:
                            </span>{" "}
                            {lead.source}
                          </div>
                        </div>

                        {/* Convert to Client Button (Requirement 5: Let an advisor turn a lead into a client) */}
                        {!lead.isClient && (
                          <button
                            onClick={() => {
                              soundManager.playSuccess();
                              onConvertToClient(lead.id);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Turn Lead into Client</span>
                          </button>
                        )}

                        {/* Stage Progression Controls */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <button
                            disabled={!canMovePrev}
                            onClick={() => handleStageMove(lead, "prev")}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              canMovePrev
                                ? "text-slate-600 hover:bg-slate-100"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                            title="Move back"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenLeadDetails(lead)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          <button
                            disabled={!canMoveNext}
                            onClick={() => handleStageMove(lead, "next")}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              canMoveNext
                                ? "text-slate-900 bg-slate-100 hover:bg-slate-200"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                            title="Advance stage"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
