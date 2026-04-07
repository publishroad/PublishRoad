export const ALL_CURATION_SECTIONS = ["a", "b", "c", "d", "e", "f"] as const;
export type CurationSectionKey = (typeof ALL_CURATION_SECTIONS)[number];

export function isCurationSection(value: string): value is CurationSectionKey {
  return ALL_CURATION_SECTIONS.includes(value as CurationSectionKey);
}

export function normalizeEnabledCurationSections(input: unknown): CurationSectionKey[] {
  if (!Array.isArray(input)) return [...ALL_CURATION_SECTIONS];

  const unique = new Set<CurationSectionKey>();
  for (const value of input) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (isCurationSection(normalized)) {
      unique.add(normalized);
    }
  }

  return unique.size > 0 ? [...unique] : [...ALL_CURATION_SECTIONS];
}
