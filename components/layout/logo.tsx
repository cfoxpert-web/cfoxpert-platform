interface LogoProps {
  heightClass?: string;
  className?: string;
}

export function Logo({ heightClass = "h-16", className = "" }: LogoProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      <img
        src="/logo.png"
        alt="CFOxpert — Your next virtual CFO"
        className={`${heightClass} w-auto object-contain block mx-auto`}
      />
      <span className="absolute -top-1 -right-3 text-[10px] text-slate-light">©</span>
    </span>
  );
}
