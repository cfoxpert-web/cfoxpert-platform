import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        teal: "bg-teal-light text-teal",
        gold: "bg-gold-light/40 text-gold",
        neutral: "bg-mist-2 text-slate",
        dark: "bg-white/10 text-white border border-white/20",
        soon: "bg-gold-light text-[#5C4108]",
      },
      size: {
        default: "px-3 py-1.5 text-[11px]",
        sm: "px-2 py-1 text-[9.5px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "default" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}
