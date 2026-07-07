"use client";

import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import type { PropsWithChildren } from "react";

interface RevealProps extends PropsWithChildren {
  delay?: number;
  className?: string;
}

/**
 * Usage: <Reveal><SectionHeader ... /></Reveal>
 * Replaces the `.reveal` / `.reveal.in` CSS class pattern from the HTML
 * with a single declarative wrapper — no per-page observer wiring needed.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
