import { stockAlerts, stockForecasts, stockProducts } from "@/data/smart-stock";
import type { StockProduct, StockRisk } from "@/types/dashboard";
import type { InventoryInput } from "@/types/mvp";
import { serviceRequest, ServiceError } from "@/services/http.service";

let inventoryStore: StockProduct[] = stockProducts.map((item) => ({ ...item }));

const riskFor = (stock: number, forecast: number): StockRisk => {
  const excess = stock - forecast;
  return excess >= 6 ? "High" : excess >= 2 ? "Medium" : "Low";
};

const enrich = (payload: InventoryInput, id: string): StockProduct => {
  const forecast = Math.max(1, Math.round(payload.stock * 0.82));
  return { ...payload, id, forecast, risk: riskFor(payload.stock, forecast) };
};

export const inventoryService = {
  getInventory() {
    return serviceRequest("/inventory", { method: "GET" }, () => inventoryStore.map((item) => ({ ...item })));
  },
  createInventory(payload: InventoryInput) {
    return serviceRequest("/inventory", { method: "POST", body: payload }, () => {
      const product = enrich(payload, `STK-${Date.now()}`);
      inventoryStore = [product, ...inventoryStore];
      return product;
    });
  },
  updateInventory(id: string, payload: InventoryInput) {
    return serviceRequest(`/inventory/${id}`, { method: "PATCH", body: payload }, () => {
      if (!inventoryStore.some((item) => item.id === id)) throw new ServiceError("Inventory item not found.", 404);
      const product = enrich(payload, id);
      inventoryStore = inventoryStore.map((item) => item.id === id ? product : item);
      return product;
    });
  },
  deleteInventory(id: string) {
    return serviceRequest(`/inventory/${id}`, { method: "DELETE" }, () => {
      inventoryStore = inventoryStore.filter((item) => item.id !== id);
      return { success: true as const, id };
    });
  },
  getForecasts() {
    return serviceRequest("/inventory/forecasts", { method: "GET" }, () => stockForecasts.map((item) => ({ ...item })));
  },
  getAlerts() {
    return serviceRequest("/inventory/alerts", { method: "GET" }, () => stockAlerts.map((item) => ({ ...item })));
  },
  resolveAlert(product: string, action: string) {
    return serviceRequest("/inventory/alerts/actions", { method: "POST", body: { product, action } }, () => ({ success: true as const, product, action }));
  },
  getAdvisorInsights() {
    return serviceRequest("/inventory/advisor/insights", { method: "GET" }, () => [
      "You have overstocked tomatoes by approximately 15%.",
      "Customer demand on Mondays is about 20% lower than your weekly average.",
      "Reduce tomorrow’s tomato purchase to 35 kg.",
      "A 15% discount after 6 PM could prevent approximately 8 kg of waste.",
      "Unsold organic stock can be routed to a verified composting partner.",
    ]);
  },
  askAdvisor(message: string) {
    return serviceRequest("/inventory/advisor", { method: "POST", body: { message } }, () => ({ reply: "Based on today’s forecast, prioritise bananas and tomatoes. A 15% evening offer could recover approximately ₹662 and prevent 17 kg of waste." }));
  },
};
