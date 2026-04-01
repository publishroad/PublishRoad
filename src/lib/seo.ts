const DEFAULT_SITE_URL = "https://publishroad.com";
const DEFAULT_SITE_LAST_MODIFIED = "2026-04-01T00:00:00.000Z";
const DEFAULT_OG_IMAGE_PATH = "/og-image.png";

export const SITE_NAME = "PublishRoad";

let hasWarnedAboutSeoConfig = false;

const isStrictProductionEnvironment =
  process.env.VERCEL_ENV === "production" ||
  process.env.DEPLOYMENT_ENV === "production" ||
  (process.env.NODE_ENV === "production" && process.env.CI === "true");

function warnSeoConfig(message: string) {
  if (hasWarnedAboutSeoConfig) return;
  hasWarnedAboutSeoConfig = true;
  console.warn(`[seo] ${message}`);
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function stripSiteName(value?: string | null): string | undefined {
  if (!value) return undefined;

  return value
    .replace(/\s*(?:\||-|–|—)\s*PublishRoad\s*$/i, "")
    .trim();
}

export function getSiteUrl(): string {
  const configuredValue = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const normalizedOrigin = configuredValue ? normalizeOrigin(configuredValue) : null;

  if (normalizedOrigin) {
    const parsedUrl = new URL(normalizedOrigin);

    if (isLocalHostname(parsedUrl.hostname)) {
      const message = `NEXT_PUBLIC_APP_URL is pointing to a local domain (${normalizedOrigin}). Falling back to ${DEFAULT_SITE_URL} for SEO metadata.`;
      if (isStrictProductionEnvironment) {
        throw new Error(`[seo] ${message}`);
      }
      warnSeoConfig(message);
      return DEFAULT_SITE_URL;
    }

    if (isStrictProductionEnvironment && parsedUrl.protocol !== "https:") {
      throw new Error("[seo] NEXT_PUBLIC_APP_URL must use https in production.");
    }

    return parsedUrl.origin;
  }

  if (configuredValue) {
    const message = `NEXT_PUBLIC_APP_URL is invalid (${configuredValue}). Falling back to ${DEFAULT_SITE_URL}.`;
    if (isStrictProductionEnvironment) {
      throw new Error(`[seo] ${message}`);
    }
    warnSeoConfig(message);
  }

  return DEFAULT_SITE_URL;
}

export function getCanonicalUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, `${getSiteUrl()}/`);

  if (url.pathname === "/") {
    return `${url.origin}/`;
  }

  return url.toString();
}

export function getSocialImageUrl(pathOrUrl = DEFAULT_OG_IMAGE_PATH): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return getCanonicalUrl(pathOrUrl);
  }
}

export function getSocialImages(alt: string, pathOrUrl = DEFAULT_OG_IMAGE_PATH) {
  return [
    {
      url: getSocialImageUrl(pathOrUrl),
      width: 1200,
      height: 630,
      alt,
    },
  ];
}

export function buildTwitterMetadata(args: {
  title: string;
  description?: string | null;
  image?: string | null;
}) {
  const cleanTitle = stripSiteName(args.title) ?? args.title;

  return {
    card: "summary_large_image" as const,
    title: cleanTitle,
    description: args.description ?? undefined,
    images: [getSocialImageUrl(args.image ?? DEFAULT_OG_IMAGE_PATH)],
  };
}

export function getStaticLastModified(): Date {
  const rawValue =
    process.env.NEXT_PUBLIC_SITE_LAST_MODIFIED?.trim() ||
    process.env.SITE_LAST_MODIFIED?.trim() ||
    process.env.VERCEL_GIT_COMMIT_DATE?.trim() ||
    DEFAULT_SITE_LAST_MODIFIED;

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  warnSeoConfig(
    `SITE_LAST_MODIFIED value \"${rawValue}\" is invalid. Falling back to ${DEFAULT_SITE_LAST_MODIFIED}.`
  );
  return new Date(DEFAULT_SITE_LAST_MODIFIED);
}
