import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationTone } from "@/types";

const TONE_ICON = { info: Info, warning: AlertTriangle, success: CheckCircle2 };
const TONE_COLOR: Record<NotificationTone, string> = {
  info: "text-sky",
  warning: "text-coral",
  success: "text-teal",
};

interface NotificationsPanelProps {
  items: NotificationItem[];
}

export function NotificationsPanel({ items }: NotificationsPanelProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">Notifications</h3>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => {
          const Icon = TONE_ICON[item.tone];
          return (
            <div key={item.id} className="flex gap-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_COLOR[item.tone])} />
              <div>
                <div className="text-[13px] leading-snug text-ink">{item.message}</div>
                <div className="mt-0.5 text-[11px] text-slate-light">{item.timeAgo}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
