"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ENTERPRISE_VALUE_DRIVERS } from "@/constants/drivers";
import { cn } from "@/lib/utils";

const CX = 150;
const CY = 150;
const R_OUTER = 140;
const R_INNER = 70;
const SEGMENT_ANGLE = 360 / ENTERPRISE_VALUE_DRIVERS.length;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function arcPath(startAngle: number, endAngle: number) {
  const [x1, y1] = polar(CX, CY, R_OUTER, startAngle);
  const [x2, y2] = polar(CX, CY, R_OUTER, endAngle);
  const [x3, y3] = polar(CX, CY, R_INNER, endAngle);
  const [x4, y4] = polar(CX, CY, R_INNER, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M${x1},${y1} A${R_OUTER},${R_OUTER} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${R_INNER},${R_INNER} 0 ${largeArc} 0 ${x4},${y4} Z`;
}

interface EnterpriseValueEngineProps {
  /** "dark" for the homepage/platform navy section. "light" for use on white backgrounds (e.g. inside dashboard). */
  variant?: "dark" | "light";
  autoCycle?: boolean;
  className?: string;
}

export function EnterpriseValueEngine({
  variant = "dark",
  autoCycle = true,
  className,
}: EnterpriseValueEngineProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = ENTERPRISE_VALUE_DRIVERS[activeIndex]!;

  useEffect(() => {
    if (!autoCycle || paused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ENTERPRISE_VALUE_DRIVERS.length);
    }, 3200);
    return () => clearInterval(id);
  }, [autoCycle, paused]);

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 md:grid-cols-[380px_1fr] md:gap-16",
        className
      )}
    >
      <div
        className="relative mx-auto h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <svg viewBox="0 0 300 300" className="h-full w-full">
          {ENTERPRISE_VALUE_DRIVERS.map((driver, i) => {
            const start = i * SEGMENT_ANGLE;
            const end = start + SEGMENT_ANGLE;
            const mid = start + SEGMENT_ANGLE / 2;
            const [lx, ly] = polar(CX, CY, (R_OUTER + R_INNER) / 2 + 2, mid);
            return (
              <g key={driver.key}>
                <path
                  d={arcPath(start, end)}
                  fill={driver.hex}
                  stroke={isDark ? "#0A1A33" : "#FFFFFF"}
                  strokeWidth={3}
                  className="cursor-pointer transition-opacity duration-250"
                  style={{ opacity: activeIndex === i ? 1 : 0.9 }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={driver.label}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none text-[11px] font-bold uppercase tracking-wide"
                  fill="#0A1A33"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {driver.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-display text-[15px] uppercase tracking-wide",
              isDark ? "text-white/55" : "text-slate"
            )}
          >
            Enterprise
          </span>
          <span className={cn("font-display text-[22px] font-semibold", isDark ? "text-white" : "text-navy")}>
            Value
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="min-h-[190px]"
        >
          <div className="mb-3.5 text-xs font-bold uppercase tracking-widest text-gold-light">
            Driver {String(activeIndex + 1).padStart(2, "0")} / 06
          </div>
          <h3 className={cn("mb-3.5 font-display text-[30px]", isDark ? "text-white" : "text-navy")}>
            {active.label}
          </h3>
          <p className={cn("max-w-md text-base leading-relaxed", isDark ? "text-white/78" : "text-slate")}>
            {active.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {active.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-pill border px-3.5 py-1.5 text-[12.5px]",
                  isDark
                    ? "border-white/24 bg-white/6 text-white/92"
                    : "border-line bg-mist text-slate"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
