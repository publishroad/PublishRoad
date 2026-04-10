const FIRST_PAYOUT_DAY = 15;
const SECOND_PAYOUT_DAY = 30;

function getDaysInMonthUtc(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function createUtcDateClamped(year: number, monthIndex: number, dayOfMonth: number) {
  const maxDay = getDaysInMonthUtc(year, monthIndex);
  return new Date(Date.UTC(year, monthIndex, Math.min(dayOfMonth, maxDay), 0, 0, 0, 0));
}

export function getNextPayoutDateUtc(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const day = now.getUTCDate();

  if (day < FIRST_PAYOUT_DAY) {
    return createUtcDateClamped(year, monthIndex, FIRST_PAYOUT_DAY);
  }

  if (day < SECOND_PAYOUT_DAY) {
    return createUtcDateClamped(year, monthIndex, SECOND_PAYOUT_DAY);
  }

  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
  return createUtcDateClamped(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), FIRST_PAYOUT_DAY);
}

export function isPayoutDayUtc(now: Date = new Date()) {
  const day = now.getUTCDate();
  const daysInMonth = getDaysInMonthUtc(now.getUTCFullYear(), now.getUTCMonth());
  const effectiveSecondDay = Math.min(SECOND_PAYOUT_DAY, daysInMonth);
  return day === FIRST_PAYOUT_DAY || day === effectiveSecondDay;
}

export function formatPayoutDateUtc(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
