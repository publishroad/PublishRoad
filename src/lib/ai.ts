import OpenAI from "openai";
import { db } from "./db";
import { getCachedWithLock, CacheKeys, CacheTTL } from "./cache";
import { decryptField } from "./server-utils";

// ─────────────────────────────────────────────
// Load AI config from DB (cached 5min)
// ─────────────────────────────────────────────
interface AiConfigData {
  baseUrl: string;
  apiKey: string; // decrypted
  modelName: string;
  maxTokens: number;
  temperature: number;
}

export async function getAiConfig(): Promise<AiConfigData> {
  return getCachedWithLock(
    CacheKeys.aiConfig,
    CacheTTL.AI_CONFIG,
    async () => {
      const config = await db.aiConfig.findUnique({
        where: { id: "default" },
      });
      if (!config) {
        throw new Error(
          "AI config not set. Please configure it in Admin > Settings."
        );
      }
      return {
        baseUrl: config.baseUrl,
        apiKey: decryptField(config.apiKey),
        modelName: config.modelName,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      };
    }
  );
}

// ─────────────────────────────────────────────
// OpenAI-compatible client factory
// ─────────────────────────────────────────────
export async function getAiClient(): Promise<OpenAI> {
  const config = await getAiConfig();
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });
}

// ─────────────────────────────────────────────
// Generic AI call
// ─────────────────────────────────────────────
export async function callAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const config = await getAiConfig();
  const client = await getAiClient();

  const response = await client.chat.completions.create({
    model: config.modelName,
    messages,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");
  return content;
}

// ─────────────────────────────────────────────
// Test AI connection (used by admin settings page)
// ─────────────────────────────────────────────
export async function testAiConnection({
  baseUrl,
  apiKey,
  modelName,
}: {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const client = new OpenAI({ baseURL: baseUrl, apiKey });
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: "Say 'ok' in JSON: {\"status\": \"ok\"}" }],
      max_tokens: 10,
    });
    const content = response.choices[0]?.message?.content ?? "";
    return { success: content.length > 0, message: "Connection successful" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

// ─────────────────────────────────────────────
// Curation matching prompt builder
// ─────────────────────────────────────────────
interface WebsiteCandidate {
  id: string;
  name: string;
  url: string;
  type: string;
  da: number;
  pa: number;
  spamScore: number;
  traffic: number;
  description?: string | null;
  tagSlugs: string[];
}

interface MatchResult {
  websiteId: string;
  matchScore: number; // 0.0 - 1.0
  matchReason: string;
  section: "a" | "b" | "c"; // a=distribution, b=guest_post, c=press_release
  rank: number;
}

export async function rankWebsitesForCuration(
  product: {
    productUrl: string;
    keywords: string[];
    description: string;
    countryName?: string;
    categoryName?: string;
  },
  candidates: WebsiteCandidate[]
): Promise<MatchResult[]> {
  if (candidates.length === 0) return [];

  const prompt = buildMatchingPrompt(product, candidates);
  const config = await getAiConfig();

  const raw = await callAI(
    [
      {
        role: "system",
        content: `You are an expert product launch strategist. Your job is to rank websites for product distribution.
Always respond with valid JSON only. No markdown, no explanations outside the JSON structure.`,
      },
      { role: "user", content: prompt },
    ],
    { maxTokens: config.maxTokens }
  );

  return parseMatchingResponse(raw);
}

function buildMatchingPrompt(
  product: {
    productUrl: string;
    keywords: string[];
    description: string;
    countryName?: string;
    categoryName?: string;
  },
  candidates: WebsiteCandidate[]
): string {
  const websiteList = candidates
    .slice(0, 150) // Limit to avoid token overflow
    .map(
      (w, i) =>
        `${i + 1}. ID:${w.id} | Name:${w.name} | URL:${w.url} | Type:${w.type} | DA:${w.da} | PA:${w.pa} | Spam:${w.spamScore} | Traffic:${w.traffic} | Tags:${w.tagSlugs.join(",")} | Desc:${w.description?.slice(0, 100) ?? "N/A"}`
    )
    .join("\n");

  return `
Product to launch:
- URL: ${product.productUrl}
- Keywords: ${product.keywords.join(", ")}
- Description: ${product.description}
${product.countryName ? `- Target country: ${product.countryName}` : ""}
${product.categoryName ? `- Target category: ${product.categoryName}` : ""}

Available websites (${candidates.length} total):
${websiteList}

Task: Select the top 50 most relevant websites for this product launch and rank them.
- Section A (distribution): Product hunt, app directories, listing sites where you submit the product
- Section B (guest_post): Blogs, publications where you can write guest posts or get backlinks
- Section C (press_release): Press release distribution, news sites, PR platforms

Return ONLY this JSON structure:
{
  "results": [
    {
      "websiteId": "the-id",
      "matchScore": 0.95,
      "matchReason": "Brief reason why this site is relevant (max 100 chars)",
      "section": "a",
      "rank": 1
    }
  ]
}

Rules:
- matchScore: 0.0 to 1.0 (1.0 = perfect match)
- rank: sequential within each section, starting from 1
- Include maximum 20 sites per section
- Only include sites with matchScore >= 0.4
- Return valid JSON only
`;
}

function parseMatchingResponse(raw: string): MatchResult[] {
  try {
    const parsed = JSON.parse(raw);
    const results = parsed.results;
    if (!Array.isArray(results)) return [];

    return results
      .filter(
        (r: unknown) =>
          r &&
          typeof r === "object" &&
          "websiteId" in (r as object) &&
          "matchScore" in (r as object) &&
          "section" in (r as object)
      )
      .map((r: Record<string, unknown>) => ({
        websiteId: String(r.websiteId),
        matchScore: Math.min(1, Math.max(0, Number(r.matchScore))),
        matchReason: String(r.matchReason ?? "").slice(0, 200),
        section: (["a", "b", "c"].includes(String(r.section))
          ? r.section
          : "a") as "a" | "b" | "c",
        rank: Number(r.rank) || 1,
      }));
  } catch {
    throw new Error("AI returned invalid JSON response");
  }
}
