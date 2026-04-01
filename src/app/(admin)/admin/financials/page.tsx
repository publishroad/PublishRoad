import { AppHeader } from "@/components/dashboard/AppHeader";
import { FinancialsDashboard } from "@/components/admin/FinancialsDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function FinancialsPage() {
  return (
    <>
      <AppHeader title="Financials" />
      <FinancialsDashboard />
    </>
  );
}
