import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Health Check",
  description: "A free 15-minute diagnostic — get your Business Health Score and a roadmap.",
};

export default function HealthCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
