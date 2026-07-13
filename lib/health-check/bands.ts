import { createClient } from "@/lib/supabase/server";
import type { MetricBandRow } from "./financial-score";

/** Active health metric bands (migration 0011). Server-side only. */
export async function getHealthMetricBands(): Promise<MetricBandRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_metric_bands")
    .select("driver_key, metric_key, label, unit, ideal_min, ideal_max, higher_is_better, weight, sort_order")
    .order("sort_order", { ascending: true });

  return ((data ?? []) as {
    driver_key: string; metric_key: string; label: string; unit: string;
    ideal_min: number | null; ideal_max: number | null;
    higher_is_better: boolean; weight: number; sort_order: number;
  }[]).map((row) => ({
    driverKey: row.driver_key,
    metricKey: row.metric_key,
    label: row.label,
    unit: row.unit,
    idealMin: row.ideal_min === null ? null : Number(row.ideal_min),
    idealMax: row.ideal_max === null ? null : Number(row.ideal_max),
    higherIsBetter: row.higher_is_better,
    weight: Number(row.weight),
    sortOrder: row.sort_order,
  }));
}
