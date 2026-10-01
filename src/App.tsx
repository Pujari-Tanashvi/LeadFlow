import React, { useState, useEffect } from 'react';
import { 
  BROKERAGES, 
  ADVISORS, 
  INITIAL_LEADS, 
  INITIAL_DOCUMENTS, 
  EMAIL_TEMPLATES, 
  STAGE_TASK_TRIGGERS, 
  INITIAL_TASKS 
} from './data/mockData';
import { 
  Brokerage, 
  Advisor, 
  Lead, 
  DocumentItem, 
  EmailTemplate, 
  TaskTrigger, 
  LeadTask, 
  UserRole, 
  PipelineStage 
} from './types';
import { soundManager } from './utils/audio';
import { Navigation } from './components/Navigation';
import { DesignShowcase } from './components/DesignShowcase';
import { PipelineBoard } from './components/PipelineBoard';
import { DocumentVerificationHub } from './components/DocumentVerificationHub';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { AdminAutomations } from './components/AdminAutomations';
import { ClientPortal } from './components/ClientPortal';
import { LeadIngestionModal } from './components/LeadIngestionModal';
import { LeadDetailsModal } from './components/LeadDetailsModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'showcase' | 'pipeline' | 'documents' | 'analytics' | 'automations' | 'client_portal'>('showcase');
  const [activeRole, setActiveRole] = useState<UserRole>('advisor');
  const [brokerages, setBrokerages] = useState<Brokerage[]>(BROKERAGES);
  const [activeBrokerage, setActiveBrokerage] = useState<Brokerage>(BROKERAGES[0]);
  
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES);
  const [taskTriggers, setTaskTriggers] = useState<TaskTrigger[]>(STAGE_TASK_TRIGGERS);
  const [tasks, setTasks] = useState<LeadTask[]>(INITIAL_TASKS);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [liveSyncActive, setLiveSyncActive] = useState(true);
  const [lastSimulatedEvent, setLastSimulatedEvent] = useState<string | null>('Connected to Live WebSocket Stream (wss://api.leadflow.de/brokerage-berlin)');
  
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [selectedLeadForDossier, setSelectedLeadForDossier] = useState<Lead | null>(null);

  // Requirement 3: Live sync on every screen when anything changes (simulated WebSocket stream)
  useEffect(() => {
    if (!liveSyncActive) {
      setLastSimulatedEvent(null);
      return;
    }

    const syncMessages = [
      'WebSocket: Advisor Elena Rostova updated case dossier for Sophie Dubois',
      'WebSocket: Commerzbank digital underwriting ping returned positive rating',
      'WebSocket: New inbound lead inquiry received from Typeform German expat hub',
      'WebSocket: ING Deutschland updated 10-year fixed rate benchmark to 3.38%',
      'WebSocket: Background OCR engine finished indexing salary statements'
    ];

    const interval = setInterval(() => {
      const msg = syncMessages[Math.floor(Math.random() * syncMessages.length)];
      setLastSimulatedEvent(msg);
    }, 12000);

    return () => clearInterval(interval);
  }, [liveSyncActive]);

  // Lead movement across stages
  const handleMoveLead = (leadId: string, newStage: PipelineStage) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          stage: newStage,
          updatedAt: 'Just now'
        };
      }
      return l;
    }));

    // Find trigger tasks for this stage
    const matchingTrigger = taskTriggers.find(t => t.brokerageId === activeBrokerage.id && t.stage === newStage);
    const movedLead = leads.find(l => l.id === leadId);
    if (matchingTrigger && movedLead) {
      const newTask: LeadTask = {
        id: `task-${Date.now()}`,
        leadId: movedLead.id,
        leadName: movedLead.name,
        brokerageId: activeBrokerage.id,
        title: matchingTrigger.title,
        stage: newStage,
        assignedToAdvisor: 'Lukas Becker',
        dueAt: `In ${matchingTrigger.slaHours} hours`,
        isOverdue: false,
        isCompleted: false
      };
      setTasks(prev => [newTask, ...prev]);
    }
  };

  // Convert lead to client (Requirement 5)
  const handleConvertToClient = (leadId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          isClient: true,
          stage: l.stage === 'new' ? 'doc_gathering' : l.stage,
          updatedAt: 'Just now'
        };
      }
      return l;
    }));

    const convertedLead = leads.find(l => l.id === leadId);
    if (convertedLead) {
      // Seed required document items for the new client
      const newClientDocs: DocumentItem[] = [
        {
          id: `doc-${Date.now()}-1`,
          leadId: convertedLead.id,
          brokerageId: activeBrokerage.id,
          name: 'Last 3 German Payslips (Gehaltsabrechnungen)',
          category: 'Income Proof',
          status: 'not_uploaded',
          progress: 0,
          required: true
        },
        {
          id: `doc-${Date.now()}-2`,
          leadId: convertedLead.id,
          brokerageId: activeBrokerage.id,
          name: 'Schufa Bonitätsauskunft (Credit Record)',
          category: 'Credit Rating',
          status: 'not_uploaded',
          progress: 0,
          required: true
        },
        {
          id: `doc-${Date.now()}-3`,
          leadId: convertedLead.id,
          brokerageId: activeBrokerage.id,
          name: 'German Residence Permit or EU Passport',
          category: 'Identification',
          status: 'not_uploaded',
          progress: 0,
          required: true
        }
      ];
      setDocuments(prev => [...prev, ...newClientDocs]);
    }
  };

  // Document management
  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Client Portal upload
  const handleClientUpload = (docName: string, category: DocumentItem['category']) => {
    const currentClient = leads.find(l => l.isClient && l.brokerageId === activeBrokerage.id) || leads[0];
    const newDoc: DocumentItem = {
      id: `doc-client-${Date.now()}`,
      leadId: currentClient.id,
      brokerageId: activeBrokerage.id,
      name: docName,
      category,
      fileName: `${docName.replace(/\s+/g, '_')}_Upload.pdf`,
      fileSize: '4.2 MB',
      uploadedAt: 'Just now',
      status: 'analyzing',
      progress: 25,
      required: true
    };
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Ingest lead from webhook simulator
  const handleIngestLead = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
    // Create new inbound task
    const newTask: LeadTask = {
      id: `task-ingested-${Date.now()}`,
      leadId: newLead.id,
      leadName: newLead.name,
      brokerageId: activeBrokerage.id,
      title: 'Call lead within 2 hours & verify expat residency status',
      stage: 'new',
      assignedToAdvisor: 'Lukas Becker',
      dueAt: 'In 2 hours',
      isOverdue: false,
      isCompleted: false
    };
    setTasks(prev => [newTask, ...prev]);
    setCurrentTab('pipeline');
  };

  // Tasks
  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: true } : t));
  };

  // Email Templates
  const handleUpdateEmailTemplate = (tpl: EmailTemplate) => {
    setEmailTemplates(prev => prev.map(t => t.id === tpl.id ? tpl : t));
  };

  const handleAddEmailTemplate = (tpl: EmailTemplate) => {
    setEmailTemplates(prev => [tpl, ...prev]);
  };

  // Task Triggers
  const handleAddTaskTrigger = (trig: TaskTrigger) => {
    setTaskTriggers(prev => [trig, ...prev]);
  };

  // Current Client for Client Portal view
  const activeClientLead = leads.find(l => l.brokerageId === activeBrokerage.id && l.isClient) || leads.find(l => l.brokerageId === activeBrokerage.id) || leads[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans flex flex-col relative selection:bg-rose-500/20 selection:text-slate-900">
      
      {/* Dynamic Background Ambient Light Gradients matching Pinterest reference */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/5 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 w-[550px] h-[550px] bg-indigo-100/25 rounded-full blur-[130px]" />
      </div>

      {/* Top Bar Navigation */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        activeBrokerage={activeBrokerage}
        setActiveBrokerage={setActiveBrokerage}
        brokerages={brokerages}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        liveSyncActive={liveSyncActive}
        setLiveSyncActive={setLiveSyncActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'showcase' && (
          <DesignShowcase
            onExploreLivePipeline={() => setCurrentTab('pipeline')}
            onExploreDocuments={() => setCurrentTab('documents')}
            onViewDashboard={() => setCurrentTab('showcase')}
          />
        )}

        {currentTab === 'pipeline' && (
          <PipelineBoard
            leads={leads}
            activeBrokerage={activeBrokerage}
            onMoveLead={handleMoveLead}
            onConvertToClient={handleConvertToClient}
            onOpenLeadDetails={(lead) => setSelectedLeadForDossier(lead)}
            lastSimulatedEvent={lastSimulatedEvent}
          />
        )}

        {currentTab === 'documents' && (
          <DocumentVerificationHub
            documents={documents}
            leads={leads}
            activeBrokerage={activeBrokerage}
            onUpdateDocument={handleUpdateDocument}
            onAddDocument={handleAddDocument}
          />
        )}

        {currentTab === 'analytics' && (
          <DashboardAnalytics
            activeBrokerage={activeBrokerage}
            leads={leads}
            tasks={tasks}
          />
        )}

        {currentTab === 'automations' && (
          <AdminAutomations
            emailTemplates={emailTemplates}
            onUpdateEmailTemplate={handleUpdateEmailTemplate}
            onAddEmailTemplate={handleAddEmailTemplate}
            taskTriggers={taskTriggers}
            onAddTaskTrigger={handleAddTaskTrigger}
            tasks={tasks}
            onCompleteTask={handleCompleteTask}
            activeBrokerage={activeBrokerage}
          />
        )}

        {currentTab === 'client_portal' && (
          <ClientPortal
            currentClient={activeClientLead}
            documents={documents}
            brokerage={activeBrokerage}
            advisors={ADVISORS}
            onUploadDocument={handleClientUpload}
          />
        )}
      </main>

      {/* Inbound Lead Ingestion Modal (Requirement 2 & 4) */}
      <LeadIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestLead={handleIngestLead}
        activeBrokerage={activeBrokerage}
        existingLeads={leads.filter(l => l.brokerageId === activeBrokerage.id)}
      />

      {/* Lead Dossier Modal */}
      <LeadDetailsModal
        lead={selectedLeadForDossier}
        onClose={() => setSelectedLeadForDossier(null)}
        onConvertToClient={handleConvertToClient}
        documents={documents}
        tasks={tasks}
        brokerage={activeBrokerage}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/50 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">LeadFlow</span>
            <span>·</span>
            <span>Multi-Tenant Mortgage & Document Platform</span>
            <span>·</span>
            <span>Built for German Expat Brokerages</span>
          </div>
          <div className="flex items-center gap-4">
            <span>LeadFlow Mortgage Workspace</span>
            <span>·</span>
            <span>Active Tenant: {activeBrokerage.name}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
