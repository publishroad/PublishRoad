type CsvTransaction = {
  createdAt: string;
  user: { name: string | null; email: string };
  paymentType: "plan" | "hire_us";
  planName: string;
  amountCents: number;
  currency: string;
  provider: string;
  status: string;
};

export function exportFinancialsCsv(transactions: CsvTransaction[]) {
  const headers = [
    "Date",
    "User Name",
    "User Email",
    "Type",
    "Package",
    "Amount",
    "Currency",
    "Provider",
    "Status",
  ];

  const rows = transactions.map((t) => [
    new Date(t.createdAt).toLocaleDateString("en-US"),
    t.user.name ?? "",
    t.user.email,
    t.paymentType === "hire_us" ? "Hire Us" : "Credit Plan",
    t.planName,
    (t.amountCents / 100).toFixed(2),
    t.currency.toUpperCase(),
    t.provider,
    t.status,
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `financials-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
