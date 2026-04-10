import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { NEXTAUTH_SECRET_ENCODED } from "@/lib/auth-secret";

const secret = NEXTAUTH_SECRET_ENCODED;

export interface AdminSession {
  adminId: string;
  totpVerified: boolean;
  role: string;
}

export async function createAdminSession(
  adminId: string,
  totpVerified: boolean
): Promise<string> {
  const admin = await db.adminUser.findUnique({
    where: { id: adminId },
    select: { role: true },
  });

  const token = await new SignJWT({
    adminId,
    totpVerified,
    role: admin?.role ?? "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      adminId: payload.adminId as string,
      totpVerified: payload.totpVerified as boolean,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function getAdminFromCookies(
  cookieValue: string
): Promise<AdminSession | null> {
  return verifyAdminSession(cookieValue);
}

export async function requireAdmin(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  const session = await verifyAdminSession(sessionCookie.value);
  if (!session?.totpVerified) return null;
  return session;
}
