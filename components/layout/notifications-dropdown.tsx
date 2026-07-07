"use client";

import * as Popover from "@radix-ui/react-popover";
import { Bell, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/dashboard";
import { cn } from "@/lib/utils";
import type { NotificationTone } from "@/types";

const TONE_ICON = { info: Info, warning: AlertTriangle, success: CheckCircle2 };
const TONE_COLOR: Record<NotificationTone, string> = {
  info: "text-sky",
  warning: "text-coral",
  success: "text-teal",
};

export function NotificationsDropdown() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-mist hover:text-navy"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-80 rounded-card border border-line bg-white p-4 shadow-elevation-2"
        >
          <h4 className="mb-3 text-[13px] font-semibold text-navy">Notifications</h4>
          <div className="flex flex-col gap-3">
            {MOCK_NOTIFICATIONS.map((item) => {
              const Icon = TONE_ICON[item.tone];
              return (
                <div key={item.id} className="flex gap-2.5">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_COLOR[item.tone])} />
                  <div>
                    <div className="text-[12.5px] leading-snug text-ink">{item.message}</div>
                    <div className="mt-0.5 text-[11px] text-slate-light">{item.timeAgo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
