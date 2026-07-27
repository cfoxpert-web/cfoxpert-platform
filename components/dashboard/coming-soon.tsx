import { Hourglass } from "lucide-react";
import { Card } from "@/components/cards/card";

/**
 * Pre-launch content pass: the honest state for portal sections whose real
 * data source doesn't exist yet. Shown ONLY on the real-data path — mock
 * mode keeps the illustrative widgets for demos. No fake numbers in front
 * of paying clients, ever.
 */
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card className="p-10 text-center">
      <Hourglass className="mx-auto h-5 w-5 text-slate-light" aria-hidden />
      <p className="mt-3 text-[14px] text-slate">
        {feature} is being prepared for your engagement.
      </p>
      <p className="mt-1 text-[12.5px] text-slate-light">
        Your CFOxpert analyst will activate this section — it will appear here
        automatically once it carries your real data.
      </p>
    </Card>
  );
}
