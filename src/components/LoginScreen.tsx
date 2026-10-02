import React, { useState } from "react";
import { motion } from "motion/react";
import { Building2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import type { RegisterInput } from "../services/authService";

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onSignUp: (input: RegisterInput) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
  onDismissError: () => void;
}

type Mode = "signin" | "signup";

const fieldClass =
  "w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20";

/**
 * Sign-in / sign-up gate for the workspace. It reuses the approved glass
 * panel, palette and typography so the authenticated app is unchanged.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  onSignUp,
  isSubmitting,
  error,
  onDismissError,
}) => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [brokerageName, setBrokerageName] = useState("");

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 8 &&
    (mode === "signin" ||
      (fullName.trim().length > 1 && brokerageName.trim().length > 1));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    if (mode === "signin") {
      await onSignIn(email.trim(), password);
      return;
    }
    await onSignUp({
      brokerageName: brokerageName.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/5 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 w-[550px] h-[550px] bg-indigo-100/25 rounded-full blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-white/50">
            LF
          </div>
          <div className="text-left">
            <p className="text-lg font-bold tracking-tight text-slate-900">LeadFlow</p>
            <p className="text-xs text-slate-500">Mortgage brokerage workspace</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-3xl border border-white/80 shadow-lg p-6 sm:p-7 space-y-4"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === "signin"
                ? "Sign in to your workspace"
                : "Create a brokerage account"}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {mode === "signin"
                ? "Use your LeadFlow account. Access is scoped to your brokerage."
                : "Registering creates a new brokerage with you as the brokerage admin."}
            </p>
          </div>

          {mode === "signup" && (
            <>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={brokerageName}
                  onChange={(event) => setBrokerageName(event.target.value)}
                  placeholder="Brokerage name"
                  aria-label="Brokerage name"
                  className={fieldClass}
                />
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Full name"
                  aria-label="Full name"
                  className={fieldClass}
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Work email"
              aria-label="Email address"
              autoComplete="email"
              className={fieldClass}
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (min. 8 characters)"
              aria-label="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={fieldClass}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/80 text-xs font-medium text-rose-800"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="flex-1 break-words">{error}</span>
              <button
                type="button"
                onClick={onDismissError}
                className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create brokerage"}
            </span>
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                onDismissError();
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {mode === "signin"
                ? "Need a brokerage account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Multi-tenant isolation: every request is scoped to your brokerage by
          the API.
        </p>
      </motion.div>
    </div>
  );
};
