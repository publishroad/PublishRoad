import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HireUsStartPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawPackage = Array.isArray(params.package) ? params.package[0] : params.package;
  const packageSlug = rawPackage === "complete" ? "complete" : "starter";

  const destination = `/onboarding/hire-us?package=${packageSlug}`;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(destination)}`);
  }

  redirect(destination);
}
