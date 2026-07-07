import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

interface SectionProps extends PropsWithChildren {
  className?: string;
  /** "default" = 90-100px vertical padding. "compact" = 56-70px (used for hero-adjacent sections). */
  spacing?: "default" | "compact";
  id?: string;
}

export function Section({ children, className, spacing = "default", id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        spacing === "default" ? "py-16 sm:py-24" : "py-10 sm:py-14",
        className
      )}
    >
      {children}
    </section>
  );
}
