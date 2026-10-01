import React, { useState } from "react";
import {
  EmailTemplate,
  TaskTrigger,
  LeadTask,
  Brokerage,
  PipelineStage,
} from "../types";
import { soundManager } from "../utils/audio";
import {
  Mail,
  Clock,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  AlertCircle,
  Check,
  Send,
  Sliders,
  ChevronRight,
} from "lucide-react";

interface AdminAutomationsProps {
  emailTemplates: EmailTemplate[];
  onUpdateEmailTemplate: (tpl: EmailTemplate) => void;
  onAddEmailTemplate: (tpl: EmailTemplate) => void;
  taskTriggers: TaskTrigger[];
  onAddTaskTrigger: (trig: TaskTrigger) => void;
  tasks: LeadTask[];
  onCompleteTask: (taskId: string) => void;
  activeBrokerage: Brokerage;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New Inbound",
  contacted: "Contacted",
  doc_gathering: "Doc Gathering",
  bank_underwriting: "Bank Underwriting",
  offer_received: "Offer Received",
  won: "Won / Signed",
  lost: "Lost / Disqualified",
};

export const AdminAutomations: React.FC<AdminAutomationsProps> = ({
  emailTemplates,
  onUpdateEmailTemplate,
  onAddEmailTemplate,
  taskTriggers,
  onAddTaskTrigger,
  tasks,
  onCompleteTask,
  activeBrokerage,
}) => {
  const [activeTab, setActiveTab] = useState<"emails" | "triggers" | "tasks">(
    "emails",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(
    emailTemplates[0],
  );
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editedSubject, setEditedSubject] = useState(selectedTemplate.subject);
  const [editedBody, setEditedBody] = useState(selectedTemplate.body);

  // New task trigger form state
  const [newTriggerStage, setNewTriggerStage] = useState<PipelineStage>("new");
  const [newTriggerTitle, setNewTriggerTitle] = useState("");
  const [newTriggerSla, setNewTriggerSla] = useState(2);

  const tenantTemplates = emailTemplates.filter(
    (t) => t.brokerageId === activeBrokerage.id,
  );
  const tenantTriggers = taskTriggers.filter(
    (t) => t.brokerageId === activeBrokerage.id,
  );
  const tenantTasks = tasks.filter((t) => t.brokerageId === activeBrokerage.id);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    soundManager.playClick();
    setSelectedTemplate(tpl);
    setEditedSubject(tpl.subject);
    setEditedBody(tpl.body);
    setIsEditingTemplate(false);
  };

  const handleSaveTemplate = () => {
    soundManager.playSuccess();
    const updated = {
      ...selectedTemplate,
      subject: editedSubject,
      body: editedBody,
    };
    onUpdateEmailTemplate(updated);
    setSelectedTemplate(updated);
    setIsEditingTemplate(false);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    soundManager.playClick();
    setEditedBody((prev) => prev + " " + placeholder);
  };

  const handleCreateTaskTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerTitle.trim()) return;
    soundManager.playSuccess();
    const newTrig: TaskTrigger = {
      id: `trig-${Date.now()}`,
      brokerageId: activeBrokerage.id,
      stage: newTriggerStage,
      title: newTriggerTitle.trim(),
      slaHours: newTriggerSla,
      assigneeRole: "advisor",
    };
    onAddTaskTrigger(newTrig);
    setNewTriggerTitle("");
  };

  // Preview replacement of placeholders for demonstration
  const previewEmailBody = (body: string) => {
    return body
      .replace(/{{client_name}}/g, "Olivia Martin")
      .replace(/{{advisor_name}}/g, "Alex Carter")
      .replace(/{{brokerage_name}}/g, activeBrokerage.name)
      .replace(/{{property_city}}/g, "Berlin-Prenzlauer Berg")
      .replace(/{{portal_url}}/g, "https://leadflow.de/portal/auth-token-8812")
      .replace(/{{loan_amount}}/g, "€520,000");
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-white/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <h2 className="text-xl font-bold text-slate-900">
              Brokerage Automations & Email Triggers
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure stage email templates with dynamic variable insertion,
            stage triggers, and column SLA tasks that notify advisors
            automatically.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/50 rounded-xl border border-white/80">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab("emails");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "emails"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Email Templates ({tenantTemplates.length})
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab("triggers");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "triggers"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Column Task Triggers ({tenantTriggers.length})
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab("tasks");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "tasks"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active Task Queue ({tenantTasks.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EMAIL TEMPLATES */}
      {activeTab === "emails" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900">
              Configured Stage Templates
            </span>
            <div className="space-y-2">
              {tenantTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplate.id === tpl.id
                      ? "glass-panel ring-2 ring-slate-900 shadow-xs"
                      : "bg-white/80 hover:bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {tpl.name}
                    </span>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {STAGE_LABELS[tpl.triggerStage]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Subject: {tpl.subject}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Template Editor / Preview (2 Cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedTemplate.name}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Trigger: Automatically sent when lead moves to{" "}
                  <strong>{STAGE_LABELS[selectedTemplate.triggerStage]}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isEditingTemplate ? (
                  <button
                    onClick={handleSaveTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setIsEditingTemplate(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Template</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Placeholders Bar */}
            {isEditingTemplate && (
              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Click to insert placeholder into email body:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.availablePlaceholders.map((ph, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertPlaceholder(ph)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 font-mono text-[11px] text-slate-800 transition-colors cursor-pointer"
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Email Subject Line
              </label>
              {isEditingTemplate ? (
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              ) : (
                <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900">
                  {selectedTemplate.subject}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Email Body & Placeholders
              </label>
              {isEditingTemplate ? (
                <textarea
                  rows={8}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedTemplate.body}
                </div>
              )}
            </div>

            {/* Live Substituted Preview */}
            <div className="border-t border-slate-200/80 pt-3 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Live Message Preview (Sample client: Olivia Martin):
              </span>
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap shadow-xs">
                {previewEmailBody(selectedTemplate.body)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLUMN TASK TRIGGERS */}
      {activeTab === "triggers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create New Trigger Form */}
          <form
            onSubmit={handleCreateTaskTrigger}
            className="glass-panel p-5 rounded-2xl border border-white/80 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">
              Create Pipeline Column Task Trigger
            </h3>
            <p className="text-xs text-slate-500">
              When an expat lead lands in this column, automatically create this
              task with an advisor SLA.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Pipeline Column Stage
              </label>
              <select
                value={newTriggerStage}
                onChange={(e) =>
                  setNewTriggerStage(e.target.value as PipelineStage)
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Task Title & Directive
              </label>
              <input
                type="text"
                placeholder="e.g. Call within 2 hours & verify Blue Card..."
                value={newTriggerTitle}
                onChange={(e) => setNewTriggerTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                SLA Due Duration (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={newTriggerSla}
                onChange={(e) => setNewTriggerSla(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Column Trigger</span>
            </button>
          </form>

          {/* Active Triggers List */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-bold text-slate-900">
              Active Column Triggers ({tenantTriggers.length})
            </span>
            <div className="space-y-2">
              {tenantTriggers.map((trig) => (
                <div
                  key={trig.id}
                  className="glass-panel p-4 rounded-xl border border-white/80 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {STAGE_LABELS[trig.stage]}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {trig.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Assigned to: Lead's Mortgage Advisor</span>
                      <span>·</span>
                      <span className="font-mono">
                        SLA: {trig.slaHours} Hours
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    Active Trigger
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE TASK QUEUE (Requirement 10: overdue tasks stand out) */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Live Advisor Task Queue ({tenantTasks.length} Assigned)
            </span>
            <span className="text-xs text-slate-500">
              Overdue tasks are highlighted with high-priority crimson border
            </span>
          </div>

          <div className="space-y-2">
            {tenantTasks.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  t.isCompleted
                    ? "bg-slate-50/70 border-slate-200 opacity-60"
                    : t.isOverdue
                      ? "bg-rose-50/90 border-2 border-rose-400 shadow-md"
                      : "glass-panel border-white/80 shadow-xs"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {t.isOverdue && !t.isCompleted && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-600 text-white animate-pulse">
                        OVERDUE SLA
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900">
                      {t.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span>
                      Lead: <strong>{t.leadName}</strong>
                    </span>
                    <span>·</span>
                    <span>Advisor: {t.assignedToAdvisor}</span>
                    <span>·</span>
                    <span
                      className={`font-mono font-semibold ${t.isOverdue && !t.isCompleted ? "text-rose-700" : "text-slate-600"}`}
                    >
                      Due: {t.dueAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!t.isCompleted ? (
                    <button
                      onClick={() => {
                        soundManager.playSuccess();
                        onCompleteTask(t.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
