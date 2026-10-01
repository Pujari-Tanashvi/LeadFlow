import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DESIGN_SHOWCASE_ITEMS } from "../data/mockData";
import { DesignShowcaseItem } from "../types";
import { soundManager } from "../utils/audio";
import {
  Sparkles,
  Layers,
  Maximize2,
  Check,
  ArrowRight,
  Sliders,
  Eye,
  Zap,
  ShieldCheck,
  Workflow,
  X,
  Compass,
  Cpu,
  LayoutDashboard,
} from "lucide-react";

interface DesignShowcaseProps {
  onExploreLivePipeline: () => void;
  onExploreDocuments: () => void;
  onViewDashboard: () => void;
}

export const DesignShowcase: React.FC<DesignShowcaseProps> = ({
  onExploreLivePipeline,
  onExploreDocuments,
  onViewDashboard,
}) => {
  const [selectedItem, setSelectedItem] = useState<DesignShowcaseItem>(
    DESIGN_SHOWCASE_ITEMS[0],
  );
  const [lightboxImage, setLightboxImage] = useState<DesignShowcaseItem | null>(
    null,
  );
  const [activeGraphicEffect, setActiveGraphicEffect] = useState<number>(1);
  const [glassBlur, setGlassBlur] = useState<number>(24);
  const [glassOpacity, setGlassOpacity] = useState<number>(75);
  const [lightIntensity, setLightIntensity] = useState<number>(85);

  // 3D Card Tilt state for the hero preview
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -8;
    const rY = ((x - centerX) / centerX) * 8;
    setRotateX(rX);
    setRotateY(rY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const GRAPHIC_EFFECTS = [
    {
      id: 1,
      title: "01. New lead",
      desc: "Confirm contact details, source and requested loan amount.",
      style: {
        background: `rgba(255, 255, 255, ${glassOpacity / 100})`,
        backdropFilter: `blur(${glassBlur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${glassBlur}px) saturate(180%)`,
        border: "1px solid rgba(255, 255, 255, 0.85)",
        boxShadow:
          "0 20px 40px -15px rgba(0,0,0,0.06), inset 0 1px 2px 0 rgba(255,255,255,0.95)",
      },
    },
    {
      id: 2,
      title: "02. Contacted",
      desc: "Advisor has reached the applicant and captured the next step.",
      style: {
        background: "#f1f5f9",
        boxShadow: "8px 8px 20px #d1d5db, -8px -8px 20px #ffffff",
        border: "none",
      },
    },
    {
      id: 3,
      title: "03. Qualified",
      desc: "Income, deposit and property details are ready for review.",
      style: {
        background: "#ffffff",
        boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
        border: "1px solid rgba(226, 232, 240, 0.8)",
      },
    },
    {
      id: 4,
      title: "04. Documents",
      desc: "Collect identity, income and property documents from the client.",
      style: {
        background: "#ffffff",
        border: "1px solid rgba(251, 146, 60, 0.4)",
        boxShadow:
          "0 0 35px 5px rgba(251, 146, 60, 0.35), 0 0 15px rgba(244, 63, 94, 0.2)",
      },
    },
    {
      id: 5,
      title: "05. In Review",
      desc: "Check completeness and prepare the lender submission pack.",
      style: {
        background:
          "linear-gradient(135deg, #fbcfe8 0%, #fed7aa 50%, #c7d2fe 100%)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        boxShadow: "0 12px 30px -8px rgba(244, 114, 182, 0.25)",
      },
    },
    {
      id: 6,
      title: "06. Verified",
      desc: "Required files passed review and are ready for underwriting.",
      style: {
        background: "#ffffff",
        border: "1.5px solid #38bdf8",
        boxShadow: "0 0 25px 2px rgba(56, 189, 248, 0.45)",
      },
    },
    {
      id: 7,
      title: "07. Follow-up",
      desc: "Request a replacement when a document is missing or out of date.",
      style: {
        background: "#f8fafc",
        boxShadow:
          "inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(226, 232, 240, 0.6)",
      },
    },
    {
      id: 8,
      title: "08. Complete",
      desc: "Record the outcome and keep the full case history together.",
      style: {
        background: "#ffffff",
        borderTop: "2px solid rgba(255, 255, 255, 1)",
        borderLeft: "2px solid rgba(255, 255, 255, 0.8)",
        borderBottom: "2px solid rgba(148, 163, 184, 0.5)",
        borderRight: "2px solid rgba(148, 163, 184, 0.3)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
      },
    },
  ];

  return (
    <div className="relative py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Ambient decorative gradient lights */}
      <div className="pointer-events-none absolute -top-12 left-1/4 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="pointer-events-none absolute top-1/3 right-10 w-96 h-96 bg-amber-200/35 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-1/4 left-10 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -z-10" />

      {/* Hero Header: Design Brief & Reference Synthesis */}
      <section className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            Mortgage brokerage workspace · Leads, documents & workflows
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight text-balance">
          LeadFlow Mortgage Workspace
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
          A modern mortgage brokerage platform for managing leads, clients,
          documents, tasks and automated workflows.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onExploreLivePipeline();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
          >
            <span>Open Lead Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onExploreDocuments();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 hover:bg-white text-slate-800 font-semibold text-sm border border-slate-200/80 shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Document Center</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onViewDashboard();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>View Dashboard</span>
          </button>
        </div>
      </section>

      {/* Primary 3D Interactive Showcase Card */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-600">
              WORKSPACE PREVIEW
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedItem.title}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {selectedItem.subtitle} · Lead, case and document activity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playClick();
                setLightboxImage(selectedItem);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-medium text-slate-700 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>
        </div>

        {/* 3D Tilt Stage */}
        <div
          className="relative perspective-1000 w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            ref={cardRef}
            animate={{ rotateX, rotateY }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 180,
              mass: 0.5,
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative w-full rounded-3xl overflow-hidden glass-panel-interactive border border-white/80 shadow-2xl group cursor-crosshair"
          >
            {/* Dynamic Specular Sheen layer */}
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 350px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.9), transparent 80%)`,
              }}
            />

            {/* High-Resolution Generated Image Asset */}
            <div className="relative aspect-16/9 w-full bg-slate-100 overflow-hidden">
              <img
                src={selectedItem.imagePath}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover select-none transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />

              {/* Glassmorphism Badge Overlay */}
              <div className="absolute bottom-6 left-6 right-6 p-4 sm:p-6 rounded-2xl glass-panel border border-white/80 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-900">
                      {selectedItem.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      · {selectedItem.aspectRatio} Aspect
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {selectedItem.visualEffects.map((eff, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100/90 text-slate-700 border border-slate-200/60"
                    >
                      {eff}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature module switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESIGN_SHOWCASE_ITEMS.map((item) => {
            const isSelected = selectedItem.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundManager.playClick();
                  setSelectedItem(item);
                }}
                className={`text-left p-3 rounded-2xl transition-all cursor-pointer group ${
                  isSelected
                    ? "glass-panel ring-2 ring-slate-900 shadow-md"
                    : "bg-white/60 hover:bg-white/90 border border-slate-200/80 shadow-xs"
                }`}
              >
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-3 relative">
                  <img
                    src={item.imagePath}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-700">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lead stages and review checkpoints */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>LEAD & DOCUMENT WORKFLOW</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              From new enquiry to verified documents
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Track each mortgage case through advisor follow-up, document
              collection and lender review.
            </p>
          </div>

          {/* Interactive Live Tuners */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">
                Documents in queue
              </span>
              <span className="font-mono text-[11px] text-slate-700">
                18 files
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Review target</span>
              <span className="font-mono text-[11px] text-slate-700">
                2 business days
              </span>
            </div>
          </div>
        </div>

        {/* Lead workflow stage grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GRAPHIC_EFFECTS.map((eff) => {
            const isActive = activeGraphicEffect === eff.id;
            return (
              <div
                key={eff.id}
                onClick={() => {
                  soundManager.playClick();
                  setActiveGraphicEffect(eff.id);
                }}
                className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between h-56 ${
                  isActive
                    ? "ring-2 ring-slate-900 shadow-md"
                    : "bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                {/* Visual Swatch Demo */}
                <div
                  className="w-full h-24 rounded-xl flex items-center justify-center transition-all"
                  style={eff.style}
                >
                  <span className="text-xs font-bold text-slate-800 drop-shadow-xs">
                    {eff.title.split(". ")[1]}
                  </span>
                </div>

                {/* Details */}
                <div className="pt-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>{eff.title}</span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-slate-900" />
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {eff.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mortgage operations overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Pipeline snapshot */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Pipeline Snapshot</span>
          </div>
          <p className="text-xs text-slate-600">
            Current cases across the active mortgage stages.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                New and contacted
              </span>
              <span className="font-mono text-slate-500">11 cases</span>
            </div>
            <div className="h-3 rounded-md bg-[#F8F9FA] border border-slate-300 w-full" />

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-medium">
                Documents and review
              </span>
              <span className="font-mono text-slate-500">12 cases</span>
            </div>
            <div className="h-3 rounded-md bg-white/75 border border-white shadow-xs w-full" />

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-medium">Won this month</span>
              <span className="font-mono text-slate-500">2 cases</span>
            </div>
            <div className="h-3 rounded-md bg-gradient-to-r from-slate-900 via-emerald-600 to-amber-500 w-full" />
          </div>
        </div>

        {/* Card 2: Document review */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Document Review</span>
          </div>
          <p className="text-xs text-slate-600">
            Keep required borrower files and review outcomes together.
          </p>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[11px] text-slate-600">
                Awaiting upload
              </span>
              <p className="text-base font-extrabold text-slate-900 tracking-tight">
                6 documents
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-600">Processing</span>
              <p className="text-xs font-normal text-slate-700 leading-normal">
                4 files in background checks
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-600">
                Ready for lender review
              </span>
              <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                8 files verified
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Advisor follow-up */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span>Advisor Follow-up</span>
          </div>
          <p className="text-xs text-slate-600">
            Keep the next client action visible for every active case.
          </p>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>New enquiries assigned to an advisor</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Document requests tracked on the client case</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Overdue follow-ups highlighted for review</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Lightbox Modal for High-Resolution Inspection */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-16/9 w-full bg-black">
                <img
                  src={lightboxImage.imagePath}
                  alt={lightboxImage.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-6 text-white space-y-2">
                <h3 className="text-xl font-bold">{lightboxImage.title}</h3>
                <p className="text-sm text-slate-300">
                  {lightboxImage.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {lightboxImage.designNotes.map((note, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-slate-200"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
