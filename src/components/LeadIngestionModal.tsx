import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Brokerage } from "../types";
import { soundManager } from "../utils/audio";
import {
  X,
  Send,
  Sparkles,
  AlertTriangle,
  Check,
  Workflow,
  Copy,
  Radio,
  FileCode2,
} from "lucide-react";

interface LeadIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestLead: (lead: Lead) => void;
  activeBrokerage: Brokerage;
  existingLeads: Lead[];
}

export const LeadIngestionModal: React.FC<LeadIngestionModalProps> = ({
  isOpen,
  onClose,
  onIngestLead,
  activeBrokerage,
  existingLeads,
}) => {
  const [source, setSource] = useState<
    "Typeform Web Form" | "Meta Expat Ads" | "Direct Calendly"
  >("Typeform Web Form");
  const [name, setName] = useState("Oliver Bennett");
  const [email, setEmail] = useState("oliver.b@berlin-tech.io");
  const [phone, setPhone] = useState("+49 176 8920 3311");
  const [nationality, setNationality] = useState("British (EU Blue Card)");
  const [targetCity, setTargetCity] = useState("Berlin-Kreuzberg");
  const [loanAmountEur, setLoanAmountEur] = useState(480000);
  const [propertyPriceEur, setPropertyPriceEur] = useState(580000);
  const [employmentStatus, setEmploymentStatus] =
    useState<Lead["employmentStatus"]>("Blue Card Holder");

  if (!isOpen) return null;

  // Preset quick-fills
  const handleLoadDuplicatePreset = () => {
    soundManager.playAlert();
    setName("Olivia Martin");
    setEmail("olivia.martin@example.com");
    setPhone("+49 176 4921 8840");
    setNationality("International professional");
    setTargetCity("Berlin-Prenzlauer Berg");
    setLoanAmountEur(520000);
    setPropertyPriceEur(650000);
    setEmploymentStatus("Blue Card Holder");
  };

  const handleLoadNewLeadPreset = () => {
    soundManager.playClick();
    setName("Kavita Sharma");
    setEmail("kavita.sharma@zalando-engineering.de");
    setPhone("+49 152 7719 3302");
    setNationality("Indian (Permanent Residency)");
    setTargetCity("Berlin-Friedrichshain");
    setLoanAmountEur(590000);
    setPropertyPriceEur(700000);
    setEmploymentStatus("Employed (Permanent)");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playSuccess();

    // Check duplicate logic (Requirement 4: Notice when a new lead is a person the brokerage already knows)
    const matchingLead = existingLeads.find(
      (l) =>
        l.email.toLowerCase() === email.toLowerCase() ||
        l.phone === phone ||
        l.name.toLowerCase() === name.toLowerCase(),
    );

    const newLead: Lead = {
      id: `lead-ingested-${Date.now()}`,
      brokerageId: activeBrokerage.id,
      name,
      email,
      phone,
      nationality,
      targetCity,
      loanAmountEur,
      propertyPriceEur,
      employmentStatus,
      source,
      stage: "new",
      assignedAdvisorId: "adv-1",
      createdAt: "Just now",
      updatedAt: "Just now",
      isClient: false,
      notesCount: 0,
      duplicateInfo: matchingLead
        ? {
            isDuplicate: true,
            previousLeadId: matchingLead.id,
            reason: `Matched existing lead "${matchingLead.name}" by ${matchingLead.email.toLowerCase() === email.toLowerCase() ? "email" : "phone"}`,
          }
        : undefined,
    };

    onIngestLead(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Inbound Webhook Lead Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Simulate inbound lead arrival from external tools (Typeform,
                Meta Ads, Calendly).
              </p>
            </div>
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

        {/* Quick Presets */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600">
            Quick Test Scenarios:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadNewLeadPreset}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
            >
              Fresh Unique Lead
            </button>
            <button
              type="button"
              onClick={handleLoadDuplicatePreset}
              className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-900 font-medium transition-colors cursor-pointer"
              title="Loads existing email to trigger Requirement 4 duplicate detection"
            >
              Duplicate Lead Test
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Source Tool
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="Typeform Web Form">
                  Typeform Web Form Webhook
                </option>
                <option value="Meta Expat Ads">
                  Meta Expat Ads (Facebook/IG)
                </option>
                <option value="Direct Calendly">
                  Calendly Booking Webhook
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Destination Brokerage
              </label>
              <input
                type="text"
                disabled
                value={activeBrokerage.name}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Applicant Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Nationality & Visa
              </label>
              <input
                type="text"
                required
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Property City
              </label>
              <input
                type="text"
                required
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Requested Loan (€)
              </label>
              <input
                type="number"
                min="50000"
                step="10000"
                value={loanAmountEur}
                onChange={(e) => setLoanAmountEur(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Property Price (€)
              </label>
              <input
                type="number"
                min="50000"
                step="10000"
                value={propertyPriceEur}
                onChange={(e) => setPropertyPriceEur(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate Inbound Lead</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
