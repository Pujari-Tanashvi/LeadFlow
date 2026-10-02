import React, { useState } from "react";
import { motion } from "motion/react";
import { Lead, DocumentItem, LeadTask, Brokerage } from "../types";
import { soundManager } from "../utils/audio";
import {
  X,
  UserCheck,
  Building2,
  Mail,
  Phone,
  FileText,
  Clock,
  Euro,
  ShieldAlert,
  Send,
  CheckCircle2,
} from "lucide-react";

interface LeadDetailsModalProps {
  lead: Lead | null;
  onClose: () => void;
  onConvertToClient: (leadId: string) => void;
  documents: DocumentItem[];
  tasks: LeadTask[];
  brokerage: Brokerage;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  onClose,
  onConvertToClient,
  documents,
  tasks,
  brokerage,
}) => {
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<string[]>([
    "Initial enquiry logged via web form. Expressed interest in fixed 10-year term with ING or DSL Bank.",
    "Residence permit verified through 2029. Gross income meets the lender affordability threshold.",
  ]);

  if (!lead) return null;

  // Documents belong to the client dossier created from this lead.
  const leadDocs = documents.filter(
    (d) => d.leadId === (lead.clientId ?? lead.id),
  );
  const leadTasks = tasks.filter((t) => t.leadId === lead.id);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    soundManager.playSuccess();
    setNotes((prev) => [newNote.trim(), ...prev]);
    setNewNote("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-xs"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {lead.name}
              </h3>
              {lead.isClient ? (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Client Portal Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  Inbound Lead
                </span>
              )}
            </div>
            <p className="text-slate-500 mt-0.5">
              {lead.nationality} · Property in {lead.targetCity} · Source:{" "}
              {lead.source}
            </p>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Duplicate Notice */}
          {lead.duplicateInfo?.isDuplicate && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Brokerage Duplicate Notice:</strong>{" "}
                {lead.duplicateInfo.reason}
              </div>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Target Loan</span>
              <strong className="text-slate-900 font-mono text-sm">
                €{lead.loanAmountEur.toLocaleString()}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">
                Property Value
              </span>
              <strong className="text-slate-900 font-mono text-sm">
                €{lead.propertyPriceEur.toLocaleString()}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Equity Needed</span>
              <strong className="text-slate-900 font-mono text-sm">
                €{(lead.propertyPriceEur - lead.loanAmountEur).toLocaleString()}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Current Stage</span>
              <strong className="text-slate-900 uppercase font-mono text-xs">
                {lead.stage}
              </strong>
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="font-bold text-slate-800 block">
              Contact Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.phone}</span>
              </div>
            </div>
          </div>

          {/* Documents status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Mortgage Dossier Documents ({leadDocs.length})
              </span>
              <span className="text-slate-500 font-mono">
                {leadDocs.filter((d) => d.status === "approved").length} of{" "}
                {leadDocs.length} Approved
              </span>
            </div>

            {leadDocs.length === 0 ? (
              <p className="text-slate-500 p-3 bg-slate-50 rounded-xl">
                No documents uploaded yet for this case.
              </p>
            ) : (
              <div className="space-y-1.5">
                {leadDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {doc.name}
                      </span>
                      <span className="text-slate-500 ml-2">
                        ({doc.category})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        doc.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : doc.status === "action_needed"
                            ? "bg-amber-100 text-amber-800"
                            : doc.status === "analyzing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Advisor Notes */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block">
              Advisor Case Notes
            </span>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Add note on bank approval, payslip verification, or client call..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Add Note
              </button>
            </form>

            <div className="space-y-1.5 pt-2">
              {notes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {!lead.isClient ? (
            <button
              onClick={() => {
                soundManager.playSuccess();
                onConvertToClient(lead.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Convert Lead to Expat Client</span>
            </button>
          ) : (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Client Portal Credential Active</span>
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </motion.div>
    </div>
  );
};
