"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/cards/metric-tile";
import { PLATFORM_MODULES } from "@/constants/platform-modules";
import { cn } from "@/lib/utils";

const statusColor = { green: "bg-[#3CCF8E]", amber: "bg-[#E0B04E]", red: "bg-[#E07A6A]" };

export function ModuleShowcase() {
  const [activeKey, setActiveKey] = useState(PLATFORM_MODULES[0]!.key);
  const active = PLATFORM_MODULES.find((m) => m.key === activeKey)!;

  return (
    <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[340px_1fr] md:gap-12">
      {/* Module list */}
      <div className="flex flex-col gap-1.5 md:sticky md:top-24">
        {PLATFORM_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = mod.key === activeKey;
          return (
            <button
              key={mod.key}
              onClick={() => setActiveKey(mod.key)}
              className={cn(
                "flex items-center gap-3.5 rounded-sm border border-transparent p-4 text-left transition-colors duration-200 hover:bg-mist",
                isActive && "border-line bg-mist-2"
              )}
            >
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-white"
                style={{ background: mod.iconGradient }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="mb-0.5 flex items-center gap-1.5 text-[14.5px] font-semibold text-navy">
                  {mod.name}
                  {mod.comingSoon && <Badge variant="soon" size="sm">Soon</Badge>}
                </span>
                <span className="block text-[12.5px] text-slate">{mod.tagline}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview panel */}
      <div className="relative min-h-[460px] overflow-hidden rounded-card-lg border border-white/8 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-9 text-white shadow-elevation-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-3.5 text-xs font-bold uppercase tracking-wider text-teal-bright">
              {active.preview.eyebrow}
            </div>
            <h3 className="mb-3 font-display text-2xl">{active.preview.title}</h3>
            <p className="mb-7 max-w-md text-[15px] leading-relaxed text-white/72">
              {active.preview.description}
            </p>

            {active.preview.type === "grid" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {active.preview.tiles.map((tile) => (
                  <MetricTile key={tile.label} {...tile} />
                ))}
              </div>
            )}

            {active.preview.type === "list" && (
              <div className="flex flex-col gap-2.5">
                {active.preview.rows.map((row) => (
                  <div
                    key={row.title}
                    className="flex items-center gap-3.5 rounded-sm border border-white/10 bg-white/6 px-[18px] py-3.5"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", statusColor[row.status])} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{row.title}</div>
                      <div className="truncate text-xs text-white/55">{row.subtitle}</div>
                    </div>
                    <span className="shrink-0 rounded-pill bg-white/10 px-3 py-1 text-[11px]">{row.tag}</span>
                  </div>
                ))}
              </div>
            )}

            {active.preview.type === "pills" && (
              <div className="flex flex-wrap gap-2.5">
                {active.preview.pills.map((pill) => (
                  <span key={pill} className="rounded-pill border border-white/14 bg-white/8 px-4 py-2 text-[13px]">
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
