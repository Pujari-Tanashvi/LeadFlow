import React from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from "lucide-react";

/**
 * Shared loading / error / empty surfaces. They reuse the same glass panel,
 * typography and spacing tokens as the rest of the workspace so the states feel
 * native to the existing design rather than bolted on.
 */

export const LoadingPanel: React.FC<{ label?: string; className?: string }> = ({
  label = "Loading workspace data…",
  className = "",
}) => (
  <div
    role="status"
    aria-live="polite"
    className={`glass-panel rounded-2xl border border-white/80 shadow-xs p-6 flex items-center gap-3 ${className}`}
  >
    <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">
        Reading live data from the LeadFlow API for your brokerage.
      </p>
    </div>
  </div>
);

export const ErrorPanel: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title = "Something went wrong", message, onRetry, className = "" }) => (
  <div
    role="alert"
    className={`glass-panel rounded-2xl border border-rose-200/80 shadow-xs p-6 flex items-start gap-3 ${className}`}
  >
    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-600 mt-1 break-words">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
    </div>
  </div>
);

export const EmptyPanel: React.FC<{
  title: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, message, action, className = "" }) => (
  <div
    className={`glass-panel rounded-2xl border border-white/80 shadow-xs p-8 text-center ${className}`}
  >
    <div className="w-10 h-10 mx-auto rounded-xl bg-white/70 border border-white/80 flex items-center justify-center">
      <Inbox className="w-4 h-4 text-slate-500" />
    </div>
    <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
    <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">{message}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

/** Slim inline banner used for action failures and live-sync notices. */
export const InlineBanner: React.FC<{
  tone?: "error" | "info" | "success";
  message: string;
  onDismiss?: () => void;
  className?: string;
}> = ({ tone = "info", message, onDismiss, className = "" }) => {
  const tones = {
    error: "bg-rose-50/80 border-rose-200 text-rose-800",
    info: "bg-blue-50/80 border-blue-200 text-blue-800",
    success: "bg-emerald-50/80 border-emerald-200 text-emerald-800",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${tones[tone]} ${className}`}
    >
      <span className="flex-1 min-w-0 break-words">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/** Full-viewport splash used while the session is being restored. */
export const SplashScreen: React.FC<{ label?: string }> = ({
  label = "Restoring your LeadFlow session…",
}) => (
  <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans flex items-center justify-center p-6 relative overflow-hidden">
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 left-1/5 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[140px]" />
      <div className="absolute bottom-0 right-1/3 w-[550px] h-[550px] bg-indigo-100/25 rounded-full blur-[130px]" />
    </div>
    <div className="glass-panel rounded-3xl border border-white/80 shadow-lg p-8 flex items-center gap-3 max-w-sm">
      <Loader2 className="w-4 h-4 text-slate-600 animate-spin shrink-0" />
      <p className="text-sm font-semibold text-slate-900">{label}</p>
    </div>
  </div>
);
