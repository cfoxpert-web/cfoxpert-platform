import { BUSINESS_CHALLENGES } from "@/constants/challenges";
import { cn } from "@/lib/utils";

interface ChallengeGridProps {
  /** "light" for white pages (homepage). "dark" for navy sections (about page). */
  variant?: "light" | "dark";
}

export function ChallengeGrid({ variant = "light" }: ChallengeGridProps) {
  const isDark = variant === "dark";
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-card border sm:grid-cols-2 lg:grid-cols-3",
        isDark ? "border-white/10 bg-white/10" : "border-line bg-line"
      )}
    >
      {BUSINESS_CHALLENGES.map((challenge) => (
        <div
          key={challenge.title}
          className={cn(
            "p-7 transition-colors duration-250",
            isDark ? "bg-navy-deep hover:bg-white/5" : "bg-white hover:bg-mist-2"
          )}
        >
          <h3 className={cn("mb-2 text-base font-semibold", isDark ? "text-white" : "text-navy")}>
            {challenge.title}
          </h3>
          <p className={cn("text-sm", isDark ? "text-white/65" : "text-slate")}>
            {challenge.description}
          </p>
        </div>
      ))}
    </div>
  );
}
