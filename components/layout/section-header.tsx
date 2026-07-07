import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  heading: string;
  description?: string;
  align?: "left" | "center";
  eyebrowColor?: "teal" | "gold";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  heading,
  description,
  align = "left",
  eyebrowColor = "teal",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <p
        className={cn(
          "mb-4 inline-flex items-center gap-2 text-eyebrow font-bold uppercase",
          align === "center" && "justify-center",
          eyebrowColor === "teal" ? "text-teal" : "text-gold"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            eyebrowColor === "teal" ? "bg-teal" : "bg-gold"
          )}
        />
        {eyebrow}
      </p>
      <h2 className="font-display text-heading-lg font-medium text-navy">{heading}</h2>
      {description && <p className="mt-3.5 text-[17px] text-slate">{description}</p>}
    </div>
  );
}
