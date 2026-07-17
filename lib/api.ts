import { authService } from "@/services/auth.service";
import { inventoryService } from "@/services/inventory.service";
import { pickupService } from "@/services/pickup.service";

/** @deprecated Import the focused service directly. Kept temporarily for route compatibility. */
export const api = {
  login: authService.login,
  signup: authService.signup,
  createPickup: pickupService.createPickup,
  acceptJob: pickupService.acceptJob,
  updateProfile: authService.updateProfile,
  addStockProduct: inventoryService.createInventory,
};
