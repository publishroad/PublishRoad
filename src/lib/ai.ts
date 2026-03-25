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

interface InfluencerCandidate {
  id: string;
  name: string;
  platform: string;
  followersCount: number;
  categorySlugs: string[];
  tagSlugs: string[];
  description?: string | null;
  profileLink: string;
}

interface RedditCandidate {
  id: string;
  name: string;
  url: string;
  totalMembers: number;
  weeklyVisitors: number;
  postingDifficulty?: string | null;
  categorySlugs: string[];
  tagSlugs: string[];
  description?: string | null;
}

interface FundCandidate {
  id: string;
  name: string;
  websiteUrl: string;
  investmentStage?: string | null;
  ticketSize?: string | null;
  categorySlugs: string[];
  tagSlugs: string[];
  description?: string | null;
}

interface MatchResult {
  websiteId?: string;
  influencerId?: string;
  redditChannelId?: string;
  fundId?: string;
  matchScore: number; // 0.0 - 1.0
  matchReason: string;
  section: "a" | "b" | "c" | "d" | "e" | "f";
  rank: number;
}

export async function rankAllCandidatesForCuration(
  product: {
    productUrl: string;
    keywords: string[];
    description: string;
    countryName?: string;
    categoryName?: string;
  },
  candidates: {
    websites: WebsiteCandidate[];
    influencers: InfluencerCandidate[];
    redditChannels: RedditCandidate[];
    funds: FundCandidate[];
  }
): Promise<MatchResult[]> {
  const total =
    candidates.websites.length +
    candidates.influencers.length +
    candidates.redditChannels.length +
    candidates.funds.length;
  if (total === 0) return [];

  const prompt = buildMatchingPrompt(product, candidates);
  const config = await getAiConfig();

  const raw = await callAI(
    [
      {
        role: "system",
        content: `You are an expert product launch strategist. Your job is to rank websites, influencers, reddit communities, and investors for product distribution.
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
  candidates: {
    websites: WebsiteCandidate[];
    influencers: InfluencerCandidate[];
    redditChannels: RedditCandidate[];
    funds: FundCandidate[];
  }
): string {
  const websiteList = candidates.websites
    .slice(0, 100)
    .map(
      (w, i) =>
        `${i + 1}. ID:W:${w.id} | Name:${w.name} | URL:${w.url} | Type:${w.type} | DA:${w.da} | PA:${w.pa} | Spam:${w.spamScore} | Traffic:${w.traffic} | Tags:${w.tagSlugs.join(",")} | Desc:${w.description?.slice(0, 100) ?? "N/A"}`
    )
    .join("\n");

  const influencerList = candidates.influencers
    .slice(0, 50)
    .map(
      (inf, i) =>
        `${i + 1}. ID:I:${inf.id} | Name:${inf.name} | Platform:${inf.platform} | Followers:${inf.followersCount.toLocaleString()} | Categories:${inf.categorySlugs.join(",")} | Tags:${inf.tagSlugs.join(",")} | Desc:${inf.description?.slice(0, 100) ?? "N/A"}`
    )
    .join("\n");

  const redditList = candidates.redditChannels
    .slice(0, 50)
    .map(
      (r, i) =>
        `${i + 1}. ID:R:${r.id} | Name:${r.name} | URL:${r.url} | Members:${r.totalMembers.toLocaleString()} | WeeklyVisitors:${r.weeklyVisitors.toLocaleString()} | Difficulty:${r.postingDifficulty ?? "N/A"} | Categories:${r.categorySlugs.join(",")} | Tags:${r.tagSlugs.join(",")}`
    )
    .join("\n");

  const fundList = candidates.funds
    .slice(0, 30)
    .map(
      (f, i) =>
        `${i + 1}. ID:F:${f.id} | Name:${f.name} | Stage:${f.investmentStage ?? "N/A"} | TicketSize:${f.ticketSize ?? "N/A"} | Categories:${f.categorySlugs.join(",")} | Tags:${f.tagSlugs.join(",")} | Desc:${f.description?.slice(0, 100) ?? "N/A"}`
    )
    .join("\n");

  return `
Product to launch:
- URL: ${product.productUrl}
- Keywords: ${product.keywords.join(", ")}
- Description: ${product.description}
${product.countryName ? `- Target country: ${product.countryName}` : ""}
${product.categoryName ? `- Target category: ${product.categoryName}` : ""}

${candidates.websites.length > 0 ? `Available websites (${candidates.websites.length} total, use ID prefix W:):
${websiteList}` : ""}

${candidates.influencers.length > 0 ? `Available social influencers (${candidates.influencers.length} total, use ID prefix I:):
${influencerList}` : ""}

${candidates.redditChannels.length > 0 ? `Available reddit communities (${candidates.redditChannels.length} total, use ID prefix R:):
${redditList}` : ""}

${candidates.funds.length > 0 ? `Available investors/funds (${candidates.funds.length} total, use ID prefix F:):
${fundList}` : ""}

Task: Select the most relevant items from ALL categories above for this product launch and rank them.
- Section A (distribution): Product directories, app listings, submission sites where you submit the product
- Section B (guest_post): Blogs and publications for guest posts or backlinks
- Section C (press_release): Press release distribution and news sites
- Section D (social_influencer): Social media influencers to reach out to for product promotion
- Section E (reddit_channel): Subreddits where the target audience is active and posting is viable
- Section F (fund): Investors or funds that match the product's stage and category

IMPORTANT: Use the FULL prefixed ID (e.g., "W:abc123", "I:xyz789", "R:def456", "F:ghi012") in the entityId field.

Return ONLY this JSON structure:
{
  "results": [
    {
      "entityId": "W:the-website-id",
      "matchScore": 0.95,
      "matchReason": "Brief reason why this is relevant (max 100 chars)",
      "section": "a",
      "rank": 1
    }
  ]
}

Rules:
- matchScore: 0.0 to 1.0 (1.0 = perfect match)
- rank: sequential within each section, starting from 1
- Include maximum 20 items per section
- Only include items with matchScore >= 0.4
- Only include sections D, E, F if relevant items exist
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
          ("entityId" in (r as object) || "websiteId" in (r as object)) &&
          "matchScore" in (r as object) &&
          "section" in (r as object)
      )
      .map((r: Record<string, unknown>): MatchResult | null => {
        const rawId = String(r.entityId ?? r.websiteId ?? "");
        const score = Math.min(1, Math.max(0, Number(r.matchScore)));
        const reason = String(r.matchReason ?? "").slice(0, 200);
        const section = (["a", "b", "c", "d", "e", "f"].includes(String(r.section))
          ? r.section
          : "a") as MatchResult["section"];
        const rank = Number(r.rank) || 1;

        if (rawId.startsWith("W:")) {
          return { websiteId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank };
        } else if (rawId.startsWith("I:")) {
          return { influencerId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank };
        } else if (rawId.startsWith("R:")) {
          return { redditChannelId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank };
        } else if (rawId.startsWith("F:")) {
          return { fundId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank };
        } else if (rawId.length > 0) {
          // Legacy fallback: bare ID without prefix → treat as websiteId
          return { websiteId: rawId, matchScore: score, matchReason: reason, section, rank };
        }
        return null;
      })
      .filter((r): r is MatchResult => r !== null);
  } catch {
    throw new Error("AI returned invalid JSON response");
  }
}
