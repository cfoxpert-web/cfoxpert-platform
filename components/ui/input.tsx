import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-input border bg-white px-4 py-3.5 text-[15px] text-ink transition-colors duration-150 placeholder:text-slate-light focus:outline-none focus:ring-2 focus:ring-teal/30",
          error ? "border-destructive" : "border-line focus:border-teal",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
