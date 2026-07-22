import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { FOOTER_COLUMNS, SITE_CONFIG } from "@/constants/site";

export function Footer() {
  return (
    <footer className="border-t border-line py-14">
      <Container className="flex flex-wrap justify-between gap-8 text-[13.5px] text-slate-light">
        <div>
          <div className="mb-2.5">
            <Logo heightClass="h-6" />
          </div>
          <p>
            Operated by {SITE_CONFIG.legalEntity}
            <br />
            {SITE_CONFIG.address.line1}
            <br />
            {SITE_CONFIG.address.line2}
          </p>
        </div>

        <div className="flex flex-wrap gap-14">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h5 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-navy">
                {col.heading}
              </h5>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mb-2 block text-slate hover:text-navy"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </footer>
  );
}
