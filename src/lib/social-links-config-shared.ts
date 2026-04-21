export type SocialPlatformKey =
  | "x"
  | "linkedin"
  | "instagram"
  | "producthunt"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "github"
  | "discord"
  | "reddit"
  | "website";

export type SocialLinkConfig = {
  id: string;
  platform: SocialPlatformKey;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
};

export type SocialPlatformOption = {
  key: SocialPlatformKey;
  label: string;
};

export const SOCIAL_PLATFORM_OPTIONS: SocialPlatformOption[] = [
  { key: "x", label: "X / Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "producthunt", label: "ProductHunt" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "github", label: "GitHub" },
  { key: "discord", label: "Discord" },
  { key: "reddit", label: "Reddit" },
  { key: "website", label: "Website" },
];

const PLATFORM_LABELS = new Map<SocialPlatformKey, string>(
  SOCIAL_PLATFORM_OPTIONS.map((platform) => [platform.key, platform.label])
);

export const DEFAULT_SOCIAL_LINKS_CONFIG: SocialLinkConfig[] = [
  {
    id: "social-x",
    platform: "x",
    label: "X / Twitter",
    href: "https://x.com/publishroad",
    enabled: true,
    order: 0,
  },
  {
    id: "social-linkedin",
    platform: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/company/publishroad",
    enabled: true,
    order: 1,
  },
  {
    id: "social-instagram",
    platform: "instagram",
    label: "Instagram",
    href: "https://instagram.com/publishroad",
    enabled: true,
    order: 2,
  },
  {
    id: "social-producthunt",
    platform: "producthunt",
    label: "ProductHunt",
    href: "https://producthunt.com",
    enabled: true,
    order: 3,
  },
];

function cloneDefaultSocialLinks(): SocialLinkConfig[] {
  return DEFAULT_SOCIAL_LINKS_CONFIG.map((item) => ({ ...item }));
}

type SocialIcon = {
  viewBox: string;
  path: string;
};

const SOCIAL_PLATFORM_ICONS: Record<SocialPlatformKey, SocialIcon> = {
  x: {
    viewBox: "0 0 24 24",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  linkedin: {
    viewBox: "0 0 24 24",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  instagram: {
    viewBox: "0 0 24 24",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  producthunt: {
    viewBox: "0 0 24 24",
    path: "M13.604 8.4h-3.405V12h3.405a1.8 1.8 0 0 0 0-3.6M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0m1.604 14.4h-3.405V18H7.8V6h5.804a4.2 4.2 0 0 1 0 8.4",
  },
  youtube: {
    viewBox: "0 0 24 24",
    path: "M23.498 6.186a2.955 2.955 0 0 0-2.078-2.09C19.584 3.6 12 3.6 12 3.6s-7.584 0-9.42.496a2.955 2.955 0 0 0-2.078 2.09C0 8.034 0 12 0 12s0 3.966.502 5.814a2.955 2.955 0 0 0 2.078 2.09C4.416 20.4 12 20.4 12 20.4s7.584 0 9.42-.496a2.955 2.955 0 0 0 2.078-2.09C24 15.966 24 12 24 12s0-3.966-.502-5.814ZM9.6 15.6V8.4L16.8 12l-7.2 3.6Z",
  },
  tiktok: {
    viewBox: "0 0 24 24",
    path: "M16.5 3c.3 2 1.5 3.6 3.5 4.2v3.1c-1.3 0-2.6-.4-3.7-1.1v6.2A5.4 5.4 0 1 1 10.9 10v3.2a2.2 2.2 0 1 0 2.2 2.2V3h3.4Z",
  },
  facebook: {
    viewBox: "0 0 24 24",
    path: "M13.5 8.5V6.8c0-.6.4-1.1 1.1-1.1H16V2.5h-2.2A3.9 3.9 0 0 0 9.9 6.4v2.1H7v3.2h2.9v9.8h3.6v-9.8H16l.4-3.2h-2.9Z",
  },
  github: {
    viewBox: "0 0 24 24",
    path: "M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.57v-2.03c-3.34.73-4.04-1.61-4.04-1.61a3.18 3.18 0 0 0-1.34-1.76c-1.1-.76.08-.75.08-.75a2.52 2.52 0 0 1 1.84 1.24 2.55 2.55 0 0 0 3.49 1 2.54 2.54 0 0 1 .76-1.6c-2.66-.3-5.46-1.33-5.46-5.9a4.63 4.63 0 0 1 1.23-3.22 4.3 4.3 0 0 1 .12-3.18s1-.32 3.3 1.23a11.42 11.42 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23a4.3 4.3 0 0 1 .12 3.18 4.63 4.63 0 0 1 1.23 3.22c0 4.58-2.81 5.59-5.48 5.89a2.85 2.85 0 0 1 .81 2.21v3.28c0 .31.22.68.83.57A12 12 0 0 0 12 .5Z",
  },
  discord: {
    viewBox: "0 0 24 24",
    path: "M20.3 4.4A17.5 17.5 0 0 0 16.2 3c-.2.4-.5.9-.6 1.3a16 16 0 0 0-7.2 0A9 9 0 0 0 7.8 3c-1.4.2-2.8.7-4.1 1.4C1.2 8 0 11.6.2 15.1c1.6 1.2 3.2 1.9 4.8 2.3.4-.5.8-1.1 1.1-1.7-.6-.2-1.2-.5-1.8-.8l.4-.3a12.4 12.4 0 0 0 10.6 0l.4.3c-.6.3-1.2.6-1.8.8.3.6.7 1.2 1.1 1.7 1.7-.4 3.3-1.1 4.8-2.3.3-3.8-.5-7.3-2.5-10.7ZM8.8 13.1c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm6.4 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z",
  },
  reddit: {
    viewBox: "0 0 24 24",
    path: "M24 12c0-1.2-1-2.2-2.2-2.2-.8 0-1.5.5-1.9 1.2a8.3 8.3 0 0 0-5.7-1.8l1.2-3.8 3.3.8a1.8 1.8 0 1 0 .2-1.2l-4.1-1a.6.6 0 0 0-.7.4L12.7 9a8.3 8.3 0 0 0-5.6 1.9 2.2 2.2 0 1 0-1.3 4c0 3 3 5.4 6.7 5.4s6.7-2.4 6.7-5.4v-.1c.5-.3.8-.9.8-1.5.1-.1.1-.2.1-.3ZM8.8 13.8c0-.7.6-1.2 1.3-1.2.7 0 1.3.5 1.3 1.2 0 .7-.6 1.2-1.3 1.2-.7 0-1.3-.5-1.3-1.2Zm7.1 2.9c-.8.8-2 .9-3.4.9s-2.6-.1-3.4-.9a.6.6 0 1 1 .8-.8c.5.5 1.3.6 2.6.6 1.3 0 2.1-.1 2.6-.6a.6.6 0 0 1 .8.8Zm-1.2-1.7c-.7 0-1.3-.5-1.3-1.2 0-.7.6-1.2 1.3-1.2.7 0 1.3.5 1.3 1.2 0 .7-.6 1.2-1.3 1.2Z",
  },
  website: {
    viewBox: "0 0 24 24",
    path: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.7 9h-3.1a15.6 15.6 0 0 0-1.2-5A8.1 8.1 0 0 1 19.7 11ZM12 4.1c1 .8 2 3 2.5 6H9.5c.5-3 1.5-5.2 2.5-6ZM4.3 13h3.1a15.6 15.6 0 0 0 1.2 5A8.1 8.1 0 0 1 4.3 13Zm3.1-2H4.3a8.1 8.1 0 0 1 4.3-5 15.6 15.6 0 0 0-1.2 5Zm4.6 8c-1-.8-2-3-2.5-6h5c-.5 3-1.5 5.2-2.5 6Zm3.4-1a15.6 15.6 0 0 0 1.2-5h3.1a8.1 8.1 0 0 1-4.3 5Z",
  },
};

const FALLBACK_ICON = SOCIAL_PLATFORM_ICONS.website;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeHref(value: unknown): string {
  const href = cleanText(value, 500);
  if (!href.startsWith("https://")) {
    return "";
  }

  return href;
}

function isSocialPlatformKey(value: unknown): value is SocialPlatformKey {
  if (typeof value !== "string") {
    return false;
  }

  return SOCIAL_PLATFORM_OPTIONS.some((platform) => platform.key === value);
}

export function normalizeSocialLinksConfig(raw: unknown): SocialLinkConfig[] {
  if (!Array.isArray(raw)) {
    return cloneDefaultSocialLinks();
  }

  const normalized: SocialLinkConfig[] = [];

  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const value = entry as Record<string, unknown>;
    const platform = isSocialPlatformKey(value.platform) ? value.platform : null;
    if (!platform) {
      return;
    }

    const href = normalizeHref(value.href);
    if (!href) {
      return;
    }

    const providedLabel = cleanText(value.label, 60);
    const label = providedLabel || PLATFORM_LABELS.get(platform) || "Social";
    const providedId = cleanText(value.id, 80);
    const id = providedId || `social-${platform}-${index}`;

    normalized.push({
      id,
      platform,
      label,
      href,
      enabled: value.enabled !== false,
      order: Number.isFinite(Number(value.order)) ? Number(value.order) : index,
    });
  });

  const deduped = new Map<string, SocialLinkConfig>();
  normalized
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      deduped.set(item.id, {
        ...item,
        order: index,
      });
    });

  const result = [...deduped.values()];
  if (result.length === 0) {
    return cloneDefaultSocialLinks();
  }

  return result;
}

export function getSocialPlatformLabel(platform: SocialPlatformKey): string {
  return PLATFORM_LABELS.get(platform) ?? "Social";
}

export function getSocialPlatformIcon(platform: SocialPlatformKey): SocialIcon {
  return SOCIAL_PLATFORM_ICONS[platform] ?? FALLBACK_ICON;
}
