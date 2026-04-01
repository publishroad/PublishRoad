export function StatCard({
  label,
  value,
  sub,
  iconBg,
  iconColor,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  iconColor: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}
