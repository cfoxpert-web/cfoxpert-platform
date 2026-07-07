import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with CFOxpert — book a Business Health Check or send us a message.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
