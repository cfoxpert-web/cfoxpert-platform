"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PORTAL_NAV_ITEMS } from "@/constants/portal-nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {PORTAL_NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium text-slate transition-colors hover:bg-mist hover:text-navy",
              active && "bg-teal-light text-teal"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] shrink-0 border-r border-line bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col py-6">
          <div className="mb-6 px-5">
  <Logo heightClass="h-6" />
</div>
          <NavLinks />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white py-6 shadow-elevation-3 lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between px-5">
                <div className="mb-6 px-5">
  <Logo heightClass="h-6" />
</div>
                <button onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center">
                  <X className="h-5 w-5 text-navy" />
                </button>
              </div>
              <NavLinks onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
