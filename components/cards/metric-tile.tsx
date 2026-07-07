import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricTileData } from "@/types";

interface MetricTileProps extends MetricTileData {
  /** Spans both grid columns — used for the Health Score row in the hero card */
  wide?: boolean;
  className?: string;
}

const deltaIcon = { up: ArrowUp, down: ArrowDown, flat: Minus };
const deltaColor = { up: "text-[#5EDBAA]", down: "text-[#F0A5A5]", flat: "text-white/50" };

export function MetricTile({ label, value, delta, wide, className }: MetricTileProps) {
  const DeltaIcon = delta ? deltaIcon[delta.direction] : null;

  return (
    <div
      className={cn(
        "rounded-sm border border-white/10 bg-white/7 p-4",
        wide && "col-span-2 flex items-center justify-between",
        className
      )}
    >
      <div>
        <div className="mb-2 text-[11.5px] text-white/65">{label}</div>
        <div className="font-display text-[22px] font-semibold">{value}</div>
      </div>
      {delta && DeltaIcon && (
        <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-semibold", deltaColor[delta.direction])}>
          <DeltaIcon className="h-3 w-3" />
          {delta.label}
        </div>
      )}
    </div>
  );
}
