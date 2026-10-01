import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lead, DocumentItem, Brokerage, Advisor } from '../types';
import { soundManager } from '../utils/audio';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Phone, 
  Mail, 
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface ClientPortalProps {
  currentClient: Lead;
  documents: DocumentItem[];
  brokerage: Brokerage;
  advisors: Advisor[];
  onUploadDocument: (name: string, category: DocumentItem['category']) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  currentClient,
  documents,
  brokerage,
  advisors,
  onUploadDocument
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  const clientDocs = documents.filter(d => d.leadId === currentClient.id);
  const advisor = advisors.find(a => a.id === currentClient.assignedAdvisorId) || advisors[0];

  const approvedCount = clientDocs.filter(d => d.status === 'approved').length;
  const totalCount = clientDocs.length;
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const handleSimulateDrop = (docName: string, category: DocumentItem['category']) => {
    soundManager.playSuccess();
    onUploadDocument(docName, category);
    setUploadToast(`"${docName}" uploaded successfully! Background checks running in background.`);
    setTimeout(() => {
      setUploadToast(null);
    }, 4500);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Toast Notification */}
      {uploadToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 right-6 z-50 p-4 rounded-2xl glass-panel-interactive border border-white shadow-xl flex items-center gap-3 text-xs text-slate-900 max-w-md"
        >
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold">File Queued for Verification</p>
            <p className="text-slate-600">{uploadToast}</p>
          </div>
        </motion.div>
      )}

      {/* Expat Welcome Hero */}
      <div className="relative rounded-3xl overflow-hidden glass-panel-interactive p-6 sm:p-8 border border-white/80 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified German Mortgage Application · {brokerage.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Your Mortgage Portal, {currentClient.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Tracking your financing for your property purchase in <strong>{currentClient.targetCity}</strong>. All documents are securely checked in the background for German bank compliance.
            </p>
          </div>

          {/* Quick Case Summary Badge */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white min-w-[240px] space-y-2 shadow-lg">
            <span className="text-[11px] text-slate-400 font-medium">Approved Target Loan</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              €{currentClient.loanAmountEur.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Property: €{currentClient.propertyPriceEur.toLocaleString()}</span>
              <span className="text-emerald-400 font-semibold">Stage: Pre-Approved</span>
            </div>
          </div>
        </div>

        {/* Milestone Tracker Bar */}
        <div className="border-t border-slate-200/80 pt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">Application Milestones</span>
            <span className="font-mono text-slate-500 font-medium">{progressPercent}% Document Readiness</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {[
              { step: '01. Initial Review', status: 'completed' },
              { step: '02. Document Dossier', status: 'current' },
              { step: '03. Bank Underwriting', status: 'upcoming' },
              { step: '04. Binding Offer', status: 'upcoming' },
              { step: '05. Notary & Signing', status: 'upcoming' }
            ].map((m, i) => (
              <div 
                key={i} 
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  m.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' :
                  m.status === 'current' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs' :
                  'bg-slate-50 border-slate-200 text-slate-400 text-xs'
                }`}
              >
                <div className="text-[11px]">{m.step}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main Grid: Document Upload Checklist + Advisor Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Expat Document Checklist */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel p-6 rounded-2xl border border-white/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Required Mortgage Documents (15–40 Checklist)</h3>
                <p className="text-xs text-slate-500">
                  Upload your files anytime. Background OCR checks verify your papers while you continue your day.
                </p>
              </div>

              {/* Upload Dropzone Trigger */}
              <button
                onClick={() => handleSimulateDrop('Updated German Payslip (Letzte Gehaltsabrechnung)', 'Income Proof')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>

            {/* Document list */}
            <div className="space-y-3 pt-2">
              {clientDocs.map((doc) => (
                <div 
                  key={doc.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      doc.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                      doc.status === 'action_needed' ? 'bg-amber-50 text-amber-600' :
                      doc.status === 'analyzing' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                        {doc.required && (
                          <span className="text-[10px] text-rose-600 font-medium">Required</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {doc.category} {doc.fileName && `· ${doc.fileName}`}
                      </p>

                      {doc.flagReason && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded mt-1">
                          <strong>Note:</strong> {doc.flagReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {doc.status === 'approved' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ready for Bank</span>
                      </span>
                    )}

                    {doc.status === 'analyzing' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        <Clock className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Analyzing ({doc.progress}%)</span>
                      </span>
                    )}

                    {doc.status === 'action_needed' && (
                      <button
                        onClick={() => handleSimulateDrop(doc.name, doc.category)}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Re-upload New Copy</span>
                      </button>
                    )}

                    {doc.status === 'not_uploaded' && (
                      <button
                        onClick={() => handleSimulateDrop(doc.name, doc.category)}
                        className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Upload Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* German Expat Guide: Bilingual Help Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Info className="w-4 h-4 text-blue-600" />
              <span>German Mortgage Terminology Guide for Expats</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">Gehaltsabrechnung</strong>
                Monthly payslip showing gross/net income, tax bracket (Steuerklasse), and pension contributions.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">Schufa Bonitätsauskunft</strong>
                Official German credit score rating. Partner banks require a clean certificate issued in the last 30 days.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">Aufenthaltstitel</strong>
                EU Blue Card or settlement permit confirming continuous legal employment authorization in Germany.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">Grundbuchauszug</strong>
                Land registry extract defining property borders, prior encumbrances, and ownership rights.
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Personal Assigned Advisor */}
        <div className="space-y-6">
          
          <div className="glass-panel p-6 rounded-2xl border border-white/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Your Dedicated Mortgage Specialist</h3>
            
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {advisor.avatar}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{advisor.name}</h4>
                <p className="text-xs text-slate-500">{advisor.role}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Available on Direct Line</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200/80 pt-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{advisor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>+49 30 8920 4410 (Direct Ext. 104)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{brokerage.city} Office</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              "Hi {currentClient.name}, your application looks solid. Once your updated 90-day bank statements finish processing, I will submit directly to our preferred underwriting desks at ING and Commerzbank."
            </div>
          </div>

          {/* Security & GDPR Trust Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bank-Grade Encryption & GDPR</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your financial documents are stored in ISO 27001 German cloud datacenters (Frankfurt am Main) and protected under strict German Federal Data Protection Act (BDSG).
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
