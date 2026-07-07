import { Card } from "@/components/cards/card";
import type { WorkingCapitalBreakdown } from "@/types";

interface WorkingCapitalCardProps {
  data: WorkingCapitalBreakdown;
}

export function WorkingCapitalCard({ data }: WorkingCapitalCardProps) {
  const rows = [
    { label: "Days Sales Outstanding", value: data.receivablesDays, max: 60 },
    { label: "Days Inventory Outstanding", value: data.inventoryDays, max: 60 },
    { label: "Days Payable Outstanding", value: data.payablesDays, max: 60 },
  ];

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-[17px] text-navy">Working Capital</h3>
        <span className="text-sm font-semibold text-navy">{data.workingCapitalAmount}</span>
      </div>

      <div className="mb-5 flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span className="text-slate">{row.label}</span>
              <span className="font-semibold text-navy">{row.value} days</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-line">
              <div
                className="h-full rounded-pill bg-teal"
                style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-sm bg-teal-light p-4 text-center">
        <div className="text-[11.5px] text-slate">Cash Conversion Cycle</div>
        <div className="font-display text-2xl font-semibold text-teal">
          {data.cashConversionCycle} days
        </div>
      </div>
    </Card>
  );
}
