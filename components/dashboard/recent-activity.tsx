import { Card } from "@/components/cards/card";
import type { ActivityItem } from "@/types";

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">Recent Activity</h3>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => (
          <div key={item.id} className="text-[13px] leading-snug text-ink">
            <span className="font-semibold text-navy">{item.actor}</span> {item.action}
            <div className="mt-0.5 text-[11px] text-slate-light">{item.timeAgo}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
