export interface Opportunity {
  tag: string;
  title: string;
  description: string;
}

export const HEALTH_CHECK_OPPORTUNITIES: Opportunity[] = [
  { tag: "Highest Impact", title: "Reduce founder dependency", description: "Delegate decision authority and build management-level accountability systems." },
  { tag: "Quick Win", title: "Tighten cash conversion cycle", description: "Renegotiate payment terms and improve collections discipline within 60 days." },
  { tag: "Foundational", title: "Move to live dashboards", description: "Replace static monthly reports with a real-time performance view." },
  { tag: "Strategic", title: "Diversify revenue concentration", description: "Reduce dependency on top customers to lower enterprise risk." },
];

export interface RoadmapStep {
  title: string;
  description: string;
}

export const HEALTH_CHECK_ROADMAP: RoadmapStep[] = [
  { title: "Weeks 1–2 · Diagnostic deep-dive", description: "Full financial and operational review with your leadership team." },
  { title: "Weeks 3–6 · System design", description: "Dashboards, KPI ownership, and cash flow controls put in place." },
  { title: "Weeks 7–12 · Execution & review", description: "Monthly board reviews begin, action tracker goes live." },
];
