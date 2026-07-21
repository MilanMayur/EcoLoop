import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AI_INPUT_PROMPTS, AI_PROMPTS } from "@/lib/ai-prompts";
import type { AIAction, DeterministicSmartScore } from "@/types/ai";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["analyzeInventory", "analyzeWasteImage", "generateSmartScore", "generateRecommendations", "generateWeeklyReport", "chatAssistant"]),
  payload: z.unknown(),
});

const inventoryItemSchema = z.object({
  id: z.string().max(120), name: z.string().min(1).max(120), stock: z.number().nonnegative().max(1_000_000), unit: z.string().max(20),
  expiry: z.string().max(80), price: z.number().nonnegative().max(10_000_000), forecast: z.number().nonnegative().max(1_000_000), risk: z.string().max(30),
});
const inventoryPayloadSchema = z.object({ inventory: z.array(inventoryItemSchema).max(100), previousPickups: z.array(z.record(z.string(), z.unknown())).max(100).optional(), recentWasteTrends: z.array(z.record(z.string(), z.unknown())).max(50).optional() });
const imagePayloadSchema = z.object({ imageDataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(7_100_000) });
const scorePayloadSchema = z.object({ score: z.number().int().min(0).max(100), status: z.enum(["Needs attention", "Developing", "Good", "Excellent"]), metrics: z.object({ inventoryEfficiency: z.number(), wasteReduction: z.number(), timelyPickups: z.number(), recyclingParticipation: z.number(), sustainability: z.number() }) });
const rolePayloadSchema = z.object({ role: z.enum(["vendor", "recycler", "driver", "admin"]), context: z.unknown() });
const reportPayloadSchema = rolePayloadSchema.extend({ period: z.enum(["weekly", "monthly"]) });
const chatPayloadSchema = z.object({ role: z.enum(["vendor", "recycler", "driver", "admin"]), message: z.string().trim().min(1).max(800), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) })).max(10).optional(), context: z.unknown().optional() });

const schemas = {
  analyzeInventory: { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, overstock: { type: "array", items: { type: "object", additionalProperties: false, properties: { product: { type: "string" }, excess: { type: "number" }, unit: { type: "string" }, reason: { type: "string" } }, required: ["product", "excess", "unit", "reason"] } }, purchaseRecommendations: { type: "array", items: { type: "string" } }, wastePreventionTips: { type: "array", items: { type: "string" } }, estimatedSavings: { type: "number" }, priority: { type: "string", enum: ["Low", "Medium", "High"] }, confidence: { type: "number", minimum: 0, maximum: 100 } }, required: ["summary", "overstock", "purchaseRecommendations", "wastePreventionTips", "estimatedSavings", "priority", "confidence"] },
  analyzeWasteImage: { type: "object", additionalProperties: false, properties: { detectedWasteType: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 100 }, estimatedFillLevel: { type: "string", enum: ["75%", "100% (Full)", "Overflowing"] }, possibleContamination: { type: "array", items: { type: "string" } }, suggestedRecycler: { type: "string" }, explanation: { type: "string" } }, required: ["detectedWasteType", "confidence", "estimatedFillLevel", "possibleContamination", "suggestedRecycler", "explanation"] },
  generateSmartScore: { type: "object", additionalProperties: false, properties: { explanation: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } } }, required: ["explanation", "recommendations"] },
  generateRecommendations: { type: "object", additionalProperties: false, properties: { insights: { type: "array", items: { type: "string" } }, priorityAction: { type: "string" } }, required: ["insights", "priorityAction"] },
  generateWeeklyReport: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, summary: { type: "string" }, highlights: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } } }, required: ["title", "summary", "highlights", "risks", "recommendations"] },
  chatAssistant: { type: "object", additionalProperties: false, properties: { reply: { type: "string" }, suggestedActions: { type: "array", items: { type: "string" } } }, required: ["reply", "suggestedActions"] },
} as const;

type RawResponse = { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ function?: { arguments?: string } }> } }>; error?: { message?: string } };
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function validatePayload(action: AIAction, payload: unknown) {
  if (action === "analyzeInventory") return inventoryPayloadSchema.parse(payload);
  if (action === "analyzeWasteImage") return imagePayloadSchema.parse(payload);
  if (action === "generateSmartScore") return scorePayloadSchema.parse(payload);
  if (action === "generateRecommendations") return rolePayloadSchema.parse(payload);
  if (action === "generateWeeklyReport") return reportPayloadSchema.parse(payload);
  return chatPayloadSchema.parse(payload);
}

async function authenticatedUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

function checkRateLimit(userId: string) {
  const now = Date.now();
  const current = rateLimits.get(userId);
  if (!current || current.resetAt <= now) { rateLimits.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function outputText(response: RawResponse) {
  return response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text ?? response.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? response.choices?.[0]?.message?.content;
}

async function callGroq(action: AIAction, payload: unknown) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const isImage = action === "analyzeWasteImage";
  const body = isImage
    ? {
        model: process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b",
        messages: [
          { role: "system", content: `${AI_PROMPTS[action]}\nAnalyze the image, then call submit_waste_analysis with concise field values.` },
          {
            role: "user",
            content: [
              { type: "text", text: AI_INPUT_PROMPTS.analyzeWasteImage },
              { type: "image_url", image_url: { url: (payload as { imageDataUrl: string }).imageDataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_waste_analysis",
              description: "Submit the structured EcoLoop waste-image analysis.",
              parameters: schemas.analyzeWasteImage,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_waste_analysis" } },
        temperature: 0.2,
        top_p: 0.8,
        max_completion_tokens: 900,
      }
    : {
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        instructions: AI_PROMPTS[action],
        input: JSON.stringify(payload),
        text: { format: { type: "json_schema", name: `ecoloop_${action}`, strict: true, schema: schemas[action] } },
        max_output_tokens: action === "generateWeeklyReport" ? 1400 : 900,
      };
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(isImage ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.groq.com/openai/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const json = await response.json() as RawResponse;
      if (!response.ok) {
        lastError = new Error(json.error?.message || `Groq request failed (${response.status}).`);
        if ((response.status === 429 || response.status >= 500) && attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 500)); continue; }
        throw lastError;
      }
      const text = outputText(json);
      if (!text) throw new Error("The AI response was empty.");
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI request failed.");
      if (attempt === 0 && (lastError.name === "AbortError" || lastError.message.includes("fetch"))) { await new Promise((resolve) => setTimeout(resolve, 500)); continue; }
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("AI request failed.");
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 7_500_000) return NextResponse.json({ error: "The AI request is too large." }, { status: 413 });
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!checkRateLimit(user.id)) return NextResponse.json({ error: "AI request limit reached. Please wait a minute and try again." }, { status: 429 });
    const parsed = requestSchema.parse(await request.json());
    const payload = validatePayload(parsed.action, parsed.payload);
    if (parsed.action !== "analyzeWasteImage" && JSON.stringify(payload).length > 120_000) return NextResponse.json({ error: "The AI context is too large." }, { status: 413 });
    const result = await callGroq(parsed.action, payload);
    if (parsed.action === "generateSmartScore") return NextResponse.json({ ...(payload as DeterministicSmartScore), ...result });
    if (parsed.action === "generateWeeklyReport") return NextResponse.json({ ...result, generatedAt: new Date().toISOString() });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid AI request.", details: error.issues.slice(0, 4) }, { status: 400 });
    const message = error instanceof Error ? error.message : "AI is temporarily unavailable.";
    if (message === "AI_NOT_CONFIGURED") return NextResponse.json({ error: "EcoLoop AI is not configured yet." }, { status: 503 });
    if (error instanceof Error && error.name === "AbortError") return NextResponse.json({ error: "EcoLoop AI timed out. Please try again." }, { status: 504 });
    return NextResponse.json({ error: message.slice(0, 240) }, { status: 502 });
  }
}
