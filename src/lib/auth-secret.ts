const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET must be defined");
}

if (process.env.NODE_ENV === "production" && nextAuthSecret.length < 32) {
  throw new Error("NEXTAUTH_SECRET must be at least 32 characters in production");
}

export const NEXTAUTH_SECRET = nextAuthSecret;
export const NEXTAUTH_SECRET_ENCODED = new TextEncoder().encode(NEXTAUTH_SECRET);
