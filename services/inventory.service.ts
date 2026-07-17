import { stockAlerts, stockForecasts, stockProducts } from "@/data/smart-stock";
import type { StockProduct, StockRisk } from "@/types/dashboard";
import type { InventoryInput } from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import { mockDelay, optionalSupabase, requireUser, throwDatabaseError } from "@/services/supabase.data";

type InventoryRow = {
  id: string;
  name: string;
  stock: number | string;
  unit: "kg" | "crate";
  expiry_date: string;
  price: number | string;
  forecast: number | string;
  risk: StockRisk;
};

let inventoryStore: StockProduct[] = stockProducts.map((item) => ({ ...item }));

const riskFor = (stock: number, forecast: number): StockRisk => {
  const excess = stock - forecast;
  return excess >= 6 ? "High" : excess >= 2 ? "Medium" : "Low";
};

const enrich = (payload: InventoryInput, id: string): StockProduct => {
  const forecast = Math.max(1, Math.round(payload.stock * 0.82));
  return { ...payload, id, forecast, risk: riskFor(payload.stock, forecast) };
};

const fromRow = (row: InventoryRow): StockProduct => ({
  id: row.id,
  name: row.name,
  stock: Number(row.stock),
  unit: row.unit,
  expiry: row.expiry_date,
  price: Number(row.price),
  forecast: Number(row.forecast),
  risk: row.risk,
});

const inventorySelect = "id, name, stock, unit, expiry_date, price, forecast, risk";

export const inventoryService = {
  async getInventory() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return inventoryStore.map((item) => ({ ...item })); }
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("inventory_items").select(inventorySelect)
      .eq("vendor_id", user.id).order("updated_at", { ascending: false });
    throwDatabaseError(error, "Inventory could not be loaded.");
    return (data as InventoryRow[]).map(fromRow);
  },

  async createInventory(payload: InventoryInput) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const product = enrich(payload, `STK-${Date.now()}`);
      inventoryStore = [product, ...inventoryStore];
      return product;
    }
    const user = await requireUser(supabase);
    const enriched = enrich(payload, "");
    const { data, error } = await supabase.from("inventory_items").insert({
      vendor_id: user.id,
      name: payload.name,
      stock: payload.stock,
      unit: payload.unit,
      expiry_date: payload.expiry,
      price: payload.price,
      forecast: enriched.forecast,
      risk: enriched.risk,
    }).select(inventorySelect).single();
    throwDatabaseError(error, "The inventory item could not be created.");
    return fromRow(data as InventoryRow);
  },

  async updateInventory(id: string, payload: InventoryInput) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      if (!inventoryStore.some((item) => item.id === id)) throw new ServiceError("Inventory item not found.", 404);
      const product = enrich(payload, id);
      inventoryStore = inventoryStore.map((item) => item.id === id ? product : item);
      return product;
    }
    const user = await requireUser(supabase);
    const enriched = enrich(payload, id);
    const { data, error } = await supabase.from("inventory_items").update({
      name: payload.name,
      stock: payload.stock,
      unit: payload.unit,
      expiry_date: payload.expiry,
      price: payload.price,
      forecast: enriched.forecast,
      risk: enriched.risk,
    }).eq("id", id).eq("vendor_id", user.id).select(inventorySelect).maybeSingle();
    throwDatabaseError(error, "The inventory item could not be updated.");
    if (!data) throw new ServiceError("Inventory item not found.", 404);
    return fromRow(data as InventoryRow);
  },

  async deleteInventory(id: string) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      inventoryStore = inventoryStore.filter((item) => item.id !== id);
      return { success: true as const, id };
    }
    const user = await requireUser(supabase);
    const { error } = await supabase.from("inventory_items").delete().eq("id", id).eq("vendor_id", user.id);
    throwDatabaseError(error, "The inventory item could not be deleted.");
    return { success: true as const, id };
  },

  async getForecasts() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return stockForecasts.map((item) => ({ ...item })); }
    const products = await this.getInventory();
    return products.slice(0, 8).map((item) => ({
      product: item.name,
      expected: item.forecast,
      recommended: Math.max(0, Math.round(item.forecast * 0.96)),
      planned: item.stock,
      confidence: item.risk === "Low" ? 94 : item.risk === "Medium" ? 89 : 82,
    }));
  },

  async getAlerts() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return stockAlerts.map((item) => ({ ...item })); }
    const products = await this.getInventory();
    return products.filter((item) => item.risk !== "Low").map((item) => {
      const waste = Math.max(0, item.stock - item.forecast);
      return {
        product: item.name,
        stock: item.stock,
        sales: item.forecast,
        waste,
        value: Math.round(waste * item.price),
        severity: item.risk,
      };
    });
  },

  async resolveAlert(product: string, action: string) {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return { success: true as const, product, action }; }
    const user = await requireUser(supabase);
    const { data: item } = await supabase.from("inventory_items").select("id").eq("vendor_id", user.id).eq("name", product).maybeSingle();
    const { error } = await supabase.from("stock_alert_actions").insert({
      vendor_id: user.id,
      inventory_id: item?.id ?? null,
      product_name: product,
      action,
    });
    throwDatabaseError(error, "The stock action could not be saved.");
    return { success: true as const, product, action };
  },

  async getAdvisorInsights() {
    const products = await this.getInventory();
    if (!products.length) return ["Add inventory items to receive planning and waste-prevention recommendations."];
    const risky = [...products].sort((a, b) => (b.stock - b.forecast) - (a.stock - a.forecast)).slice(0, 3);
    return risky.map((item) => {
      const excess = Math.max(0, item.stock - item.forecast);
      return excess > 0
        ? `${item.name} is approximately ${excess} ${item.unit} above forecast demand.`
        : `${item.name} is aligned with forecast demand.`;
    });
  },

  async askAdvisor(message: string) {
    const products = await this.getInventory();
    const risky = [...products].sort((a, b) => (b.stock - b.forecast) - (a.stock - a.forecast))[0];
    if (!risky) return { reply: "Add current inventory first, then I can recommend purchase and waste-prevention actions." };
    const excess = Math.max(0, risky.stock - risky.forecast);
    const topic = message.toLowerCase();
    if (topic.includes("purchase") || topic.includes("tomorrow")) {
      return { reply: `Plan around ${risky.forecast} ${risky.unit} of ${risky.name}; current stock is ${risky.stock} ${risky.unit}.` };
    }
    return { reply: excess > 0
      ? `Prioritise ${risky.name}. An evening offer or transfer could protect approximately ₹${Math.round(excess * risky.price)} of stock.`
      : "Current stock is close to forecast demand. Continue monitoring expiry dates before adding more inventory." };
  },
};
