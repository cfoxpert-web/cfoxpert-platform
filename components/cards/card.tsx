import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const cardVariants = cva("rounded-card border border-line bg-white transition-all duration-250", {
  variants: {
    interactive: {
      true: "cursor-pointer hover:-translate-y-1 hover:border-slate-light hover:shadow-card-hover",
      false: "",
    },
  },
  defaultVariants: { interactive: false },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ interactive, className }))} {...props} />;
}
