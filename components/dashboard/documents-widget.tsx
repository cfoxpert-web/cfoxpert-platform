import { File } from "lucide-react";
import { Card } from "@/components/cards/card";
import type { DocumentItem } from "@/types";

interface DocumentsWidgetProps {
  items: DocumentItem[];
}

export function DocumentsWidget({ items }: DocumentsWidgetProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">Documents</h3>
      <div className="flex flex-col gap-3">
        {items.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-mist text-slate">
              <File className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ink">{doc.name}</div>
              <div className="text-[11px] text-slate-light">{doc.updatedLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
