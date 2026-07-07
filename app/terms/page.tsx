import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const SECTIONS = [
  { heading: "Acceptance of Terms", body: "By using this website or engaging CFOxpert's services, you agree to these terms." },
  { heading: "Services Provided", body: "CFOxpert provides Virtual CFO advisory, financial reporting, and related business performance services through Paramount Legal Bistro LLP." },
  { heading: "Business Health Check Disclaimer", body: "The Business Health Check is a self-assessed diagnostic tool for general informational purposes and does not constitute financial, legal, or investment advice." },
  { heading: "Client Portal Use", body: "Access to the Client Portal is limited to authorized users of engaged client organizations. Credentials must not be shared." },
  { heading: "Limitation of Liability", body: "CFOxpert's liability is limited to the fees paid for the specific engagement in question, to the extent permitted by law." },
  { heading: "Governing Law", body: "These terms are governed by the laws of India, with jurisdiction in Noida, Uttar Pradesh." },
  { heading: "Contact", body: "Questions about these terms can be directed to info@cfoxpert.in." },
];

/**
 * PLACEHOLDER CONTENT — NOT LEGAL ADVICE. Same caveat as privacy/page.tsx:
 * this is a structural template, not reviewed legal text. Have this drafted
 * or reviewed by qualified counsel before publishing, especially the
 * liability and Business Health Check disclaimer sections given this is a
 * regulated financial advisory business.
 */
export default function TermsPage() {
  return (
    <Section spacing="compact" className="pt-24">
      <Container size="narrow">
        <div className="mb-4 rounded-sm border border-gold-light bg-gold-light/15 px-5 py-4 text-[13px] text-navy">
          <b>Placeholder content.</b> This page has not been reviewed by a lawyer. Replace with
          counsel-reviewed text before publishing — this matters especially for a regulated
          financial advisory business.
        </div>
        <h1 className="mb-2 font-display text-3xl font-medium text-navy">Terms of Service</h1>
        <p className="mb-10 text-sm text-slate-light">Last updated: placeholder date</p>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="mb-2 text-lg font-semibold text-navy">{section.heading}</h2>
              <p className="text-[15px] leading-relaxed text-ink">{section.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
