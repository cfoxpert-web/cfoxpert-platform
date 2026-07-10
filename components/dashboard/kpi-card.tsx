import { TrendingUp, Percent, Clock, Wallet, Target, ListChecks, ArrowUp, ArrowDown, Minus, Coins, PiggyBank, Banknote, ArrowDownToLine, ArrowUpFromLine, Landmark, Package } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { KPIData } from "@/types";

const ICONS = {
  revenue: TrendingUp,
  margin: Percent,
  cashcycle: Clock,
  workingcapital: Wallet,
  healthscore: Target,
  actions: ListChecks,
  grossprofit: Coins,
  otherincome: PiggyBank,
  netprofit: Banknote,
  receivables: ArrowDownToLine,
  payables: ArrowUpFromLine,
  cashbank: Landmark,
  inventory: Package,
};

const deltaIcon = { up: ArrowUp, down: ArrowDown, flat: Minus };
const deltaColor = { up: "text-teal", down: "text-coral", flat: "text-slate-light" };

export function KPICard({ label, value, delta, icon }: KPIData) {
  const Icon = ICONS[icon];
  const DeltaIcon = delta ? deltaIcon[delta.direction] : null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-light text-teal">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="mb-1 text-[12.5px] text-slate">{label}</div>
      <div className="font-display text-[24px] font-semibold text-navy">{value}</div>
      {delta && DeltaIcon && (
        <div className={cn("mt-1.5 flex items-center gap-1 text-[12px] font-semibold", deltaColor[delta.direction])}>
          <DeltaIcon className="h-3 w-3" />
          {delta.label}
        </div>
      )}
    </Card>
  );
}
