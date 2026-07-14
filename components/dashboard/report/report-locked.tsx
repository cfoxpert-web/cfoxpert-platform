import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/cards/card";
import {
  entitlementRequirement,
  type EntitlementKey,
} from "@/lib/entitlements";

/**
 * Amendment A6 — what a visible-but-not-entitled tab shows. The page
 * renders this INSTEAD of the tab component, so no data is fetched for
 * surfaces the organization isn't entitled to.
 */
export function ReportLocked({ entitlement }: { entitlement: EntitlementKey }) {
  return (
    <Card className="p-10 text-center">
      <Lock className="mx-auto h-5 w-5 text-slate-light" aria-hidden />
      <p className="mt-3 text-[14px] text-slate">
        {entitlementRequirement(entitlement)}
      </p>
      <p className="mt-1 text-[12.5px] text-slate-light">
        It isn&apos;t part of your current engagement.{" "}
        <Link href="/pricing" className="font-semibold text-teal hover:underline">
          See packages
        </Link>
      </p>
    </Card>
  );
}
