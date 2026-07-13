import { Card } from "@/components/cards/card";

/** Honest empty state — replaces the old silent fall-back to mock data. */
export function ReportEmpty({ periodLabel }: { periodLabel?: string | null }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-[14px] text-slate">
        No data recorded for {periodLabel ?? "this period"}.
      </p>
      <p className="mt-1 text-[12.5px] text-slate-light">
        Figures appear here once this period&apos;s financials are entered.
      </p>
    </Card>
  );
}
