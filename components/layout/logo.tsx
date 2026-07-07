interface LogoProps {
  heightClass?: string;
  className?: string;
}

/**
 * Single source for the logo everywhere it appears (Header, Footer, Sidebar,
 * Client Login). The © mark is a separate small element positioned at the
 * top-right corner, not baked into the image itself.
 */
export function Logo({ heightClass = "h-7", className = "" }: LogoProps) {
  return (
    <span className={`relative inline-flex items-start ${className}`}>
      <img src="/logo.png" alt="CFOxpert — Your next virtual CFO" className={`${heightClass} w-auto object-contain`} />
      <sup className="ml-0.5 text-[10px] leading-none text-slate-light">©</sup>
    </span>
  );
}
