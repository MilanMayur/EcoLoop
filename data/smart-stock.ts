import type { StockProduct } from "@/types/dashboard";

export const stockProducts: StockProduct[] = [
  { id: "STK-101", name: "Tomatoes", stock: 45, unit: "kg", expiry: "Tomorrow", price: 32, forecast: 36, risk: "Medium" },
  { id: "STK-102", name: "Onions", stock: 30, unit: "kg", expiry: "5 days", price: 28, forecast: 27, risk: "Low" },
  { id: "STK-103", name: "Bananas", stock: 18, unit: "kg", expiry: "Today", price: 55, forecast: 11, risk: "High" },
  { id: "STK-104", name: "Potatoes", stock: 24, unit: "kg", expiry: "7 days", price: 30, forecast: 22, risk: "Low" },
  { id: "STK-105", name: "Cauliflower", stock: 12, unit: "kg", expiry: "Tomorrow", price: 48, forecast: 8, risk: "High" },
  { id: "STK-106", name: "Beans", stock: 8, unit: "kg", expiry: "2 days", price: 72, forecast: 7, risk: "Medium" },
  { id: "STK-107", name: "Cabbage", stock: 5, unit: "kg", expiry: "3 days", price: 38, forecast: 6, risk: "Low" },
  { id: "STK-108", name: "Capsicum", stock: 3, unit: "kg", expiry: "2 days", price: 84, forecast: 2, risk: "Medium" },
];

export const stockForecasts = [
  { product: "Tomatoes", expected: 36, recommended: 35, planned: 50, confidence: 94 },
  { product: "Bananas", expected: 12, recommended: 10, planned: 18, confidence: 96 },
  { product: "Cauliflower", expected: 8, recommended: 8, planned: 14, confidence: 89 },
];

export const stockAlerts = [
  { product: "Bananas", stock: 18, sales: 10, waste: 8, value: 440, severity: "High" },
  { product: "Cauliflower", stock: 12, sales: 8, waste: 4, value: 192, severity: "High" },
  { product: "Tomatoes", stock: 45, sales: 36, waste: 9, value: 288, severity: "Medium" },
];
