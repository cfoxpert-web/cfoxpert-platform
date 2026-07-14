import { FileText } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import { DOCUMENT_KINDS, stageLabel } from "@/lib/documents/model";
import type { DocumentListItem } from "@/lib/documents/queries";

/**
 * Amendment A4-a — uploaded documents with their coarse pipeline stage.
 * Server-rendered; members see stage labels only (analyst notes are
 * staff-only by RLS).
 */

function kindLabel(key: string): string {
  return DOCUMENT_KINDS.find((k) => k.key === key)?.label ?? "Other";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stageBadgeClass(stage: string | null): string {
  switch (stage) {
    case "published":
      return "bg-teal-light text-teal";
    case "rejected":
    case "failed":
      return "bg-red-50 text-red-600";
    default:
      return "bg-mist text-slate";
  }
}

export function DocumentList({ items }: { items: DocumentListItem[] }) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">
        Uploaded documents
      </h3>

      {items.length === 0 ? (
        <p className="text-[13px] text-slate">
          Nothing uploaded yet. Your financial documents and their processing
          status will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-mist text-slate">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">
                  {doc.fileName}
                </div>
                <div className="text-[11px] text-slate-light">
                  {kindLabel(doc.kind)}
                  {doc.periodHint ? ` · ${doc.periodHint}` : ""}
                  {` · ${formatSize(doc.sizeBytes)} · ${formatDate(doc.uploadedAt)}`}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
                  stageBadgeClass(doc.stage),
                )}
              >
                {doc.stage ? stageLabel(doc.stage) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
