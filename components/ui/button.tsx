import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold transition-transform duration-250 ease-premium disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-navy text-white shadow-elevation-1 hover:-translate-y-px hover:shadow-elevation-2",
        secondary:
          "bg-mist-2 border border-line text-navy hover:bg-white hover:border-slate-light hover:-translate-y-px",
        ghost: "text-navy font-semibold hover:text-teal",
        onDark:
          "bg-white text-navy hover:-translate-y-px hover:shadow-elevation-2",
      },
      size: {
        default: "px-6 py-3",
        lg: "px-7 py-[15px] text-[15.5px]",
        sm: "px-4 py-2 text-[13.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
