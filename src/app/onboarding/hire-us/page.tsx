"use client";

import { useSearchParams } from "next/navigation";
import { HireUsPackageSelector } from "@/components/public/HireUsPackageSelector";

export default function HireUsOnboardingPage() {
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("package");
  const preselectedPackage = selectedParam === "complete" ? "complete" : "starter";
  const checkoutError = searchParams.get("error");
  return (
    <HireUsPackageSelector
      preselectedPackage={preselectedPackage}
      checkoutError={checkoutError}
      loginCallbackBasePath="/onboarding/hire-us"
      variant="onboarding"
      showBackToDetails
    />
  );
}
