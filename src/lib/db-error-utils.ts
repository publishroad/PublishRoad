import { Prisma } from "@prisma/client";

export function isMissingRelationError(error: unknown, relationName: string): boolean {
  const candidate = error as {
    code?: string;
    message?: string;
    meta?: { code?: string; message?: string; table?: string };
  } | null;
  const code = candidate?.code;
  const message = candidate?.message;
  const meta = candidate?.meta;

  // P2021 is Prisma's canonical "table/relation missing" signal.
  if (code === "P2021") {
    return true;
  }

  // P2010 can wrap underlying DB-level relation-not-found errors.
  if (code === "P2010") {
    if (meta?.code === "42P01") {
      return true;
    }

    return typeof meta?.message === "string" && meta.message.includes(`relation \"${relationName}\" does not exist`);
  }

  // Handle wrapped/serialized errors where `code` may be missing.
  const relationNeedle = relationName.toLowerCase();
  const messageLower = typeof message === "string" ? message.toLowerCase() : "";
  const metaMessageLower = typeof meta?.message === "string" ? meta.message.toLowerCase() : "";
  const metaTableLower = typeof meta?.table === "string" ? meta.table.toLowerCase() : "";
  if (
    messageLower.includes("does not exist in the current database") &&
    (messageLower.includes(relationNeedle) || messageLower.includes(`public.${relationNeedle}`))
  ) {
    return true;
  }
  if (
    metaMessageLower.includes("relation") &&
    metaMessageLower.includes("does not exist") &&
    (metaMessageLower.includes(relationNeedle) ||
      metaMessageLower.includes(`public.${relationNeedle}`) ||
      metaTableLower.includes(relationNeedle))
  ) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return true;
  }

  return false;
}
