"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HireUsPackageSelector } from "@/components/public/HireUsPackageSelector";

function HireUsOnboardingPageContent() {
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

export default function HireUsOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <HireUsOnboardingPageContent />
    </Suspense>
  );
}
