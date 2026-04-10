// ─────────────────────────────────────────────────────────────────────────────
// Pure deterministic scoring functions for curation candidate ranking.
// No DB access, no side effects — safe to unit test in isolation.
// Used exclusively by curation-engine.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Extract meaningful words from free-form text for description overlap scoring.
// Strips stop words and short tokens so "a CRM for small businesses" becomes
// ["crm", "small", "businesses"] — words worth matching on.
// ─────────────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","can",
  "it","its","this","that","these","those","i","we","you","they","he","she",
  "my","our","your","their","we're","it's","i'm","don't","not","no","so",
  "as","into","out","up","about","which","who","what","how","when","where",
]);

export function extractDescWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize a string for consistent matching across all scoring rules:
// lowercase → trim → strip non-alphanumeric (except spaces and hyphens) → trim.
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeStr(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").trim();
}

// ─── Scoring Rule 1: Category match ──────────────────────────────────────────
// +3 per entity category slug that equals the user's selected category slug.
// Deduplication via Set prevents the same slug scoring more than once.
export function scoreCategoryMatch(entityCategorySlugs: string[], userCategorySlug: string): number {
  if (!userCategorySlug) return 0;
  const normUser = normalizeStr(userCategorySlug);
  const seen = new Set<string>();
  let score = 0;
  for (const slug of entityCategorySlugs) {
    const norm = normalizeStr(slug);
    if (!seen.has(norm) && norm === normUser) {
      score += 3;
      seen.add(norm);
    }
  }
  return score;
}

// ─── Scoring Rule 2: Keyword-to-tag match ────────────────────────────────────
// +2 per unique user keyword that exactly matches an entity tag slug.
// Uses a Set for O(1) tag lookup; deduplicates keywords before counting.
export function scoreKeywordTagMatch(entityTagSlugs: string[], userKeywords: string[]): number {
  const tagSet = new Set(entityTagSlugs.map(normalizeStr));
  const seen = new Set<string>();
  let score = 0;
  for (const kw of userKeywords) {
    const norm = normalizeStr(kw);
    if (!seen.has(norm) && tagSet.has(norm)) {
      score += 2;
      seen.add(norm);
    }
  }
  return score;
}

// ─── Scoring Rule 3: Country match ───────────────────────────────────────────
// +2 if the entity's countryId equals the user's selected countryId.
// Returns 0 when either value is absent.
export function scoreCountryMatch(
  entityCountryId: string | null | undefined,
  userCountryId: string | null | undefined
): number {
  if (!entityCountryId || !userCountryId) return 0;
  return entityCountryId === userCountryId ? 2 : 0;
}

// ─── Scoring Rule 4: Description word match ──────────────────────────────────
// +1 per unique meaningful word in the product description that matches an entity
// tag slug or category slug. Stop-word filtering is applied upstream by
// extractDescWords(), so all words passed here are already meaningful.
export function scoreDescriptionMatch(
  entityTagSlugs: string[],
  entityCategorySlugs: string[],
  descWords: string[]
): number {
  const entityTokens = new Set([
    ...entityTagSlugs.map(normalizeStr),
    ...entityCategorySlugs.map(normalizeStr),
  ]);
  const seen = new Set<string>();
  let score = 0;
  for (const w of descWords) {
    const norm = normalizeStr(w);
    if (!seen.has(norm) && entityTokens.has(norm)) {
      score += 1;
      seen.add(norm);
    }
  }
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregates all four scoring rules into a final integer score with a breakdown
// object for traceability. All rules are independent — order doesn't matter.
// ─────────────────────────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  category: number;
  keyword: number;
  country: number;
  description: number;
  starBoost: number;
}

export function computeEntityScore(
  entity: {
    tagSlugs: string[];
    categorySlugs: string[];
    countryId?: string | null;
    starRating?: number | null;
  },
  userCategorySlug: string,
  userKeywords: string[],
  userCountryId: string | null | undefined,
  descWords: string[]
): { finalScore: number; breakdown: ScoreBreakdown } {
  const category = scoreCategoryMatch(entity.categorySlugs, userCategorySlug);
  const keyword = scoreKeywordTagMatch(entity.tagSlugs, userKeywords);
  const country = scoreCountryMatch(entity.countryId, userCountryId);
  const description = scoreDescriptionMatch(entity.tagSlugs, entity.categorySlugs, descWords);
  // ★4 = +2, ★5 = +4 — boosts gold-standard sites above keyword-only matches
  const starBoost = entity.starRating && entity.starRating >= 4 ? (entity.starRating - 3) * 2 : 0;
  return {
    finalScore: category + keyword + country + description + starBoost,
    breakdown: { category, keyword, country, description, starBoost },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorts entities with country-priority grouping:
//   - When userCountryId is set: country-matched entities come first (sorted by
//     _score desc), then non-matching entities fill the remainder (also by _score).
//     Slicing to MAX_PER_SECTION naturally implements "fill-up to 20" behaviour.
//   - When userCountryId is null (worldwide): pure descending score sort.
// ─────────────────────────────────────────────────────────────────────────────
export function sortWithCountryPriority<T extends { _score: number; _cntryMatch: boolean }>(
  entities: T[],
  userCountryId: string | null | undefined
): T[] {
  if (!userCountryId) {
    return [...entities].sort((a, b) => b._score - a._score);
  }
  const matched = entities.filter((e) => e._cntryMatch).sort((a, b) => b._score - a._score);
  const rest = entities.filter((e) => !e._cntryMatch).sort((a, b) => b._score - a._score);
  return [...matched, ...rest];
}
