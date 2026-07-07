import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

// Sans: replaces the -apple-system stack for cross-platform consistency
// while keeping the same visual weight. Serif: replaces Georgia for headings
// with a webfont that renders identically everywhere (Georgia varies by OS).
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cfoxpert.in"),
  title: {
    default: "CFOxpert — Business Performance Platform",
    template: "%s — CFOxpert",
  },
  description:
    "Financial intelligence, performance systems, and governance — built into one operating platform for founder-led companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
