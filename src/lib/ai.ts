import OpenAI from "openai";
import { db } from "./db";
import { getCachedWithLock, CacheKeys, CacheTTL } from "./cache";
import { decryptField } from "./server-utils";

const DEFAULT_AI_TIMEOUT_MS = Number(process.env.CURATION_AI_TIMEOUT_MS ?? 25000);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  });
}

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

  const response = await withTimeout(
    client.chat.completions.create({
      model: config.modelName,
      messages,
      max_tokens: options?.maxTokens ?? config.maxTokens,
      temperature: options?.temperature ?? config.temperature,
      response_format: { type: "json_object" },
    }),
    DEFAULT_AI_TIMEOUT_MS,
    "AI request timed out"
  );

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
// Keyword expansion + category inference
// ─────────────────────────────────────────────

export async function expandCurationIntent(input: {
  productUrl: string;
  problemStatement: string;
  solutionStatement: string;
  keywords: string[];
  availableCategories: { id: string; slug: string; name: string }[];
}): Promise<{ expandedKeywords: string[]; inferredCategoryId: string | null }> {
  const { productUrl, problemStatement, solutionStatement, keywords, availableCategories } = input;

  if (!problemStatement && !solutionStatement && keywords.length === 0) {
    return { expandedKeywords: [], inferredCategoryId: null };
  }

  const categoryList = availableCategories.map((c) => `${c.slug}=${c.name}`).join(", ");

  const prompt = `Analyze this product and extract keywords for matching against a distribution database.

Product URL: ${productUrl}
Problem it solves: ${problemStatement || "none"}
Solution offered: ${solutionStatement || "none"}
User-provided keywords: ${keywords.join(", ") || "none"}
Available categories: ${categoryList}

Derive keywords from: the problem domain, who experiences this problem, the solution type, the technology used, the target audience, and real-world use cases. Include the user-provided keywords.

Return ONLY this JSON (no other text):
{
  "expandedKeywords": ["10 to 15 lowercase hyphenated keyword slugs"],
  "inferredCategorySlug": "best matching slug from available categories, or null if unclear"
}`;

  try {
    const raw = await callAI(
      [{ role: "user", content: prompt }],
      { maxTokens: 400, temperature: 0.2 }
    );
    const parsed = JSON.parse(raw);
    const expanded: string[] = Array.isArray(parsed.expandedKeywords)
      ? parsed.expandedKeywords
          .filter((k: unknown) => typeof k === "string")
          .map((k: string) => k.toLowerCase().trim())
      : [];

    const inferredSlug =
      typeof parsed.inferredCategorySlug === "string" ? parsed.inferredCategorySlug : null;
    const matched = inferredSlug
      ? availableCategories.find((c) => c.slug === inferredSlug)
      : null;

    return {
      expandedKeywords: [...new Set([...keywords.map((k) => k.toLowerCase()), ...expanded])],
      inferredCategoryId: matched?.id ?? null,
    };
  } catch {
    // Graceful fallback — never block a curation due to expansion failure
    return {
      expandedKeywords: keywords.map((k) => k.toLowerCase()),
      inferredCategoryId: null,
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
  starRating?: number | null;
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
  starRating?: number | null;
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
  starRating?: number | null;
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
  starRating?: number | null;
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

// AI only ranks websites (sections A/B/C).
// Sections D/E/F are ranked by pre-score in the curation engine (category + country
// already guaranteed by DB hard filters — no need for AI to gatekeep them).
export async function rankWebsitesForCuration(
  product: ProductContext,
  websites: WebsiteCandidate[]
): Promise<MatchResult[]> {
  if (websites.length === 0) return [];

  try {
    const config = await getAiConfig();
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "system",
      content:
        "You are an expert product launch strategist. Rank items for product distribution. Always respond with valid JSON only. No markdown, no explanations outside JSON.",
    };

    return await callAI(
      [systemMessage, { role: "user", content: buildWebsiteMatchingPrompt(product, websites) }],
      { maxTokens: config.maxTokens, temperature: config.temperature }
    )
      .then(parseMatchingResponse)
      .catch(() => []);
  } catch {
    // Fail-open: missing AI config should not block curation.
    // The curation engine will apply deterministic website fallback for A/B/C.
    return [];
  }
}

type ProductContext = {
  productUrl: string;
  problemStatement: string;
  solutionStatement: string;
  keywords: string[];
  countryName?: string;
  categoryName?: string;
};

function productHeader(p: ProductContext): string {
  const lines = [
    `Product:`,
    `- URL: ${p.productUrl}`,
    `- Problem it solves: ${p.problemStatement}`,
    `- Solution offered: ${p.solutionStatement}`,
  ];
  if (p.categoryName) lines.push(`- Category: ${p.categoryName}`);
  if (p.countryName) lines.push(`- Target country: ${p.countryName}`);
  if (p.keywords.length > 0) lines.push(`- Keywords (supplementary): ${p.keywords.join(", ")}`);
  return lines.join("\n");
}

const JSON_RULES = `Rules:
- matchScore 0.0–1.0, only include >= 0.25
- STRICT LIMIT: max 20 per section, rank starts from 1 per section
- Return valid JSON only`;

const JSON_SCHEMA = `Return ONLY:
{
  "results": [
    { "entityId": "PREFIX:id", "matchScore": 0.95, "matchReason": "1–2 sentences: why this fits + what the user should do or say (max 160 chars)", "section": "x", "rank": 1 }
  ]
}`;

function buildWebsiteMatchingPrompt(p: ProductContext, websites: WebsiteCandidate[]): string {
  // Pre-split by type so the AI cannot misassign sections.
  // Section assignment is determined by the website's type field, not by the AI.
  const distribution  = websites.filter((w) => w.type === "distribution");
  const guestPost     = websites.filter((w) => w.type === "guest_post");
  const pressRelease  = websites.filter((w) => w.type === "press_release");

  const fmt = (w: WebsiteCandidate, i: number) => {
    const starLabel = w.starRating && w.starRating >= 4 ? ` ⭐PRIORITY(${w.starRating}★)` : "";
    return `${i + 1}. ID:W:${w.id} | Name:${w.name}${starLabel} | URL:${w.url} | DA:${w.da} | PA:${w.pa} | Spam:${w.spamScore} | Traffic:${w.traffic} | Tags:${w.tagSlugs.join(",")} | Desc:${w.description?.slice(0, 200) ?? "N/A"}`;
  };

  const sections = [
    distribution.length  > 0 ? `SECTION A — Distribution sites (use "section":"a" for all below):\n${distribution.map(fmt).join("\n")}` : null,
    guestPost.length     > 0 ? `SECTION B — Guest post & backlink sites (use "section":"b" for all below):\n${guestPost.map(fmt).join("\n")}` : null,
    pressRelease.length  > 0 ? `SECTION C — Press release & news sites (use "section":"c" for all below):\n${pressRelease.map(fmt).join("\n")}` : null,
  ].filter(Boolean).join("\n\n");

  return `${productHeader(p)}

${sections}

Task: From each section above, select the TOP 20 sites where this product could be SUCCESSFULLY LAUNCHED or promoted.
- PRIMARY signal: Does this site's audience experience the problem stated above, or actively seek this type of solution?
- SECONDARY signal: Are the site's tags/description aligned with the product's domain?
- TIEBREAKER only: DA/PA quality and low spam score
- The section value for each result MUST be exactly "a", "b", or "c" as labeled above
- matchReason must be 1–2 sentences tailored to the section type (max 160 chars):
  - Section A (distribution): why this directory fits + what to highlight in the listing
  - Section B (guest post): why this publication fits + what angle or topic to pitch
  - Section C (press release): why this outlet fits + what news hook to lead with

Platform compatibility check (CRITICAL — apply to every site before including it):
- Read each site's name and description carefully
- If a site is platform-specific or ecosystem-specific (e.g. a WordPress plugin directory, Shopify app store, Zoho marketplace, iOS app review site, Salesforce AppExchange, Chrome extension store, etc.), ONLY include it if the product's problem and solution clearly indicate it is built for that exact platform or ecosystem
- Sharing the same category (e.g. both tagged "SaaS") is NOT sufficient — the product must genuinely belong to that platform
- If the product IS built for that platform, these sites become highly relevant and should rank high
- If there is any platform mismatch, exclude the site entirely regardless of category or tag overlap

Priority sites (marked ⭐PRIORITY): These are admin-verified gold-standard sites for this category. Include them in results unless there is a clear platform or audience mismatch specific to this product. Category alignment alone is sufficient to include them — apply the platform check but give strong benefit of the doubt.

${JSON_SCHEMA}
${JSON_RULES}`;
}

function buildSocialMatchingPrompt(
  p: ProductContext,
  influencers: InfluencerCandidate[],
  redditChannels: RedditCandidate[]
): string {
  const infList = influencers
    .map((inf, i) => {
      const starLabel = inf.starRating && inf.starRating >= 4 ? ` ⭐PRIORITY(${inf.starRating}★)` : "";
      return `${i + 1}. ID:I:${inf.id} | Name:${inf.name}${starLabel} | Platform:${inf.platform} | Followers:${inf.followersCount.toLocaleString()} | Categories:${inf.categorySlugs.join(",")} | Tags:${inf.tagSlugs.join(",")} | Desc:${inf.description?.slice(0, 200) ?? "N/A"}`;
    })
    .join("\n");

  const redditList = redditChannels
    .map((r, i) => {
      const starLabel = r.starRating && r.starRating >= 4 ? ` ⭐PRIORITY(${r.starRating}★)` : "";
      return `${i + 1}. ID:R:${r.id} | Name:${r.name}${starLabel} | URL:${r.url} | Members:${r.totalMembers.toLocaleString()} | WeeklyVisitors:${r.weeklyVisitors.toLocaleString()} | Difficulty:${r.postingDifficulty ?? "N/A"} | Categories:${r.categorySlugs.join(",")} | Tags:${r.tagSlugs.join(",")} | Desc:${r.description?.slice(0, 200) ?? "N/A"}`;
    })
    .join("\n");

  return `${productHeader(p)}

${influencers.length > 0 ? `Social influencers (${influencers.length} total, prefix I:):\n${infList}\n` : ""}${redditChannels.length > 0 ? `Reddit communities (${redditChannels.length} total, prefix R:):\n${redditList}\n` : ""}
Task: Select TOP 20 per section. The product's problem and solution are the PRIMARY matching signal.
- Section D (social_influencer): influencers whose followers actively experience the problem stated above or actively seek this type of solution. A large follower count is not enough — audience relevance to the problem is what matters.
- Section E (reddit_channel): subreddits where users discuss this exact problem, seek this type of solution, or regularly share and review products like this. Community relevance to the problem domain is the deciding factor.

Platform compatibility check (CRITICAL — apply to every entity before including it):
- Read each entity's name and description carefully
- If an entity is platform-specific or ecosystem-specific (e.g. a WordPress-only influencer, Shopify-focused community, iOS developer subreddit, Zoho users group), ONLY include it if the product's problem and solution clearly indicate it is built for that exact platform
- Sharing the same category is NOT sufficient — the product must genuinely belong to that platform or ecosystem
- If the product IS built for that platform, these entities become highly relevant and should rank high

Relevance guardrails:
- Do NOT rank an entity high based on category overlap alone — check whether the audience genuinely experiences the stated problem
- If the entity's description clearly targets a different problem domain or incompatible stack, exclude it
- matchReason must be 1–2 sentences tailored to the section type (max 160 chars):
  - Section D (influencer): why this creator's audience matches + what angle to use in the outreach pitch
  - Section E (reddit): why this community is relevant + what type of post or discussion angle would land well

Priority entities (marked ⭐PRIORITY): These are admin-verified gold-standard entities for this category. Include them in results unless there is a clear platform or audience mismatch specific to this product. Category alignment alone is sufficient to include them — apply the platform check but give strong benefit of the doubt.

${JSON_SCHEMA}
${JSON_RULES}`;
}

function buildFundMatchingPrompt(p: ProductContext, funds: FundCandidate[]): string {
  const list = funds
    .map((f, i) => {
      const starLabel = f.starRating && f.starRating >= 4 ? ` ⭐PRIORITY(${f.starRating}★)` : "";
      return `${i + 1}. ID:F:${f.id} | Name:${f.name}${starLabel} | Stage:${f.investmentStage ?? "N/A"} | TicketSize:${f.ticketSize ?? "N/A"} | Categories:${f.categorySlugs.join(",")} | Tags:${f.tagSlugs.join(",")} | Desc:${f.description?.slice(0, 200) ?? "N/A"}`;
    })
    .join("\n");

  return `${productHeader(p)}

Investors/funds (${funds.length} total, prefix F:):
${list}

Task: Select TOP 20 most relevant investors for this product.
- Section F (fund): investors or funds whose portfolio focus and investment stage align with the problem this product is solving and the solution it offers
- PRIMARY signal: Does the fund back companies solving similar problems in this domain?
- SECONDARY signal: Is the investment stage and ticket size appropriate for a product at this stage?

Semantic guardrails:
- Read each fund's description carefully before including it
- A fund focused on a clearly different domain (e.g. deep tech hardware vs. B2B SaaS) is a poor match even if category tags overlap
- If a fund exclusively backs a specific platform ecosystem (e.g. WordPress plugin businesses, Shopify app developers) and the product does not belong to that ecosystem, exclude it
- Deprioritize or exclude funds whose description indicates an incompatible focus or stage
- matchReason must be 1–2 sentences (max 160 chars): why this fund's focus aligns with the product's problem domain + what to emphasize in the pitch

Priority funds (marked ⭐PRIORITY): These are admin-verified gold-standard funds for this category. Include them in results unless there is a clear focus mismatch specific to this product. Give strong benefit of the doubt.

${JSON_SCHEMA}
${JSON_RULES}`;
}

export async function rankSocialAndFundsForCuration(
  product: ProductContext,
  influencers: InfluencerCandidate[],
  redditChannels: RedditCandidate[],
  funds: FundCandidate[]
): Promise<MatchResult[]> {
  if (influencers.length === 0 && redditChannels.length === 0 && funds.length === 0) {
    return [];
  }

  try {
    const config = await getAiConfig();
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "system",
      content:
        "You are an expert GTM strategist. Rank distribution entities by true semantic fit to product problem and solution. Always respond with valid JSON only.",
    };

    const [socialResults, fundResults] = await Promise.all([
      (influencers.length > 0 || redditChannels.length > 0)
        ? callAI(
            [
              systemMessage,
              {
                role: "user",
                content: buildSocialMatchingPrompt(product, influencers, redditChannels),
              },
            ],
            { maxTokens: config.maxTokens, temperature: config.temperature }
          )
            .then(parseMatchingResponse)
            .catch(() => [])
        : Promise.resolve([] as MatchResult[]),
      funds.length > 0
        ? callAI(
            [systemMessage, { role: "user", content: buildFundMatchingPrompt(product, funds) }],
            { maxTokens: config.maxTokens, temperature: config.temperature }
          )
            .then(parseMatchingResponse)
            .catch(() => [])
        : Promise.resolve([] as MatchResult[]),
    ]);

    return [...socialResults, ...fundResults];
  } catch {
    // Fail-open: deterministic fallback in curation engine will handle D/E/F.
    return [];
  }
}

const MAX_RESULTS_PER_SECTION = 20;

function parseMatchingResponse(raw: string): MatchResult[] {
  try {
    const parsed = JSON.parse(raw);
    const results = parsed.results;
    if (!Array.isArray(results)) return [];

    const mapped = results
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

        if (rawId.startsWith("W:")) {
          return { websiteId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank: 0 };
        } else if (rawId.startsWith("I:")) {
          return { influencerId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank: 0 };
        } else if (rawId.startsWith("R:")) {
          return { redditChannelId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank: 0 };
        } else if (rawId.startsWith("F:")) {
          return { fundId: rawId.slice(2), matchScore: score, matchReason: reason, section, rank: 0 };
        } else if (rawId.length > 0) {
          // Legacy fallback: bare ID without prefix → treat as websiteId
          return { websiteId: rawId, matchScore: score, matchReason: reason, section, rank: 0 };
        }
        return null;
      })
      // Use 0.25 threshold so category-matched candidates aren't silently dropped by strict AI scoring
      .filter((r): r is MatchResult => r !== null && r.matchScore >= 0.25);

    // Group by section, cap at MAX_RESULTS_PER_SECTION (top by matchScore), re-rank 1..N
    const sections = ["a", "b", "c", "d", "e", "f"] as const;
    const final: MatchResult[] = [];

    for (const section of sections) {
      const inSection = mapped
        .filter((r) => r.section === section)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, MAX_RESULTS_PER_SECTION);

      inSection.forEach((r, idx) => {
        r.rank = idx + 1;
        final.push(r);
      });
    }

    return final;
  } catch {
    throw new Error("AI returned invalid JSON response");
  }
}
