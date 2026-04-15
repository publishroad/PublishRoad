export type SiteNoticeConfig = {
  enabled: boolean;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
};

export const DEFAULT_SITE_NOTICE_CONFIG: SiteNoticeConfig = {
  enabled: false,
  message: "",
  ctaLabel: "",
  ctaUrl: "",
};

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function normalizeSiteNoticeConfig(raw: unknown): SiteNoticeConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_SITE_NOTICE_CONFIG;
  }

  const value = raw as Record<string, unknown>;

  return {
    enabled: Boolean(value.enabled),
    message: cleanText(value.message, 220),
    ctaLabel: cleanText(value.ctaLabel, 60),
    ctaUrl: cleanText(value.ctaUrl, 500),
  };
}
