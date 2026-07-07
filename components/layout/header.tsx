"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { NAV_ITEMS, SITE_CONFIG } from "@/constants/site";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/72 backdrop-blur-xl backdrop-saturate-150">
      <Container>
        <nav className="flex items-center justify-between py-[18px]">
          <Link href="/" className="text-[19px] font-bold text-navy" onClick={() => setMobileOpen(false)}>
            CFO<span className="text-teal">X</span>PERT
          </Link>

          {/* Desktop nav — hidden below md, no disappearing-with-no-replacement like the static HTML had */}
          <ul className="hidden gap-9 text-[14.5px] font-medium text-slate md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "transition-colors hover:text-navy",
                      active && "font-semibold text-navy"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-5 md:flex">
            <Link href="/client-login" className="text-[14.5px] font-semibold text-navy hover:text-teal">
              Client Login
            </Link>
            <Button asChild>
              <Link href={SITE_CONFIG.primaryCta.href}>{SITE_CONFIG.primaryCta.label}</Link>
            </Button>
          </div>

          {/* Mobile hamburger — 44px touch target per the mobile-pass fix */}
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5 text-navy" /> : <Menu className="h-5 w-5 text-navy" />}
          </button>
        </nav>
      </Container>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-b border-line bg-white/98 md:hidden"
          >
            <Container className="flex flex-col py-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-line py-3.5 text-[15.5px] font-medium text-ink last:border-b-0"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/client-login"
                onClick={() => setMobileOpen(false)}
                className="py-3.5 text-[15.5px] font-medium text-ink"
              >
                Client Login
              </Link>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
