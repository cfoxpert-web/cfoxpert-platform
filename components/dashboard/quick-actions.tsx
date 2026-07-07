import Link from "next/link";
import { Card } from "@/components/cards/card";
import type { QuickAction } from "@/types";

interface QuickActionsProps {
  items: QuickAction[];
}

export function QuickActions({ items }: QuickActionsProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[16px] text-navy">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="rounded-sm border border-line px-3.5 py-3 text-center text-[12.5px] font-semibold text-navy transition-colors hover:bg-mist"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
