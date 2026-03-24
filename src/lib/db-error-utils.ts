import { Prisma } from "@prisma/client";

export function isMissingRelationError(error: unknown, relationName: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === "P2021") {
    return true;
  }

  if (error.code === "P2010") {
    const meta = error.meta as { code?: string; message?: string } | undefined;
    if (meta?.code === "42P01") {
      return true;
    }

    return typeof meta?.message === "string" && meta.message.includes(`relation \"${relationName}\" does not exist`);
  }

  return false;
}
