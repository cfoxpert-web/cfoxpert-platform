import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Login",
  description: "Log in to your CFOxpert Client Portal.",
};

export default function ClientLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
