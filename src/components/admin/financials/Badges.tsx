type PaymentType = "plan" | "hire_us";
type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export function TypeBadge({ type }: { type: PaymentType }) {
  return type === "hire_us" ? (
    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
      Hire Us
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      Credit Plan
    </span>
  );
}

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, string> = {
    completed: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
