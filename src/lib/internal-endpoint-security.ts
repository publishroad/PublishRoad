import { NextRequest } from "next/server";

let hasWarnedMissingQueueSecret = false;
let hasWarnedMissingQueueIps = false;

function getEmailQueueSecret(): string {
  const secret = process.env.EMAIL_QUEUE_SECRET?.trim() ?? "";

  if (!secret && process.env.NODE_ENV === "production" && !hasWarnedMissingQueueSecret) {
    hasWarnedMissingQueueSecret = true;
    console.warn("[EmailQueue] EMAIL_QUEUE_SECRET is missing. Internal queue requests will be rejected until it is configured.");
  }

  return secret;
}

function getAllowedInternalIps(): string[] {
  const raw = process.env.EMAIL_QUEUE_ALLOWED_IPS ?? "";
  const list = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (list.length > 0) {
    return list;
  }

  if (process.env.NODE_ENV === "production") {
    if (!hasWarnedMissingQueueIps) {
      hasWarnedMissingQueueIps = true;
      console.warn("[EmailQueue] EMAIL_QUEUE_ALLOWED_IPS is missing. Internal queue requests will be rejected until it is configured.");
    }

    return [];
  }

  return ["127.0.0.1", "::1"];
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let num = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    num = (num << 8) + value;
  }

  return num >>> 0;
}

function ipMatchesRule(ip: string, rule: string): boolean {
  if (rule === ip) {
    return true;
  }

  if (!rule.includes("/")) {
    return false;
  }

  const [baseIp, prefixLengthRaw] = rule.split("/");
  const prefixLength = Number(prefixLengthRaw);

  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(baseIp);
  if (ipInt === null || baseInt === null) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isInternalQueueRequestAllowed(request: NextRequest): boolean {
  const allowedIps = getAllowedInternalIps();
  if (allowedIps.length === 0) {
    return false;
  }

  const ip = getClientIp(request);
  if (!ip) {
    return false;
  }

  return allowedIps.some((rule) => ipMatchesRule(ip, rule));
}

export function isQueueAuthorizationValid(request: NextRequest): boolean {
  const secret = getEmailQueueSecret();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  return bearer.length > 0 && bearer === secret;
}
