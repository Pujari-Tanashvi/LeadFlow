import { Brokerage, Advisor, Lead, DocumentItem, EmailTemplate, TaskTrigger, LeadTask, DesignShowcaseItem } from '../types';

export const BROKERAGES: Brokerage[] = [
  {
    id: 'brokerage-berlin',
    name: 'Berlin Expat Hypotheken GmbH',
    city: 'Berlin',
    licenseNumber: 'DE-BAFIN-77192',
    activeAdvisors: 4,
    totalLeads: 28,
    monthlyVolumeEur: 14250000,
    logoInitials: 'BE',
    color: '#0284C7'
  },
  {
    id: 'brokerage-munich',
    name: 'Bavaria Prime Loans AG',
    city: 'Munich',
    licenseNumber: 'DE-BAFIN-89412',
    activeAdvisors: 3,
    totalLeads: 19,
    monthlyVolumeEur: 18900000,
    logoInitials: 'BP',
    color: '#0D9488'
  },
  {
    id: 'brokerage-frankfurt',
    name: 'Frankfurt Expat Finance Partners',
    city: 'Frankfurt am Main',
    licenseNumber: 'DE-BAFIN-63110',
    activeAdvisors: 5,
    totalLeads: 34,
    monthlyVolumeEur: 22400000,
    logoInitials: 'FE',
    color: '#6366F1'
  }
];

export const ADVISORS: Advisor[] = [
  {
    id: 'adv-1',
    brokerageId: 'brokerage-berlin',
    name: 'Lukas Becker',
    email: 'lukas.becker@berlin-expat-mortgage.de',
    avatar: 'LB',
    role: 'Senior Mortgage Specialist',
    activeCases: 7
  },
  {
    id: 'adv-2',
    brokerageId: 'brokerage-berlin',
    name: 'Elena Rostova',
    email: 'elena.r@berlin-expat-mortgage.de',
    avatar: 'ER',
    role: 'EU & Non-EU Relocation Advisor',
    activeCases: 6
  },
  {
    id: 'adv-3',
    brokerageId: 'brokerage-munich',
    name: 'Maximilian Graf',
    email: 'max.graf@bavaria-loans.de',
    avatar: 'MG',
    role: 'Senior Financing Broker',
    activeCases: 8
  },
  {
    id: 'adv-4',
    brokerageId: 'brokerage-frankfurt',
    name: 'Hannah von Weber',
    email: 'h.weber@frankfurt-expat.de',
    avatar: 'HW',
    role: 'Commercial & Residential Advisor',
    activeCases: 9
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-01',
    brokerageId: 'brokerage-berlin',
    name: 'Dr. Priya Patel',
    email: 'priya.patel@biotech-labs.de',
    phone: '+49 176 4921 8840',
    nationality: 'Indian (EU Blue Card)',
    targetCity: 'Berlin-Prenzlauer Berg',
    loanAmountEur: 520000,
    propertyPriceEur: 650000,
    employmentStatus: 'Blue Card Holder',
    source: 'Typeform Web Form',
    stage: 'new',
    assignedAdvisorId: 'adv-1',
    createdAt: '18 minutes ago',
    updatedAt: 'Just now',
    isClient: false,
    duplicateInfo: {
      isDuplicate: true,
      previousLeadId: 'lead-archived-91',
      reason: 'Matched email address with enquiry from 4 months ago'
    },
    notesCount: 2
  },
  {
    id: 'lead-02',
    brokerageId: 'brokerage-berlin',
    name: 'Liam O’Connor',
    email: 'liam.oc@fintechhub.eu',
    phone: '+49 152 8840 1209',
    nationality: 'Irish (EU Citizen)',
    targetCity: 'Berlin-Mitte',
    loanAmountEur: 440000,
    propertyPriceEur: 510000,
    employmentStatus: 'Employed (Permanent)',
    source: 'Meta Expat Ads',
    stage: 'contacted',
    assignedAdvisorId: 'adv-1',
    createdAt: '2 hours ago',
    updatedAt: '35 mins ago',
    isClient: false,
    notesCount: 4
  },
  {
    id: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Sophie & Marc Dubois',
    email: 'sophie.dubois@aero-corp.fr',
    phone: '+49 170 3349 9211',
    nationality: 'French (Permanent German Contract)',
    targetCity: 'Potsdam / Berlin South',
    loanAmountEur: 680000,
    propertyPriceEur: 820000,
    employmentStatus: 'Employed (Permanent)',
    source: 'Partner Expatica',
    stage: 'doc_gathering',
    assignedAdvisorId: 'adv-2',
    createdAt: '1 day ago',
    updatedAt: '1 hour ago',
    isClient: true,
    notesCount: 8
  },
  {
    id: 'lead-04',
    brokerageId: 'brokerage-berlin',
    name: 'Chen Wei',
    email: 'chen.wei@solardrive.de',
    phone: '+49 160 9923 1184',
    nationality: 'Chinese (German Niederlassungserlaubnis)',
    targetCity: 'Berlin-Charlottenburg',
    loanAmountEur: 390000,
    propertyPriceEur: 460000,
    employmentStatus: 'Employed (Permanent)',
    source: 'Direct Calendly',
    stage: 'bank_underwriting',
    assignedAdvisorId: 'adv-2',
    createdAt: '3 days ago',
    updatedAt: '3 hours ago',
    isClient: true,
    notesCount: 11
  },
  {
    id: 'lead-05',
    brokerageId: 'brokerage-berlin',
    name: 'Matteo Rossi & Sarah Jenkins',
    email: 'rossi.jenkins@designstudio.de',
    phone: '+49 173 1120 4490',
    nationality: 'Italian / British',
    targetCity: 'Berlin-Friedrichshain',
    loanAmountEur: 475000,
    propertyPriceEur: 550000,
    employmentStatus: 'Self-Employed',
    source: 'Typeform Web Form',
    stage: 'offer_received',
    assignedAdvisorId: 'adv-1',
    createdAt: '5 days ago',
    updatedAt: '4 hours ago',
    isClient: true,
    notesCount: 15
  },
  {
    id: 'lead-06',
    brokerageId: 'brokerage-berlin',
    name: 'Dmitri & Anna Voronin',
    email: 'dmitri.v@berlintech.org',
    phone: '+49 151 7729 0041',
    nationality: 'Ukrainian (EU Blue Card)',
    targetCity: 'Berlin-Steglitz',
    loanAmountEur: 590000,
    propertyPriceEur: 710000,
    employmentStatus: 'Employed (Permanent)',
    source: 'Partner Expatica',
    stage: 'won',
    assignedAdvisorId: 'adv-1',
    createdAt: '12 days ago',
    updatedAt: 'Yesterday',
    isClient: true,
    notesCount: 22
  },
  // Leads for Munich tenant
  {
    id: 'lead-m1',
    brokerageId: 'brokerage-munich',
    name: 'Klaus & Anja Lindner',
    email: 'klaus.lindner@automotive-muc.de',
    phone: '+49 171 4402 9912',
    nationality: 'German Expat returning',
    targetCity: 'Munich-Schwabing',
    loanAmountEur: 920000,
    propertyPriceEur: 1250000,
    employmentStatus: 'Civil Servant',
    source: 'Direct Calendly',
    stage: 'doc_gathering',
    assignedAdvisorId: 'adv-3',
    createdAt: '1 day ago',
    updatedAt: '2 hours ago',
    isClient: true,
    notesCount: 6
  },
  // Leads for Frankfurt tenant
  {
    id: 'lead-f1',
    brokerageId: 'brokerage-frankfurt',
    name: 'Alastair Sterling',
    email: 'alastair.s@invest-london-fra.com',
    phone: '+49 179 8812 3341',
    nationality: 'British',
    targetCity: 'Frankfurt-Westend',
    loanAmountEur: 1100000,
    propertyPriceEur: 1450000,
    employmentStatus: 'Employed (Permanent)',
    source: 'Typeform Web Form',
    stage: 'new',
    assignedAdvisorId: 'adv-4',
    createdAt: '45 mins ago',
    updatedAt: '45 mins ago',
    isClient: false,
    notesCount: 1
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Last 3 German Payslips (Gehaltsabrechnungen)',
    category: 'Income Proof',
    fileName: 'Gehaltsabrechnungen_Dubois_Q1.pdf',
    fileSize: '3.4 MB',
    uploadedAt: 'Today at 09:14',
    status: 'approved',
    progress: 100,
    required: true
  },
  {
    id: 'doc-2',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Valid Passport / EU ID Card',
    category: 'Identification',
    fileName: 'Passport_Sophie_Marc.pdf',
    fileSize: '2.1 MB',
    uploadedAt: 'Today at 09:20',
    status: 'approved',
    progress: 100,
    required: true
  },
  {
    id: 'doc-3',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Last 3 Months Bank Statements (Kontoauszüge)',
    category: 'Banking',
    fileName: 'Kontoauszuege_Commerzbank_90d.pdf',
    fileSize: '5.8 MB',
    uploadedAt: 'Today at 10:05',
    status: 'analyzing',
    progress: 68,
    required: true
  },
  {
    id: 'doc-4',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Schufa Bonitätsauskunft (Credit Record)',
    category: 'Credit Rating',
    fileName: 'SCHUFA_Certificate_2026.pdf',
    fileSize: '1.2 MB',
    uploadedAt: 'Today at 10:12',
    status: 'action_needed',
    progress: 100,
    flagReason: 'Certificate is older than 60 days. German partner banks require issued within last 30 days.',
    required: true
  },
  {
    id: 'doc-5',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Permanent Employment Contract (Arbeitsvertrag)',
    category: 'Income Proof',
    fileName: 'Employment_Contract_AeroCorp.pdf',
    fileSize: '4.6 MB',
    uploadedAt: 'Today at 10:15',
    status: 'approved',
    progress: 100,
    required: true
  },
  {
    id: 'doc-6',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Property Exposé & Grundbuchauszug',
    category: 'Property',
    fileName: 'Expose_Potsdam_AmHeiligenSee.pdf',
    fileSize: '14.2 MB',
    uploadedAt: 'Today at 10:40',
    status: 'analyzing',
    progress: 42,
    required: true
  },
  {
    id: 'doc-7',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'German Residence Permit (Aufenthaltstitel)',
    category: 'Identification',
    status: 'not_uploaded',
    progress: 0,
    required: true
  },
  {
    id: 'doc-8',
    leadId: 'lead-03',
    brokerageId: 'brokerage-berlin',
    name: 'Equity Proof / Deposit Certificate (Eigenkapitalnachweis)',
    category: 'Banking',
    status: 'not_uploaded',
    progress: 0,
    required: true
  }
];

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-1',
    brokerageId: 'brokerage-berlin',
    name: 'Immediate Welcome & Expat Mortgage Guide',
    triggerStage: 'new',
    subject: 'Welcome to {{brokerage_name}} – Your German Mortgage Application',
    body: 'Dear {{client_name}},\n\nThank you for reaching out regarding your property purchase in {{property_city}}. My name is {{advisor_name}}, and I will personally accompany your financing journey with over 450 German lenders.\n\nTo prepare your free pre-approval certificate within 24 hours, you can access your secure portal here:\n{{portal_url}}\n\nWarm regards,\n{{advisor_name}}\n{{brokerage_name}}',
    availablePlaceholders: ['{{client_name}}', '{{advisor_name}}', '{{brokerage_name}}', '{{property_city}}', '{{portal_url}}', '{{loan_amount}}']
  },
  {
    id: 'tpl-2',
    brokerageId: 'brokerage-berlin',
    name: 'Document Checklist & Bank Readiness Request',
    triggerStage: 'doc_gathering',
    subject: 'Action Needed: Mortgage Dossier Checklist for {{client_name}}',
    body: 'Hi {{client_name}},\n\nGreat news! We have identified several competitive bank terms for your {{loan_amount}} loan in {{property_city}}.\n\nTo submit your application to the underwriting department, please upload your 3 payslips, Schufa report, and ID to your encrypted portal:\n{{portal_url}}\n\nOur system automatically pre-checks each document in the background.\n\nBest,\n{{advisor_name}}',
    availablePlaceholders: ['{{client_name}}', '{{advisor_name}}', '{{brokerage_name}}', '{{portal_url}}', '{{loan_amount}}']
  },
  {
    id: 'tpl-3',
    brokerageId: 'brokerage-berlin',
    name: 'Bank Offer Ready for Signature',
    triggerStage: 'offer_received',
    subject: 'Your Binding German Bank Offer is Ready – {{brokerage_name}}',
    body: 'Dear {{client_name}},\n\nCongratulations! The lender has issued the binding loan contract (Darlehensvertrag). Please review the interest rate locking and notarization schedule in your portal.\n\nSincerely,\n{{advisor_name}}',
    availablePlaceholders: ['{{client_name}}', '{{advisor_name}}', '{{brokerage_name}}', '{{portal_url}}']
  }
];

export const STAGE_TASK_TRIGGERS: TaskTrigger[] = [
  {
    id: 'trig-1',
    brokerageId: 'brokerage-berlin',
    stage: 'new',
    title: 'Call lead within 2 hours & verify expat residency status',
    slaHours: 2,
    assigneeRole: 'advisor'
  },
  {
    id: 'trig-2',
    brokerageId: 'brokerage-berlin',
    stage: 'contacted',
    title: 'Send tailored borrowing capacity calculation & portal invite',
    slaHours: 6,
    assigneeRole: 'advisor'
  },
  {
    id: 'trig-3',
    brokerageId: 'brokerage-berlin',
    stage: 'doc_gathering',
    title: 'Audit Schufa report and last 3 German Gehaltsabrechnungen',
    slaHours: 12,
    assigneeRole: 'advisor'
  },
  {
    id: 'trig-4',
    brokerageId: 'brokerage-berlin',
    stage: 'bank_underwriting',
    title: 'Follow up with Sparkasse/ING underwriting desk on approval',
    slaHours: 24,
    assigneeRole: 'advisor'
  }
];

export const INITIAL_TASKS: LeadTask[] = [
  {
    id: 'task-1',
    leadId: 'lead-01',
    leadName: 'Dr. Priya Patel',
    brokerageId: 'brokerage-berlin',
    title: 'Call lead within 2 hours & verify expat residency status',
    stage: 'new',
    assignedToAdvisor: 'Lukas Becker',
    dueAt: 'In 1 hour 42 mins',
    isOverdue: false,
    isCompleted: false
  },
  {
    id: 'task-2',
    leadId: 'lead-02',
    leadName: 'Liam O’Connor',
    brokerageId: 'brokerage-berlin',
    title: 'Send tailored borrowing capacity calculation & portal invite',
    stage: 'contacted',
    assignedToAdvisor: 'Lukas Becker',
    dueAt: 'Overdue by 25 mins',
    isOverdue: true,
    isCompleted: false
  },
  {
    id: 'task-3',
    leadId: 'lead-03',
    leadName: 'Sophie & Marc Dubois',
    brokerageId: 'brokerage-berlin',
    title: 'Audit Schufa report and last 3 German Gehaltsabrechnungen',
    stage: 'doc_gathering',
    assignedToAdvisor: 'Elena Rostova',
    dueAt: 'In 7 hours',
    isOverdue: false,
    isCompleted: false
  }
];

export const DESIGN_SHOWCASE_ITEMS: DesignShowcaseItem[] = [
  {
    id: 'live-lead-pipeline',
    title: 'Live Lead Pipeline',
    subtitle: 'Dr. Priya Patel · €685,000 · Berlin Mitte',
    imagePath: '/src/assets/images/leadflow_pipeline_glass_1790785552441.jpg',
    aspectRatio: '16:9',
    description: 'New inquiry from Typeform. Blue Card holder seeking a 3-bed Eigentumswohnung in Berlin Mitte. Loan €685,000 on a €820,000 purchase. Assigned to Lukas Becker. Stage: New · SLA call due in 1h 42m.',
    designNotes: [
      'Stage: New → Contacted → Document gathering',
      'Advisor: Lukas Becker · Berlin Expat Hypotheken',
      'Property: Eigentumswohnung · Berlin Mitte',
      'Source: Typeform German expat hub'
    ],
    visualEffects: ['New lead', '€685,000 loan', 'Berlin Mitte', 'Lukas Becker']
  },
  {
    id: 'client-case-management',
    title: 'Client & Case Management',
    subtitle: 'Sophie & Marc Dubois · €920,000 · Prenzlauer Berg',
    imagePath: '/src/assets/images/leadflow_hero_neo_apple_1790785536994.jpg',
    aspectRatio: '4:3',
    description: 'Converted client case for a family purchase of a 4-room Altbau in Prenzlauer Berg. Loan €920,000. Employment: dual French/German permanent contracts. Advisor Elena Rostova. Stage: Document gathering · 12 of 18 bank packs complete.',
    designNotes: [
      'Client status: Active case dossier',
      'Advisor: Elena Rostova · EU relocation desk',
      'Property: Altbau Wohnung · Prenzlauer Berg',
      'Pipeline: Document gathering'
    ],
    visualEffects: ['Active client', '€920,000 loan', 'Altbau', 'Elena Rostova']
  },
  {
    id: 'document-verification',
    title: 'Document Verification',
    subtitle: 'Schufa · Payslips · Residence permit',
    imagePath: '/src/assets/images/leadflow_doc_verification_1790785565858.jpg',
    aspectRatio: '4:3',
    description: 'Bank-readiness check for Sophie & Marc Dubois. Last 3 Gehaltsabrechnungen approved. Schufa Bonitätsauskunft flagged as older than 6 weeks — action needed. German residence permit OCR complete. ING underwriting pack 74% ready.',
    designNotes: [
      'Payslips: Approved',
      'Schufa: Action needed · refresh required',
      'Residence permit: Analyzing complete',
      'Required pack: 15–40 German bank documents'
    ],
    visualEffects: ['Approved', 'Action needed', 'OCR complete', 'ING pack']
  },
  {
    id: 'tasks-workflow',
    title: 'Tasks & Workflow Automation',
    subtitle: '2h call SLA · Portal invite · Schufa audit',
    imagePath: '/src/assets/images/leadflow_pipeline_glass_1790785552441.jpg',
    aspectRatio: '4:3',
    description: 'Stage triggers for Berlin Expat Hypotheken: call new leads within 2 hours, send borrowing-capacity PDF and portal invite at Contacted, and audit Schufa plus payslips at Document gathering. Liam O’Connor’s invite task is overdue by 25 minutes.',
    designNotes: [
      'Trigger: New → Call within 2 hours',
      'Trigger: Contacted → Capacity calc & portal invite',
      'Trigger: Document gathering → Schufa audit',
      'Assignee role: Advisor'
    ],
    visualEffects: ['2h SLA', 'Overdue task', 'Stage trigger', 'Portal invite']
  },
  {
    id: 'analytics-activity',
    title: 'Analytics & Activity',
    subtitle: '€14.25M volume · 28 active leads · Berlin',
    imagePath: '/src/assets/images/leadflow_hero_neo_apple_1790785536994.jpg',
    aspectRatio: '4:3',
    description: 'Berlin Expat Hypotheken GmbH this month: €14.25M pipeline volume, 28 live leads, 4 advisors. Funnel snapshot — New 6, Contacted 5, Document gathering 8, Bank underwriting 4, Offer received 3, Won 2. Latest activity: Commerzbank underwriting ping for case Dubois.',
    designNotes: [
      'Monthly volume: €14,250,000',
      'Won this month: 2 purchase cases',
      'Live sync: wss://api.leadflow.de/brokerage-berlin',
      'Rate watch: ING 10-year fixed 3.38%'
    ],
    visualEffects: ['€14.25M', '28 leads', '4 advisors', 'Live sync']
  },
  {
    id: 'client-portal',
    title: 'Client Portal',
    subtitle: 'Secure uploads · Case status · Advisor chat',
    imagePath: '/src/assets/images/leadflow_client_portal_1790785579057.jpg',
    aspectRatio: '4:3',
    description: 'Client view for Sophie & Marc Dubois: encrypted dropzone for Gehaltsabrechnungen, Schufa, and ID. Pre-approval thermometer at 74%. Direct presence for Elena Rostova. Next step: re-upload Schufa dated within 6 weeks for Sparkasse/ING underwriting.',
    designNotes: [
      'Client: Sophie & Marc Dubois',
      'Advisor: Elena Rostova · online',
      'Readiness: 74% bank pack',
      'Next upload: refreshed Schufa'
    ],
    visualEffects: ['Secure upload', '74% ready', 'Schufa due', 'Elena Rostova']
  }
];
