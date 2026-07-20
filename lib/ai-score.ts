import type { StockProduct } from "@/types/dashboard";
import type { PickupRequest } from "@/types/mvp";
import type { DeterministicSmartScore, SmartScoreMetrics } from "@/types/ai";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

export function calculateSmartScore(metrics: SmartScoreMetrics): DeterministicSmartScore {
  const normalized = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, clamp(value)])) as SmartScoreMetrics;
  const score = clamp(
    normalized.inventoryEfficiency * .25
    + normalized.wasteReduction * .2
    + normalized.timelyPickups * .2
    + normalized.recyclingParticipation * .15
    + normalized.sustainability * .2,
  );
  const status = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Developing" : "Needs attention";
  return { score, metrics: normalized, status };
}

export function deriveSmartScore(inventory: StockProduct[], pickups: PickupRequest[]): DeterministicSmartScore {
  const totalStock = inventory.reduce((sum, item) => sum + Math.max(0, item.stock), 0);
  const totalForecast = inventory.reduce((sum, item) => sum + Math.max(0, Math.min(item.forecast, item.stock)), 0);
  const excess = inventory.reduce((sum, item) => sum + Math.max(0, item.stock - item.forecast), 0);
  const completed = pickups.filter((item) => item.status.toLowerCase() === "completed");
  const activeOrCompleted = pickups.filter((item) => item.status.toLowerCase() !== "pending");
  const measuredCompleted = completed.filter((item) => Number(item.actualWeight) > 0);

  const inventoryEfficiency = totalStock ? totalForecast / totalStock * 100 : 0;
  const wasteReduction = totalStock ? (1 - excess / totalStock) * 100 : 0;
  const timelyPickups = pickups.length ? completed.length / pickups.length * 100 : 0;
  const recyclingParticipation = activeOrCompleted.length ? measuredCompleted.length / activeOrCompleted.length * 100 : 0;
  const sustainability = (wasteReduction + recyclingParticipation) / 2;

  return calculateSmartScore({ inventoryEfficiency, wasteReduction, timelyPickups, recyclingParticipation, sustainability });
}
