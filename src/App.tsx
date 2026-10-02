import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import {
  Lead,
  DocumentItem,
  EmailTemplate,
  TaskTrigger,
  tabsForRole,
  type UserRole,
  type WorkspaceTab,
} from "./types";
import { soundManager } from "./utils/audio";
import { Navigation } from "./components/Navigation";
import { DesignShowcase } from "./components/DesignShowcase";
import { PipelineBoard } from "./components/PipelineBoard";
import { DocumentVerificationHub } from "./components/DocumentVerificationHub";
import { DashboardAnalytics } from "./components/DashboardAnalytics";
import { AdminAutomations } from "./components/AdminAutomations";
import { ClientPortal } from "./components/ClientPortal";
import { LeadIngestionModal } from "./components/LeadIngestionModal";
import { LeadDetailsModal } from "./components/LeadDetailsModal";
import { LoginScreen } from "./components/LoginScreen";
import {
  EmptyPanel,
  ErrorPanel,
  InlineBanner,
  LoadingPanel,
  SplashScreen,
} from "./components/StatusStates";

/**
 * The approved workspace, now bound to the real LeadFlow API.
 *
 * Only the data source changed: the layout, components, typography and motion
 * are exactly the approved UI. Session, tenancy, permissions and every figure
 * come from the API through the service layer, and live updates arrive over the
 * authenticated Socket.IO channel.
 */
export default function App() {
  const auth = useAuth();

  if (auth.status === "initialising") {
    return <SplashScreen />;
  }

  if (auth.status === "anonymous") {
    return (
      <LoginScreen
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        isSubmitting={auth.isSubmitting}
        error={auth.error}
        onDismissError={auth.clearError}
      />
    );
  }

  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  );
}

const SHELL_PADDING = "py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4";

/** A tiny, valid PDF so the intake simulators upload a real file to the API. */
function sampleDocumentFile(name: string): File {
  const body = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
  ].join("\n");
  return new File([body], `${name.replace(/\s+/g, "_")}.pdf`, {
    type: "application/pdf",
  });
}

function Workspace() {
  const { user, permissions, signOut } = useAuth();
  const {
    leads,
    documents,
    tasks,
    emailTemplates,
    brokerage,
    advisors,
    clients,
    taskTriggers,
    isLoading,
    error,
    actionError,
    lastEvent,
    socketStatus,
    liveSyncEnabled,
    setLiveSyncEnabled,
    isEmpty,
    refresh,
    clearActionError,
    reportActionError,
    moveLead,
    ingestLead,
    convertLead,
    completeTask,
    addTask,
    saveTemplate,
    addTemplate,
    updateDocument,
    addDocument,
  } = useWorkspace();

  const role = (user?.role ?? "advisor") as UserRole;
  const allowedTabs = useMemo(() => tabsForRole(role), [role]);

  const [currentTab, setCurrentTab] = useState<WorkspaceTab>(
    () => tabsForRole(role)[0],
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [selectedLeadForDossier, setSelectedLeadForDossier] =
    useState<Lead | null>(null);

  // The role comes from the account, so the visible tab must follow it.
  useEffect(() => {
    if (!allowedTabs.includes(currentTab)) {
      setCurrentTab(allowedTabs[0]);
    }
  }, [allowedTabs, currentTab]);

  const applySoundPreference = (next: boolean) => {
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
    if (next) soundManager.playClick();
  };

  const handleMoveLead = async (leadId: string, stage: Lead["stage"]) => {
    await moveLead(leadId, stage);
  };

  const handleConvertToClient = async (leadId: string) => {
    await convertLead(leadId);
  };

  const handleIngestLead = async (lead: Lead) => {
    await ingestLead(
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        propertyType: lead.propertyType ?? "Apartment",
        nationality: lead.nationality === "—" ? "" : lead.nationality,
        targetCity: lead.targetCity === "—" ? "" : lead.targetCity,
        employmentStatus:
          lead.employmentStatus === "—" ? "" : lead.employmentStatus,
        propertyPriceEur: lead.propertyPriceEur || null,
        loanAmount: lead.loanAmountEur,
        assignedAdvisor: lead.assignedAdvisorId || null,
      },
      { createAnyway: Boolean(lead.duplicateInfo?.isDuplicate) },
    );
    setCurrentTab("pipeline");
  };

  const handleAddTaskTrigger = async (trigger: TaskTrigger) => {
    await addTask({
      title: trigger.title,
      dueDate: new Date(Date.now() + trigger.slaHours * 3600 * 1000).toISOString(),
      priority: "Medium",
      assignedAdvisor: user?.role === "advisor" ? user.id : null,
    });
  };

  const clientIdForLead = (leadId: string): string | null => {
    const match = leads.find((lead) => lead.id === leadId);
    return match?.clientId ?? null;
  };

  const handleAddDocument = async (document: DocumentItem) => {
    const clientId = clientIdForLead(document.leadId);
    if (!clientId) {
      reportActionError(
        "Documents belong to a client dossier. Convert this lead into a client first.",
      );
      return;
    }
    await addDocument({
      clientId,
      documentType: document.category,
      file: sampleDocumentFile(document.name),
    });
  };

  const handleClientUpload = async (
    docName: string,
    category: DocumentItem["category"],
  ) => {
    const clientId = clientPortalLead?.clientId ?? null;
    if (!clientId) {
      reportActionError(
        "No client dossier is linked to this account yet. Your advisor will create it.",
      );
      return;
    }
    await addDocument({
      clientId,
      documentType: category,
      file: sampleDocumentFile(docName),
    });
  };

  /** The dossier shown in the client portal. */
  const clientPortalLead = useMemo<Lead | null>(() => {
    if (!user) return null;
    if (permissions.isClient) {
      const clientId = documents[0]?.leadId ?? "";
      return {
        id: clientId || "client-dossier",
        brokerageId: user.brokerageId ?? "",
        name: user.fullName,
        email: user.email,
        phone: "",
        nationality: "—",
        targetCity: "—",
        loanAmountEur: 0,
        propertyPriceEur: 0,
        employmentStatus: "—",
        source: "Client Portal",
        stage: "doc_gathering",
        assignedAdvisorId: "",
        createdAt: "—",
        updatedAt: "—",
        isClient: true,
        clientId: clientId || null,
        notesCount: 0,
      };
    }
    return clients[0] ?? null;
  }, [clients, documents, permissions.isClient, user]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans flex flex-col relative selection:bg-rose-500/20 selection:text-slate-900">
      {/* Existing workspace background effects */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/5 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 w-[550px] h-[550px] bg-indigo-100/25 rounded-full blur-[130px]" />
      </div>

      {/* Top Bar Navigation */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={role}
        activeBrokerage={brokerage}
        brokerages={[brokerage]}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={applySoundPreference}
        liveSyncActive={liveSyncEnabled}
        setLiveSyncActive={setLiveSyncEnabled}
        availableTabs={allowedTabs}
        accountLabel={user ? `${user.fullName} · ${user.email}` : undefined}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className={SHELL_PADDING}>
            <LoadingPanel />
          </div>
        ) : permissions.isPlatformAdmin ? (
          <div className={SHELL_PADDING}>
            <EmptyPanel
              title="No brokerage is attached to this account"
              message="Every lead, client, document and task is isolated per brokerage, so a platform administrator has no tenant data to display. Sign in with a brokerage admin, advisor or client account to open a workspace."
            />
          </div>
        ) : (
          <>
            {error && (
              <div className={SHELL_PADDING}>
                <ErrorPanel
                  title="Some workspace data could not be loaded"
                  message={error}
                  onRetry={refresh}
                />
              </div>
            )}

            {actionError && (
              <div className={SHELL_PADDING}>
                <InlineBanner
                  tone="error"
                  message={actionError}
                  onDismiss={clearActionError}
                />
              </div>
            )}

            {isEmpty && !permissions.isClient && (
              <div className={SHELL_PADDING}>
                <EmptyPanel
                  title={`No ${brokerage.name} data yet`}
                  message="Nothing has been created for your brokerage yet. Ingest your first lead to populate the pipeline, documents and automations."
                  action={
                    permissions.canIngestLeads ? (
                      <button
                        onClick={() => setIsIngestModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <span>Simulate inbound lead</span>
                      </button>
                    ) : undefined
                  }
                />
              </div>
            )}

            {currentTab === "showcase" && (
              <DesignShowcase
                onExploreLivePipeline={() => setCurrentTab("pipeline")}
                onExploreDocuments={() => setCurrentTab("documents")}
                onViewDashboard={() => setCurrentTab("showcase")}
              />
            )}

            {currentTab === "pipeline" && permissions.canViewWorkspace && (
              <PipelineBoard
                leads={leads}
                activeBrokerage={brokerage}
                onMoveLead={handleMoveLead}
                onConvertToClient={handleConvertToClient}
                onOpenLeadDetails={(lead) => setSelectedLeadForDossier(lead)}
                lastSimulatedEvent={lastEvent}
              />
            )}

            {currentTab === "documents" && (
              <DocumentVerificationHub
                documents={documents}
                leads={leads}
                activeBrokerage={brokerage}
                onUpdateDocument={updateDocument}
                onAddDocument={handleAddDocument}
              />
            )}

            {currentTab === "analytics" && permissions.canViewWorkspace && (
              <DashboardAnalytics
                activeBrokerage={brokerage}
                leads={leads}
                tasks={tasks}
              />
            )}

            {currentTab === "automations" && permissions.canViewWorkspace && (
              <AdminAutomations
                emailTemplates={emailTemplates}
                onUpdateEmailTemplate={saveTemplate}
                onAddEmailTemplate={addTemplate}
                taskTriggers={taskTriggers}
                onAddTaskTrigger={handleAddTaskTrigger}
                tasks={tasks}
                onCompleteTask={completeTask}
                activeBrokerage={brokerage}
              />
            )}

            {currentTab === "client_portal" &&
              (clientPortalLead ? (
                <ClientPortal
                  currentClient={clientPortalLead}
                  documents={documents}
                  brokerage={brokerage}
                  advisors={advisors}
                  onUploadDocument={handleClientUpload}
                />
              ) : (
                <div className={SHELL_PADDING}>
                  <EmptyPanel
                    title="No client dossier yet"
                    message="A client portal appears here once a lead has been converted into a client. Your advisor creates the dossier and links it to your account."
                  />
                </div>
              ))}
          </>
        )}
      </main>

      {/* Inbound Lead Ingestion Modal */}
      <LeadIngestionModal
        isOpen={isIngestModalOpen && permissions.canIngestLeads}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestLead={handleIngestLead}
        activeBrokerage={brokerage}
        existingLeads={leads}
      />

      {/* Lead Dossier Modal */}
      <LeadDetailsModal
        lead={selectedLeadForDossier}
        onClose={() => setSelectedLeadForDossier(null)}
        onConvertToClient={handleConvertToClient}
        documents={documents}
        tasks={tasks}
        brokerage={brokerage}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/50 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">LeadFlow</span>
            <span>·</span>
            <span>Multi-Tenant Mortgage & Document Platform</span>
            <span>·</span>
            <span>Built for Mortgage Brokerages</span>
          </div>
          <div className="flex items-center gap-4">
            <span>LeadFlow Mortgage Workspace</span>
            <span>·</span>
            <span>Active Tenant: {brokerage.name}</span>
            <span>·</span>
            <span>Live sync: {liveSyncEnabled ? socketStatus : "paused"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}



