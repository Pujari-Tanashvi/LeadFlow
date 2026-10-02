import { DesignShowcaseItem } from "../types";

// Presentation copy for the dashboard showcase only. Every lead, client,
// document, task, email template and statistic in the workspace is read from
// the LeadFlow API, so no demo dataset ships with the app any more.
import leadflowPipelineGlass from "../assets/images/leadflow_pipeline_glass_1790785552441.jpg";
import leadflowHeroNeoApple from "../assets/images/leadflow_hero_neo_apple_1790785536994.jpg";
import leadflowDocVerification from "../assets/images/leadflow_doc_verification_1790785565858.jpg";
import leadflowClientPortal from "../assets/images/leadflow_client_portal_1790785579057.jpg";

export const DESIGN_SHOWCASE_ITEMS: DesignShowcaseItem[] = [
  {
    id: "live-lead-pipeline",
    title: "Live Lead Pipeline",
    subtitle: "Olivia Martin · €520,000 · Berlin Prenzlauer Berg",
    imagePath: leadflowPipelineGlass,
    aspectRatio: "16:9",
    description:
      "New enquiry from the website. Olivia is looking to buy a three-bedroom apartment in Berlin. Loan request €520,000 on a €650,000 purchase. Assigned to Alex Carter. Stage: New · Call due in 1h 42m.",
    designNotes: [
      "Stage: New → Contacted → Document gathering",
      "Advisor: Alex Carter · Berlin Home Finance",
      "Property: Apartment · Berlin Prenzlauer Berg",
      "Source: Website enquiry",
    ],
    visualEffects: ["New lead", "€520,000 loan", "Berlin", "Alex Carter"],
  },
  {
    id: "client-case-management",
    title: "Client & Case Management",
    subtitle: "Ava and Noah Martin · €680,000 · Potsdam",
    imagePath: leadflowHeroNeoApple,
    aspectRatio: "4:3",
    description:
      "Client case for a family home purchase in Potsdam. Loan €680,000. Both applicants have permanent employment. Advisor Maya Chen. Stage: Documents · 12 of 18 items complete.",
    designNotes: [
      "Client status: Active case dossier",
      "Advisor: Maya Chen · Residential lending",
      "Property: Family home · Potsdam",
      "Pipeline: Documents",
    ],
    visualEffects: ["Active client", "€680,000 loan", "Potsdam", "Maya Chen"],
  },
  {
    id: "document-verification",
    title: "Document Verification",
    subtitle: "Credit report · Payslips · Identity",
    imagePath: leadflowDocVerification,
    aspectRatio: "4:3",
    description:
      "Document review for Ava and Noah Martin. Payslips approved. Credit report needs an updated copy. Identity check complete. Lender submission pack is 74% ready.",
    designNotes: [
      "Payslips: Approved",
      "Credit report: Update requested",
      "Identity: Check complete",
      "Required pack: 15–40 lender documents",
    ],
    visualEffects: ["Approved", "Update requested", "Checked", "74% ready"],
  },
  {
    id: "tasks-workflow",
    title: "Tasks & Workflow Automation",
    subtitle: "2h call SLA · Portal invite · Credit review",
    imagePath: leadflowPipelineGlass,
    aspectRatio: "4:3",
    description:
      "Workflow triggers for Berlin Home Finance: call new leads within 2 hours, send the portal invite after first contact, and review credit and income documents before lender submission. Ethan Brooks’s invite task is overdue by 25 minutes.",
    designNotes: [
      "Trigger: New → Call within 2 hours",
      "Trigger: Contacted → Capacity calc & portal invite",
      "Trigger: Documents → Credit and income review",
      "Assignee role: Advisor",
    ],
    visualEffects: ["2h SLA", "Overdue task", "Stage trigger", "Portal invite"],
  },
  {
    id: "analytics-activity",
    title: "Analytics & Activity",
    subtitle: "€14.25M volume · 28 active leads · Berlin",
    imagePath: leadflowHeroNeoApple,
    aspectRatio: "4:3",
    description:
      "Berlin Home Finance this month: €14.25M pipeline volume, 28 live leads, 4 advisors. Funnel snapshot — New 6, Contacted 5, Documents 8, In Review 4, Offer received 3, Won 2. Latest activity: lender review update for the Martin case.",
    designNotes: [
      "Monthly volume: €14,250,000",
      "Won this month: 2 purchase cases",
      "Live sync: Connected to Berlin brokerage",
      "Rate watch: ING 10-year fixed 3.38%",
    ],
    visualEffects: ["€14.25M", "28 leads", "4 advisors", "Live sync"],
  },
  {
    id: "client-portal",
    title: "Client Portal",
    subtitle: "Secure uploads · Case status · Advisor chat",
    imagePath: leadflowClientPortal,
    aspectRatio: "4:3",
    description:
      "Client view for Ava and Noah Martin: secure upload area for payslips, credit report and identity documents. Readiness is 74%. Advisor Maya Chen is available. Next step: upload an updated credit report.",
    designNotes: [
      "Client: Ava and Noah Martin",
      "Advisor: Maya Chen · online",
      "Readiness: 74% bank pack",
      "Next upload: updated credit report",
    ],
    visualEffects: [
      "Secure upload",
      "74% ready",
      "Credit report due",
      "Maya Chen",
    ],
  },
];
