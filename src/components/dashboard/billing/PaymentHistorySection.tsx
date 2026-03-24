import { formatCurrency, formatDate } from "@/lib/utils";

interface PaymentHistoryItem {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  plan?: {
    name: string;
  } | null;
}

interface PaymentHistorySectionProps {
  payments: PaymentHistoryItem[];
}

export function PaymentHistorySection({ payments }: PaymentHistorySectionProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-[0_8px_32px_rgba(15,23,42,0.04)]">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
      </div>
      {payments.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-400 text-sm">No payments yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {payments.map((payment) => (
            <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {payment.plan?.name ?? "Subscription"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(payment.createdAt)}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <p className="font-semibold text-gray-900 text-sm">
                  {formatCurrency(payment.amountCents, payment.currency.toUpperCase())}
                </p>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    payment.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : payment.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}