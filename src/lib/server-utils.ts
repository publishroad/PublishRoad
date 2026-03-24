/**
 * Server-only utilities that use Node.js APIs (crypto, bcrypt).
 * Do NOT import this file from middleware or client components.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// AES-256-GCM field encryption for PII (phone, stripe_customer_id, AI api_key)
// ─────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) throw new Error("FIELD_ENCRYPTION_KEY env var not set");
  return Buffer.from(key, "hex");
}

export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted field format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

// Deterministic SHA-256 hash for indexed lookups of encrypted values.
export function hashLookupValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// ─────────────────────────────────────────────
// Password hashing (cost=12 prod, 10 dev)
// ─────────────────────────────────────────────
const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
