"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Card } from "@/components/cards/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendToWebhook } from "@/lib/webhook";

const INFO_CARDS: { title: string; lines: { text: string; href?: string }[] }[] = [
  {
    title: "Call Us",
    lines: [
      { text: "+91 9582727181", href: "tel:+919582727181" },
      { text: "+91 9899907075", href: "tel:+919899907075" },
    ],
  },
  { title: "Email Us", lines: [{ text: "hello@cfoxpert.in", href: "mailto:hello@cfoxpert.in" }] },
  {
    title: "Head Office",
    lines: [
      { text: "Paramount Legal Bistro LLP" },
      { text: "E-107, Sector-6, Near Noida Authority" },
      { text: "Noida – 201301, India" },
    ],
  },
];

const HOURS = [
  { day: "Monday – Friday", time: "10:00 AM – 7:00 PM" },
  { day: "Saturday", time: "10:00 AM – 2:00 PM" },
  { day: "Sunday", time: "Closed" },
];

const ENQUIRY_TYPES = ["Business Health Check", "Virtual CFO Engagement", "Board Reporting", "DPR / Feasibility Report", "General Enquiry"];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    void sendToWebhook({
      type: "contact_form",
      ...Object.fromEntries(formData.entries()),
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  }

  return (
    <Section spacing="compact" className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%)] pt-24">
      <Container>
        <div className="mb-14 text-center">
          <p className="mb-5 inline-flex items-center justify-center gap-2 text-eyebrow font-bold uppercase text-teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            Get In Touch
          </p>
          <h1 className="mx-auto max-w-xl font-display text-display-md font-medium text-navy">
            Let&apos;s talk about your business.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-slate">
            Whether you&apos;re ready for a Business Health Check or just have a question — we
            usually reply within one business day.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-[1fr_1.1fr]">
          {/* Info column */}
          <div>
            <div className="mb-3.5 flex flex-col gap-3.5">
              {INFO_CARDS.map((card) => (
                <Card key={card.title} className="p-5">
                  <h4 className="mb-1.5 text-[14.5px] font-semibold text-navy">{card.title}</h4>
                  {card.lines.map((line) =>
                    line.href ? (
                      <a key={line.text} href={line.href} className="block text-[13.5px] text-slate hover:text-navy">
                        {line.text}
                      </a>
                    ) : (
                      <p key={line.text} className="text-[13.5px] text-slate">{line.text}</p>
                    )
                  )}
                </Card>
              ))}
            </div>
            <Card className="p-5">
              <h4 className="mb-3.5 text-[14.5px] font-semibold text-navy">Business Hours</h4>
              {HOURS.map((h) => (
                <div key={h.day} className="flex justify-between border-t border-line py-1.5 text-[13.5px] first:border-t-0 first:pt-0">
                  <span className="text-slate">{h.day}</span>
                  <span className="font-semibold text-ink">{h.time}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Form column */}
          <Card className="p-8 sm:p-10">
            {submitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-light text-2xl text-teal">✓</div>
                <h3 className="mb-2 font-display text-xl text-navy">Message received.</h3>
                <p className="text-sm text-slate">
                  Thanks for reaching out — someone from our team will get back to you within one business day.
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-1.5 font-display text-2xl font-medium text-navy">Send us a message</h2>
                <p className="mb-7 text-sm text-slate">
                  Prefer a structured diagnostic instead?{" "}
                  <a href="/health-check" className="font-semibold text-teal hover:underline">
                    Start a free Business Health Check →
                  </a>
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ct-name" className="mb-2 block text-[13px] font-semibold text-navy">
                        Full name
                      </label>
                      <Input id="ct-name" name="name" required placeholder="e.g. Rajesh Kumar" />
                    </div>
                    <div>
                      <label htmlFor="ct-company" className="mb-2 block text-[13px] font-semibold text-navy">
                        Company name
                      </label>
                      <Input id="ct-company" name="company" placeholder="e.g. Sunrise Industries Pvt Ltd" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ct-email" className="mb-2 block text-[13px] font-semibold text-navy">
                        Email address
                      </label>
                      <Input id="ct-email" name="email" type="email" required placeholder="you@company.com" />
                    </div>
                    <div>
                      <label htmlFor="ct-phone" className="mb-2 block text-[13px] font-semibold text-navy">
                        Mobile number
                      </label>
                      <Input id="ct-phone" name="phone" type="tel" required placeholder="98765 43210" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ct-type" className="mb-2 block text-[13px] font-semibold text-navy">
                      What can we help with?
                    </label>
                    <select
                      id="ct-type"
                      name="enquiryType"
                      className="w-full rounded-input border border-line bg-white px-4 py-3.5 text-[15px] text-ink focus:border-teal focus:outline-none"
                    >
                      {ENQUIRY_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ct-message" className="mb-2 block text-[13px] font-semibold text-navy">
                      Message
                    </label>
                    <textarea
                      id="ct-message"
                      name="message"
                      rows={4}
                      placeholder="Tell us a bit about your business and what you're looking for..."
                      className="w-full resize-y rounded-input border border-line bg-white px-4 py-3.5 text-[14.5px] text-ink placeholder:text-slate-light focus:border-teal focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-light">We reply within one business day. No spam, ever.</p>
                  <Button type="submit" size="lg" className="w-full">
                    Send Message →
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </Container>
    </Section>
  );
}
