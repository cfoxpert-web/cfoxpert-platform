import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

const SECTIONS = [
  { heading: "Information We Collect", body: "Name, phone number, email address, and business details submitted through the Business Health Check, Contact form, or Client Portal request." },
  { heading: "How We Use Your Information", body: "To respond to enquiries, deliver Business Health Check results, and provide ongoing Virtual CFO services to engaged clients." },
  { heading: "Data Sharing", body: "We do not sell personal data. Information may be shared with service providers strictly to operate the platform (e.g. hosting, email delivery)." },
  { heading: "AI-Assisted Processing", body: "Financial documents uploaded to the Client Portal may be processed by third-party AI infrastructure (Anthropic) to extract financial figures. Under Anthropic's commercial API terms, submitted content is not used to train AI models and is retained only for a limited period for abuse monitoring before deletion. Every extracted figure is reviewed by a CFOxpert analyst before it appears in any report." },
  { heading: "Data Retention", body: "Contact and engagement data is retained for as long as necessary to provide services and meet legal/compliance obligations." },
  { heading: "Your Rights", body: "You may request access to, correction of, or deletion of your personal data by contacting hello@cfoxpert.in." },
  { heading: "Cookies", body: "The website may use essential cookies for functionality. No third-party advertising cookies are used." },
  { heading: "Contact", body: "Questions about this policy can be directed to hello@cfoxpert.in." },
];

/**
 * PLACEHOLDER CONTENT — NOT LEGAL ADVICE. This is a structural template so
 * the page exists and is styled consistently with the rest of the site. It
 * has not been reviewed by a lawyer and must not be published as-is. Have
 * an actual privacy policy drafted or reviewed by qualified counsel before
 * this goes live, particularly around Indian data protection law (DPDP Act)
 * given CFOxpert's client base.
 */
export default function PrivacyPolicyPage() {
  return (
    <Section spacing="compact" className="pt-24">
      <Container size="narrow">
        <div className="mb-4 rounded-sm border border-gold-light bg-gold-light/15 px-5 py-4 text-[13px] text-navy">
          <b>Placeholder content.</b> This page has not been reviewed by a lawyer. Replace with
          counsel-reviewed text — particularly regarding India&apos;s DPDP Act — before publishing.
        </div>
        <h1 className="mb-2 font-display text-3xl font-medium text-navy">Privacy Policy</h1>
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
