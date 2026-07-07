import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

interface DashboardCardProps extends PropsWithChildren {
  title: string;
  live?: boolean;
  className?: string;
}

/**
 * This card family (navy gradient, pulse-dot "Live" indicator, glass tiles)
 * appeared independently in homepage.html, platform.html, and
 * client-login.html with slightly different markup each time. This is the
 * single implementation all three now use.
 */
export function DashboardCard({ title, live = true, children, className }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card-lg border border-white/8 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-7 text-white shadow-elevation-3",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {title}
        </span>
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-bright">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#3CCF8E]" />
            Live
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
