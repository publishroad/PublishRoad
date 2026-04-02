import { db } from "@/lib/db";

export interface WebsiteDuplicateCategory {
  id: string;
  name: string;
}

export interface WebsiteDuplicateMatch {
  id: string;
  name: string;
  url: string;
  categories: WebsiteDuplicateCategory[];
}

function stripLeadingWww(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

export function normalizeWebsiteDomainFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return stripLeadingWww(parsed.hostname.toLowerCase());
  } catch {
    return null;
  }
}

function domainUrlPrefixFilters(domain: string) {
  const bare = domain;
  const withWww = `www.${domain}`;
  return [
    `http://${bare}`,
    `https://${bare}`,
    `http://${withWww}`,
    `https://${withWww}`,
  ];
}

export async function findWebsiteDomainConflicts(args: {
  url: string;
  excludeWebsiteId?: string;
}): Promise<{ domain: string | null; conflicts: WebsiteDuplicateMatch[] }> {
  const domain = normalizeWebsiteDomainFromUrl(args.url);
  if (!domain) {
    return { domain: null, conflicts: [] };
  }

  const prefixes = domainUrlPrefixFilters(domain);
  const candidates = await db.website.findMany({
    where: {
      ...(args.excludeWebsiteId ? { id: { not: args.excludeWebsiteId } } : {}),
      OR: prefixes.map((prefix) => ({
        url: { startsWith: prefix, mode: "insensitive" },
      })),
    },
    select: {
      id: true,
      name: true,
      url: true,
      category: { select: { id: true, name: true } },
      websiteCategories: {
        select: {
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  const conflicts = candidates
    .filter((candidate) => normalizeWebsiteDomainFromUrl(candidate.url) === domain)
    .map((candidate) => {
      const categoryMap = new Map<string, WebsiteDuplicateCategory>();

      if (candidate.category) {
        categoryMap.set(candidate.category.id, {
          id: candidate.category.id,
          name: candidate.category.name,
        });
      }

      for (const item of candidate.websiteCategories) {
        categoryMap.set(item.category.id, {
          id: item.category.id,
          name: item.category.name,
        });
      }

      return {
        id: candidate.id,
        name: candidate.name,
        url: candidate.url,
        categories: [...categoryMap.values()],
      };
    });

  return { domain, conflicts };
}
