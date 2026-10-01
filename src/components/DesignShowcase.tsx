import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DESIGN_SHOWCASE_ITEMS } from '../data/mockData';
import { DesignShowcaseItem } from '../types';
import { soundManager } from '../utils/audio';
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
  LayoutDashboard
} from 'lucide-react';

interface DesignShowcaseProps {
  onExploreLivePipeline: () => void;
  onExploreDocuments: () => void;
  onViewDashboard: () => void;
}

export const DesignShowcase: React.FC<DesignShowcaseProps> = ({
  onExploreLivePipeline,
  onExploreDocuments,
  onViewDashboard
}) => {
  const [selectedItem, setSelectedItem] = useState<DesignShowcaseItem>(DESIGN_SHOWCASE_ITEMS[0]);
  const [lightboxImage, setLightboxImage] = useState<DesignShowcaseItem | null>(null);
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
      y: (y / rect.height) * 100
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const GRAPHIC_EFFECTS = [
    {
      id: 1,
      title: '01. Glass Effect',
      desc: 'High-index acrylic refraction with dual-sided specular bevels and backdrop blur',
      style: {
        background: `rgba(255, 255, 255, ${glassOpacity / 100})`,
        backdropFilter: `blur(${glassBlur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${glassBlur}px) saturate(180%)`,
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.06), inset 0 1px 2px 0 rgba(255,255,255,0.95)'
      }
    },
    {
      id: 2,
      title: '02. Neumorphism',
      desc: 'Soft extruded organic clay with paired directional incident light and ambient depression',
      style: {
        background: '#f1f5f9',
        boxShadow: '8px 8px 20px #d1d5db, -8px -8px 20px #ffffff',
        border: 'none'
      }
    },
    {
      id: 3,
      title: '03. Drop Shadow',
      desc: 'Multi-layer progressive ambient occlusion with ultra-soft dispersion radius',
      style: {
        background: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }
    },
    {
      id: 4,
      title: '04. Glow Effect',
      desc: 'Diffused pastel emission halo (420nm amber & rose) radiating behind surface geometry',
      style: {
        background: '#ffffff',
        border: '1px solid rgba(251, 146, 60, 0.4)',
        boxShadow: '0 0 35px 5px rgba(251, 146, 60, 0.35), 0 0 15px rgba(244, 63, 94, 0.2)'
      }
    },
    {
      id: 5,
      title: '05. Gradient Overlay',
      desc: 'Curated 3-stop liquid pastel transition (sunset apricot to ethereal periwinkle)',
      style: {
        background: 'linear-gradient(135deg, #fbcfe8 0%, #fed7aa 50%, #c7d2fe 100%)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 12px 30px -8px rgba(244, 114, 182, 0.25)'
      }
    },
    {
      id: 6,
      title: '06. Outer Glow',
      desc: 'Refined neon luminance boundary delineating active system state without harsh strokes',
      style: {
        background: '#ffffff',
        border: '1.5px solid #38bdf8',
        boxShadow: '0 0 25px 2px rgba(56, 189, 248, 0.45)'
      }
    },
    {
      id: 7,
      title: '07. Inner Shadow',
      desc: 'Subtle debossed concave depth simulating stamped tactile precision instrument panels',
      style: {
        background: '#f8fafc',
        boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(226, 232, 240, 0.6)'
      }
    },
    {
      id: 8,
      title: '08. Bevel & Emboss',
      desc: 'Precision micro-milled chamfer with highlight crest and shadow base',
      style: {
        background: '#ffffff',
        borderTop: '2px solid rgba(255, 255, 255, 1)',
        borderLeft: '2px solid rgba(255, 255, 255, 0.8)',
        borderBottom: '2px solid rgba(148, 163, 184, 0.5)',
        borderRight: '2px solid rgba(148, 163, 184, 0.3)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }
    }
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
          <span>Mortgage brokerage workspace · Leads, documents & workflows</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight text-balance">
          LeadFlow Mortgage Workspace
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
          A modern mortgage brokerage platform for managing leads, clients, documents, tasks and automated workflows.
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
            <span className="text-xs font-semibold tracking-wider text-slate-600">WORKSPACE PREVIEW</span>
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedItem.title}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {selectedItem.subtitle} · Interactive 3D Parallax & Liquid Glass Specular
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
            transition={{ type: 'spring', damping: 20, stiffness: 180, mass: 0.5 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-full rounded-3xl overflow-hidden glass-panel-interactive border border-white/80 shadow-2xl group cursor-crosshair"
          >
            {/* Dynamic Specular Sheen layer */}
            <div 
              className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 350px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.9), transparent 80%)`
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
                    <span className="text-xs font-bold text-slate-900">{selectedItem.title}</span>
                    <span className="text-xs text-slate-500">· {selectedItem.aspectRatio} Aspect</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {selectedItem.visualEffects.map((eff, i) => (
                    <span key={i} className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100/90 text-slate-700 border border-slate-200/60">
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
                    ? 'glass-panel ring-2 ring-slate-900 shadow-md' 
                    : 'bg-white/60 hover:bg-white/90 border border-slate-200/80 shadow-xs'
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

      {/* The 8 Graphic Effects Laboratory (Directly realizing the user's reference image!) */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>REFERENCE EFFECT SUITE (1.0 GRAPHIC EFFECTS)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Interactive Liquid Glass & Neomorphic Kit
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Inspect the exact graphic treatments from the Pinterest reference sheet:
              Frosted glass, neumorphism, glow halos, gradient overlays, and bevel chamfers.
            </p>
          </div>

          {/* Interactive Live Tuners */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Blur:</span>
              <input
                type="range"
                min="8"
                max="40"
                value={glassBlur}
                onChange={(e) => setGlassBlur(Number(e.target.value))}
                className="w-20 accent-slate-800"
              />
              <span className="font-mono text-[11px] text-slate-700 w-8">{glassBlur}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Opacity:</span>
              <input
                type="range"
                min="30"
                max="95"
                value={glassOpacity}
                onChange={(e) => setGlassOpacity(Number(e.target.value))}
                className="w-20 accent-slate-800"
              />
              <span className="font-mono text-[11px] text-slate-700 w-8">{glassOpacity}%</span>
            </div>
          </div>
        </div>

        {/* 8 Graphic Effects Grid */}
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
                  isActive ? 'ring-2 ring-slate-900 shadow-md' : 'bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {/* Visual Swatch Demo */}
                <div 
                  className="w-full h-24 rounded-xl flex items-center justify-center transition-all"
                  style={eff.style}
                >
                  <span className="text-xs font-bold text-slate-800 drop-shadow-xs">
                    {eff.title.split('. ')[1]}
                  </span>
                </div>

                {/* Details */}
                <div className="pt-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>{eff.title}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-slate-900" />}
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

      {/* Design System Foundations: Typography & Color Harmony */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: 60-30-10 Color Architecture */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>60-30-10 Color System</span>
          </div>
          <p className="text-xs text-slate-600">
            Disciplined allocation preventing rainbow clutter while maintaining warm tactile presence.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">60% Canvas & Neutral</span>
              <span className="font-mono text-slate-500">#F8F9FA / Travertine</span>
            </div>
            <div className="h-3 rounded-md bg-[#F8F9FA] border border-slate-300 w-full" />

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-medium">30% Frosted Surfaces</span>
              <span className="font-mono text-slate-500">rgba(255,255,255,0.75)</span>
            </div>
            <div className="h-3 rounded-md bg-white/75 border border-white shadow-xs w-full" />

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600 font-medium">10% Accent Points</span>
              <span className="font-mono text-slate-500">#0F172A Slate & #059669 Emerald</span>
            </div>
            <div className="h-3 rounded-md bg-gradient-to-r from-slate-900 via-emerald-600 to-amber-500 w-full" />
          </div>
        </div>

        {/* Card 2: Typographic Hierarchy */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Typographic Scale & Numerals</span>
          </div>
          <p className="text-xs text-slate-600">
            Plus Jakarta Sans paired with tabular figures for financial loan data.
          </p>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[11px] text-slate-600">Display Face (Headline)</span>
              <p className="text-base font-extrabold text-slate-900 tracking-tight">Plus Jakarta Sans 800</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-600">Body Prose</span>
              <p className="text-xs font-normal text-slate-700 leading-normal">Clean 14px regular with optimal 1.6 line height</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-600">Financial Metrics (Tabular)</span>
              <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">€14,250,000 · 3.42% p.a.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Anti-Slop Discipline & Zero-Pill */}
        <div className="glass-panel p-6 rounded-2xl border border-white/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span>Anti-AI-Slop Restraint</span>
          </div>
          <p className="text-xs text-slate-600">
            Zero decorative pill sandwiches, no code comment headers, and authentic German mortgage logic.
          </p>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Unboxed metadata with typographic dots (·)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Single-level card elevation to prevent visual fatigue</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Sub-200ms motion budget with spring damping</span>
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
                <p className="text-sm text-slate-300">{lightboxImage.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {lightboxImage.designNotes.map((note, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-slate-200">
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
