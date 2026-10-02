import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DocumentItem, Lead, Brokerage, DocStatus } from "../types";
import { soundManager } from "../utils/audio";
import {
  FileCheck2,
  AlertCircle,
  Upload,
  Clock,
  CheckCircle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Eye,
  AlertTriangle,
  FileSearch,
  Check,
  Building,
} from "lucide-react";

interface DocumentVerificationHubProps {
  documents: DocumentItem[];
  leads: Lead[];
  activeBrokerage: Brokerage;
  onUpdateDocument: (doc: DocumentItem) => void;
  onAddDocument: (newDoc: DocumentItem) => void;
}

export const DocumentVerificationHub: React.FC<
  DocumentVerificationHubProps
> = ({
  documents,
  leads,
  activeBrokerage,
  onUpdateDocument,
  onAddDocument,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>("lead-03");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [backgroundLogs, setBackgroundLogs] = useState<string[]>([
    "Worker initialized: OCR Engine running on node worker-fra-02",
    "Audited Martin_Payslips_Q1.pdf: Monthly income confirmed",
    "Flagged Credit_Report_2026.pdf: Updated copy requested",
  ]);

  // Documents belong to a client dossier, so the hub selects a client and
  // reads the documents filed under that client's id.
  const tenantClients = leads.filter(
    (l) =>
      l.brokerageId === activeBrokerage.id &&
      (l.isClient ||
        l.stage === "doc_gathering" ||
        l.stage === "bank_underwriting"),
  );
  const currentLead =
    leads.find((l) => l.id === selectedLeadId) || tenantClients[0] || leads[0];
  const clientDocs = documents.filter(
    (d) => d.leadId === (currentLead?.clientId ?? currentLead?.id),
  );

  const filteredDocs =
    activeCategory === "all"
      ? clientDocs
      : clientDocs.filter((d) => d.category === activeCategory);

  // Calculate Bank Readiness Score
  const totalRequired = clientDocs.filter((d) => d.required).length;
  const approvedDocs = clientDocs.filter((d) => d.status === "approved").length;
  const readinessPercentage =
    totalRequired > 0 ? Math.round((approvedDocs / totalRequired) * 100) : 0;

  // Simulate slow background document checking (Requirement 6)
  useEffect(() => {
    const interval = setInterval(() => {
      // Find analyzing document
      const analyzingDoc = clientDocs.find((d) => d.status === "analyzing");
      if (analyzingDoc) {
        if (analyzingDoc.progress < 95) {
          const nextProgress = Math.min(analyzingDoc.progress + 15, 95);
          onUpdateDocument({
            ...analyzingDoc,
            progress: nextProgress,
          });
          setBackgroundLogs((prev) => [
            `Analyzing ${analyzingDoc.name}: Verification step ${nextProgress}% complete...`,
            ...prev.slice(0, 5),
          ]);
        } else {
          // Finish check with 80% pass, 20% fail
          const isPass = Math.random() > 0.25;
          if (isPass) {
            onUpdateDocument({
              ...analyzingDoc,
              status: "approved",
              progress: 100,
            });
            soundManager.playSuccess();
            setBackgroundLogs((prev) => [
              `✓ Passed underwriting check: ${analyzingDoc.name}`,
              ...prev.slice(0, 5),
            ]);
          } else {
            onUpdateDocument({
              ...analyzingDoc,
              status: "action_needed",
              progress: 100,
              flagReason:
                "Signature unverified or document edge truncated by scanner.",
            });
            soundManager.playAlert();
            setBackgroundLogs((prev) => [
              `⚠ Action Needed for ${analyzingDoc.name}: Signature unverified`,
              ...prev.slice(0, 5),
            ]);
          }
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [clientDocs, onUpdateDocument]);

  const handleSimulateNewUpload = (
    docName: string,
    category: DocumentItem["category"],
  ) => {
    soundManager.playClick();
    setIsSimulatingUpload(true);
    setTimeout(() => {
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        leadId: currentLead.id,
        brokerageId: activeBrokerage.id,
        name: docName,
        category,
        fileName: `${docName.replace(/\s+/g, "_")}_Upload.pdf`,
        fileSize: "3.8 MB",
        uploadedAt: "Just now",
        status: "analyzing",
        progress: 10,
        required: true,
      };
      onAddDocument(newDoc);
      setIsSimulatingUpload(false);
      soundManager.playSuccess();
      setBackgroundLogs((prev) => [
        `Incoming file queued for background worker: ${newDoc.fileName}`,
        ...prev.slice(0, 5),
      ]);
    }, 600);
  };

  const handleApproveManually = (doc: DocumentItem) => {
    soundManager.playSuccess();
    onUpdateDocument({
      ...doc,
      status: "approved",
      progress: 100,
      flagReason: undefined,
    });
    setBackgroundLogs((prev) => [
      `Advisor manual override: Approved ${doc.name}`,
      ...prev.slice(0, 5),
    ]);
  };

  const handleRecheck = (doc: DocumentItem) => {
    soundManager.playClick();
    onUpdateDocument({
      ...doc,
      status: "analyzing",
      progress: 20,
      flagReason: undefined,
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header and Client Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">
              Background Document Verification
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Documents move through background checks without blocking the
            client. Advisors can review results and request a new file when
            needed.
          </p>
        </div>

        {/* Client Dossier Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            Client Case:
          </span>
          <select
            aria-label="Select client dossier"
            value={currentLead?.id}
            onChange={(e) => {
              soundManager.playClick();
              setSelectedLeadId(e.target.value);
            }}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 shadow-xs focus:outline-none cursor-pointer"
          >
            {leads
              .filter((l) => l.brokerageId === activeBrokerage.id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.targetCity})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Bank Readiness Score Meter & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness Meter */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Application Readiness
            </span>
            <span className="text-xs font-mono font-bold text-slate-900">
              {readinessPercentage}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readinessPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                readinessPercentage >= 75
                  ? "bg-emerald-500"
                  : readinessPercentage >= 40
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {approvedDocs} of {totalRequired} documents verified
            </span>
            <span>Target: 100% for ING/DSL Bank submission</span>
          </div>
        </div>

        {/* Lead Case Details */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2">
          <span className="text-xs font-bold text-slate-900">
            Loan Case Summary
          </span>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <strong className="text-slate-900">{currentLead?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loan Amount:</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                €{currentLead?.loanAmountEur.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Property:</span>
              <span className="truncate">{currentLead?.targetCity}</span>
            </div>
          </div>
        </div>

        {/* Live Background Worker Terminal */}
        <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2 bg-slate-900 text-slate-200 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-700/60 pb-1">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>Background OCR Worker</span>
            </span>
            <span className="text-[10px] text-emerald-400">ONLINE</span>
          </div>
          <div className="space-y-1 text-slate-300 max-h-20 overflow-y-auto">
            {backgroundLogs.slice(0, 3).map((log, i) => (
              <p key={i} className="truncate text-[10px]">
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs & Quick Simulation Upload */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/50 rounded-xl border border-white/70">
          {[
            "all",
            "Income Proof",
            "Identification",
            "Banking",
            "Credit Rating",
            "Property",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                soundManager.playClick();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeCategory === cat
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat === "all" ? "All Documents" : cat}
            </button>
          ))}
        </div>

        {/* Quick simulate upload buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleSimulateNewUpload(
                "Residence Permit or Passport",
                "Identification",
              )
            }
            disabled={isSimulatingUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-medium text-slate-800 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Residence Permit</span>
          </button>

          <button
            onClick={() =>
              handleSimulateNewUpload("Annual Tax Statement", "Income Proof")
            }
            disabled={isSimulatingUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Simulate Tax Return Upload</span>
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/80 shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No documents found for this category
            </div>
          ) : (
            filteredDocs.map((doc) => {
              return (
                <div
                  key={doc.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Document Info */}
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        doc.status === "approved"
                          ? "bg-emerald-50 text-emerald-600"
                          : doc.status === "action_needed"
                            ? "bg-amber-50 text-amber-600"
                            : doc.status === "analyzing"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          {doc.name}
                        </h4>
                        {doc.required && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{doc.category}</span>
                        {doc.fileName && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-700">
                              {doc.fileName}
                            </span>
                            <span>({doc.fileSize})</span>
                          </>
                        )}
                        {doc.uploadedAt && (
                          <>
                            <span>·</span>
                            <span>{doc.uploadedAt}</span>
                          </>
                        )}
                      </div>

                      {/* Error or Flag Notice */}
                      {doc.status === "action_needed" && doc.flagReason && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-900 text-xs flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Underwriting Flag:</strong> {doc.flagReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Progress / Status Indicator */}
                  <div className="flex items-center gap-4 shrink-0 min-w-[180px]">
                    {doc.status === "analyzing" && (
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-blue-700 font-medium flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>OCR Checking...</span>
                          </span>
                          <span className="font-mono text-slate-600">
                            {doc.progress}%
                          </span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${doc.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {doc.status === "approved" && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Ready for Lender Review</span>
                      </div>
                    )}

                    {doc.status === "action_needed" && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Action Required</span>
                      </div>
                    )}

                    {doc.status === "not_uploaded" && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Awaiting Upload</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.status === "action_needed" && (
                      <>
                        <button
                          onClick={() => handleRecheck(doc)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Re-Scan
                        </button>
                        <button
                          onClick={() => handleApproveManually(doc)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Advisor Override
                        </button>
                      </>
                    )}

                    {doc.status === "not_uploaded" && (
                      <button
                        onClick={() =>
                          handleSimulateNewUpload(doc.name, doc.category)
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Upload Document
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
