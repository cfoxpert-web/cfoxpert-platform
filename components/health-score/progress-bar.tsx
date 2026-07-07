import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number; // 0-indexed
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label = "Business Health Check" }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="mb-12">
      <div className="mb-2.5 flex justify-between text-[12.5px] text-slate">
        <span>{label}</span>
        <span className="font-semibold text-navy">
          {Math.min(current + 1, total)} of {total}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-pill bg-line">
        <div
          className="h-full rounded-pill bg-gradient-to-r from-teal to-teal-bright transition-all duration-500 ease-premium"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3.5 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all duration-300",
              i < current ? "bg-teal-bright" : i === current ? "scale-150 bg-navy" : "bg-line"
            )}
          />
        ))}
      </div>
    </div>
  );
}
