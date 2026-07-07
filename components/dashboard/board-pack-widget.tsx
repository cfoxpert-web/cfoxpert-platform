import { FileText } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { BoardPack, BoardPackStatus } from "@/types";

const STATUS_STYLE: Record<BoardPackStatus, string> = {
  ready: "bg-teal-light text-teal",
  sent: "bg-mist text-slate",
  draft: "bg-gold-light/40 text-gold",
};

const STATUS_LABEL: Record<BoardPackStatus, string> = {
  ready: "Ready",
  sent: "Sent",
  draft: "Draft",
};

interface BoardPackWidgetProps {
  packs: BoardPack[];
}

export function BoardPackWidget({ packs }: BoardPackWidgetProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-5 font-display text-[17px] text-navy">Board Packs</h3>
      <div className="flex flex-col gap-2.5">
        {packs.map((pack) => (
          <div key={pack.id} className="flex items-center gap-3.5 rounded-sm border border-line px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-mist text-slate">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-ink">{pack.title}</div>
              <div className="truncate text-[12px] text-slate-light">{pack.meta}</div>
            </div>
            <span className={cn("shrink-0 rounded-pill px-3 py-1 text-[11px] font-semibold", STATUS_STYLE[pack.status])}>
              {STATUS_LABEL[pack.status]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
