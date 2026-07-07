import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";

interface CTABannerProps {
  heading: string;
  description: string;
  buttonLabel?: string;
  buttonHref?: string;
}

/**
 * This exact band (navy background, centered heading + subcopy + white button)
 * appeared, hand-duplicated, at the bottom of 5 separate HTML files. One
 * component now, parameterized per page's specific message.
 */
export function CTABanner({
  heading,
  description,
  buttonLabel = "Book Your Business Health Check",
  buttonHref = "/health-check",
}: CTABannerProps) {
  return (
    <Section className="bg-navy text-center text-white">
      <Container>
        <h2 className="font-display text-heading-lg font-medium text-white">{heading}</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">{description}</p>
        <Button asChild variant="onDark" size="lg" className="mt-9">
          <Link href={buttonHref}>{buttonLabel}</Link>
        </Button>
      </Container>
    </Section>
  );
}
