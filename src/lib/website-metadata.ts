import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface WebsiteMetadataResult {
  reachable: boolean;
  statusCode: number | null;
  title: string | null;
  description: string | null;
  warning: string | null;
  checkedUrl: string;
  finalUrl: string | null;
}

const SOFT_WARNING = "Site not reachable — curation still ran using the provided URL and description.";
const REQUEST_TIMEOUT_MS = 4000;

function cleanText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;

  const normalized = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  return normalized.slice(0, maxLength);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  );
}

function isPrivateIp(address: string): boolean {
  const normalized = address.trim().toLowerCase();

  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }

  const parts = normalized.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function canSafelyFetchWebsite(url: URL): Promise<boolean> {
  if (!/^https?:$/.test(url.protocol)) {
    return false;
  }

  if (isLocalHostname(url.hostname)) {
    return false;
  }

  if (isIP(url.hostname)) {
    return !isPrivateIp(url.hostname);
  }

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      return false;
    }

    return addresses.every((entry) => !isPrivateIp(entry.address));
  } catch {
    return false;
  }
}

function isReachableStatus(statusCode: number): boolean {
  return (statusCode >= 200 && statusCode < 400) || [401, 403, 405, 406, 429].includes(statusCode);
}

function extractMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1];
    if (value) {
      return value;
    }
  }

  return null;
}

function extractTitle(html: string): string | null {
  return cleanText(extractMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]), 160);
}

function extractDescription(html: string): string | null {
  return cleanText(
    extractMatch(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["'][^>]*>/i,
    ]),
    320
  );
}

export async function inspectWebsiteMetadata(productUrl: string): Promise<WebsiteMetadataResult> {
  const checkedUrl = productUrl.trim();
  if (!checkedUrl) {
    return {
      reachable: false,
      statusCode: null,
      title: null,
      description: null,
      warning: SOFT_WARNING,
      checkedUrl,
      finalUrl: null,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkedUrl);
  } catch {
    return {
      reachable: false,
      statusCode: null,
      title: null,
      description: null,
      warning: SOFT_WARNING,
      checkedUrl,
      finalUrl: null,
    };
  }

  if (!(await canSafelyFetchWebsite(parsedUrl))) {
    return {
      reachable: false,
      statusCode: null,
      title: null,
      description: null,
      warning: SOFT_WARNING,
      checkedUrl,
      finalUrl: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "PublishRoadBot/1.0 (+https://publishroad.com)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const statusCode = response.status;
    const reachable = isReachableStatus(statusCode);

    if (!reachable) {
      return {
        reachable: false,
        statusCode,
        title: null,
        description: null,
        warning: SOFT_WARNING,
        checkedUrl,
        finalUrl: response.url || checkedUrl,
      };
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) {
      return {
        reachable: true,
        statusCode,
        title: null,
        description: null,
        warning: null,
        checkedUrl,
        finalUrl: response.url || checkedUrl,
      };
    }

    const html = await response.text();

    return {
      reachable: true,
      statusCode,
      title: extractTitle(html),
      description: extractDescription(html),
      warning: null,
      checkedUrl,
      finalUrl: response.url || checkedUrl,
    };
  } catch {
    return {
      reachable: false,
      statusCode: null,
      title: null,
      description: null,
      warning: SOFT_WARNING,
      checkedUrl,
      finalUrl: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
