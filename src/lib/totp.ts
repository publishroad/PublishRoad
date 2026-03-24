/**
 * TOTP helpers using otplib v13 (async API with crypto plugins).
 */
import {
  TOTP,
  generateSecret as _generateSecret,
  generateURI,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from "otplib";

function createTotp(secret: string) {
  return new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    secret,
  });
}

export function totpGenerateSecret(): string {
  return _generateSecret();
}

export async function totpGenerate(secret: string): Promise<string> {
  const totp = createTotp(secret);
  return totp.generate();
}

export async function totpVerify(token: string, secret: string): Promise<boolean> {
  const totp = createTotp(secret);
  try {
    const result = await totp.verify(token);
    return result.valid;
  } catch {
    return false;
  }
}

export function totpKeyUri(email: string, issuer: string, secret: string): string {
  return generateURI({ label: email, issuer, secret });
}
