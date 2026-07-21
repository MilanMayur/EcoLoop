import type { FillLevel } from "@/types/mvp";

export const STANDARD_BIN_CAPACITY_KG = 120;

const fillMultiplier: Record<FillLevel, number> = {
  "75%": 0.75,
  "100% (Full)": 1,
  Overflowing: 1.2,
};

export function estimatedPickupWeightKg(fillLevel: FillLevel) {
  return Math.round(STANDARD_BIN_CAPACITY_KG * fillMultiplier[fillLevel]);
}
