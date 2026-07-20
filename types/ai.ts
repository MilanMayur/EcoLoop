import type { DashboardRole, StockProduct } from "@/types/dashboard";
import type { FillLevel, PickupRequest, WasteTrendPoint } from "@/types/mvp";

export type AIAction = "analyzeInventory" | "analyzeWasteImage" | "generateSmartScore" | "generateRecommendations" | "generateWeeklyReport" | "chatAssistant";

export type InventoryAIContext = {
  inventory: StockProduct[];
  previousPickups?: Pick<PickupRequest, "waste" | "fillLevel" | "actualWeight" | "status" | "time">[];
  recentWasteTrends?: WasteTrendPoint[];
};

export type InventoryAIAnalysis = {
  summary: string;
  overstock: Array<{ product: string; excess: number; unit: string; reason: string }>;
  purchaseRecommendations: string[];
  wastePreventionTips: string[];
  estimatedSavings: number;
  priority: "Low" | "Medium" | "High";
  confidence: number;
};

export type WasteImageAnalysis = {
  detectedWasteType: string;
  confidence: number;
  estimatedFillLevel: FillLevel;
  possibleContamination: string[];
  suggestedRecycler: string;
  explanation: string;
};

export type SmartScoreMetrics = {
  inventoryEfficiency: number;
  wasteReduction: number;
  timelyPickups: number;
  recyclingParticipation: number;
  sustainability: number;
};

export type DeterministicSmartScore = {
  score: number;
  metrics: SmartScoreMetrics;
  status: "Needs attention" | "Developing" | "Good" | "Excellent";
};

export type SmartScoreExplanation = DeterministicSmartScore & {
  explanation: string[];
  recommendations: string[];
};

export type DashboardAIInsights = {
  insights: string[];
  priorityAction: string;
};

export type AIReport = {
  title: string;
  summary: string;
  highlights: string[];
  risks: string[];
  recommendations: string[];
  generatedAt: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatAssistantResult = { reply: string; suggestedActions: string[] };

export type AIRequest =
  | { action: "analyzeInventory"; payload: InventoryAIContext }
  | { action: "analyzeWasteImage"; payload: { imageDataUrl: string } }
  | { action: "generateSmartScore"; payload: DeterministicSmartScore }
  | { action: "generateRecommendations"; payload: { role: DashboardRole; context: unknown } }
  | { action: "generateWeeklyReport"; payload: { role: DashboardRole; period: "weekly" | "monthly"; context: unknown } }
  | { action: "chatAssistant"; payload: { role: DashboardRole; message: string; history?: ChatMessage[]; context?: unknown } };

export type AIResponseMap = {
  analyzeInventory: InventoryAIAnalysis;
  analyzeWasteImage: WasteImageAnalysis;
  generateSmartScore: SmartScoreExplanation;
  generateRecommendations: DashboardAIInsights;
  generateWeeklyReport: AIReport;
  chatAssistant: ChatAssistantResult;
};
