import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

interface ContainerProps extends PropsWithChildren {
  /** "default" matches marketing pages (1180px). "narrow" matches article/about copy (720px). */
  size?: "default" | "narrow";
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const maxWidth = {
  default: "max-w-[1180px]",
  narrow: "max-w-[720px]",
};

export function Container({
  children,
  size = "default",
  className,
  as: Tag = "div",
}: ContainerProps) {
  return (
    <Tag className={cn(maxWidth[size], "mx-auto px-5 sm:px-8", className)}>
      {children}
    </Tag>
  );
}
