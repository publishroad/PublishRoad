const PER_SECTION_LIMIT = 5;

export const LOCKED_SECTIONS_BY_PLAN: Record<string, string[]> = {
  free: ["d", "e", "f"],
  starter: ["d", "f"],
  pro: [],
  lifetime: [],
};

export const LIMITED_SECTIONS_BY_PLAN: Record<string, string[]> = {
  free: ["a", "b", "c"],
  starter: [],
  pro: [],
  lifetime: [],
};

type MaskableResult = {
  section: string;
  website?: unknown;
  influencer?: unknown;
  redditChannel?: unknown;
  fund?: unknown;
  matchReason?: unknown;
};

type MaskedResult<T extends MaskableResult> = Omit<T, "website" | "influencer" | "redditChannel" | "fund" | "matchReason"> & {
  masked: true;
  website: undefined;
  influencer: undefined;
  redditChannel: undefined;
  fund: undefined;
  matchReason: null;
};

export function applyPlanResultMasking<T extends MaskableResult>(
  inputResults: T[],
  planSlug: string
): {
  results: Array<T | MaskedResult<T>>;
  maskedCount: number;
  lockedSections: string[];
} {
  const lockedSections = new Set(
    LOCKED_SECTIONS_BY_PLAN[planSlug] ?? LOCKED_SECTIONS_BY_PLAN.free
  );
  const limitedSections = new Set(
    LIMITED_SECTIONS_BY_PLAN[planSlug] ?? LIMITED_SECTIONS_BY_PLAN.free
  );

  let maskedCount = 0;
  const sectionCounters: Record<string, number> = {};

  const results = inputResults.map((result) => {
    const section = result.section;

    if (lockedSections.has(section)) {
      maskedCount += 1;
      return {
        ...result,
        masked: true as const,
        website: undefined,
        influencer: undefined,
        redditChannel: undefined,
        fund: undefined,
        matchReason: null,
      };
    }

    if (limitedSections.has(section)) {
      sectionCounters[section] = (sectionCounters[section] ?? 0) + 1;
      if (sectionCounters[section] > PER_SECTION_LIMIT) {
        maskedCount += 1;
        return {
          ...result,
          masked: true as const,
          website: undefined,
          influencer: undefined,
          redditChannel: undefined,
          fund: undefined,
          matchReason: null,
        };
      }
    }

    return result;
  });

  return { results, maskedCount, lockedSections: [...lockedSections] };
}
