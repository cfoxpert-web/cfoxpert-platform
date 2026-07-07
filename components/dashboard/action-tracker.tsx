import { Card } from "@/components/cards/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActionItem, ActionStatus } from "@/types";

const STATUS_DOT: Record<ActionStatus, string> = {
  overdue: "bg-[#E07A6A]",
  "in-progress": "bg-[#E0B04E]",
  done: "bg-[#3CCF8E]",
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  overdue: "Overdue",
  "in-progress": "In progress",
  done: "Done",
};

interface ActionTrackerProps {
  items: ActionItem[];
}

export function ActionTracker({ items }: ActionTrackerProps) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-[17px] text-navy">Action Tracker</h3>
        <Badge variant="neutral">{items.filter((i) => i.status !== "done").length} open</Badge>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3.5 rounded-sm border border-line px-4 py-3.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[item.status])} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-ink">{item.title}</div>
              <div className="truncate text-[12px] text-slate-light">
                {item.owner}
                {item.dueDate ? ` · ${item.dueDate}` : ""}
              </div>
            </div>
            <span className="shrink-0 rounded-pill bg-mist px-3 py-1 text-[11px] font-medium text-slate">
              {STATUS_LABEL[item.status]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
