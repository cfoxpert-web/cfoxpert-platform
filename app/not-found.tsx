import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Section className="flex min-h-[70vh] items-center text-center">
      <Container>
        <p className="mb-4 font-display text-6xl font-medium text-teal">404</p>
        <h1 className="mx-auto mb-4 max-w-md font-display text-2xl font-medium text-navy">
          This page doesn&apos;t exist — or hasn&apos;t been built yet.
        </h1>
        <p className="mx-auto mb-9 max-w-sm text-slate">
          Let&apos;s get you back to something that does.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/">Back to Homepage</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/health-check">Book Health Check</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
