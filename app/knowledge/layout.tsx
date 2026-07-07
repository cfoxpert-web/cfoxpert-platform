import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Hub",
  description:
    "Executive guides on cash flow, governance, and enterprise value — written for owners, not accountants.",
};

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
