export const dateRangePresets = [
  "7d",
  "30d",
  "this-month",
  "previous-month",
  "90d",
  "this-year",
] as const;

export type DateRangePreset = (typeof dateRangePresets)[number];
export type AnalyticsRange = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
};

const ymd = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function offsetAt(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "+" ? minutes : -minutes;
}

/** Convert a workspace calendar date to its UTC midnight. */
export function zonedMidnight(date: string, timeZone: string) {
  if (!ymd.test(date)) throw new Error("INVALID_DATE_RANGE");
  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  // The second pass handles daylight-saving offset changes at the boundary.
  const first = new Date(candidate.getTime() - offsetAt(candidate, timeZone) * 60_000);
  return new Date(candidate.getTime() - offsetAt(first, timeZone) * 60_000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const item = (kind: string) => parts.find((part) => part.type === kind)?.value;
  return `${item("year")}-${item("month")}-${item("day")}`;
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(date: string, direction: number) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + direction, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function resolveAnalyticsRange(
  input: { preset?: string | null; start?: string | null; end?: string | null },
  timeZone: string,
  now = new Date(),
): AnalyticsRange {
  if (!isValidTimeZone(timeZone)) timeZone = "UTC";
  const preset = input.preset ?? "30d";
  let start: Date;
  let end: Date;
  let label: string;
  const today = localDate(now, timeZone);

  if (preset === "custom") {
    if (!input.start || !input.end || !ymd.test(input.start) || !ymd.test(input.end)) {
      throw new Error("INVALID_DATE_RANGE");
    }
    start = zonedMidnight(input.start, timeZone);
    end = zonedMidnight(input.end, timeZone);
    if (end <= start || end.getTime() - start.getTime() > 366 * 86_400_000) {
      throw new Error("INVALID_DATE_RANGE");
    }
    label = `${input.start} to ${input.end}`;
  } else if ((dateRangePresets as readonly string[]).includes(preset)) {
    if (preset === "this-month" || preset === "previous-month") {
      const thisMonth = monthStart(today);
      const startText =
        preset === "previous-month" ? shiftMonth(thisMonth, -1) : thisMonth;
      const endText = shiftMonth(startText, 1);
      start = zonedMidnight(startText, timeZone);
      end = zonedMidnight(endText, timeZone);
      label = preset === "this-month" ? "This month" : "Previous month";
    } else if (preset === "this-year") {
      start = zonedMidnight(`${today.slice(0, 4)}-01-01`, timeZone);
      end = zonedMidnight(`${Number(today.slice(0, 4)) + 1}-01-01`, timeZone);
      label = "This year";
    } else {
      const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
      end = zonedMidnight(today, timeZone);
      end = addDays(end, 1);
      start = addDays(end, -days);
      label = `Last ${days} days`;
    }
  } else {
    throw new Error("INVALID_DATE_RANGE");
  }

  const duration = end.getTime() - start.getTime();
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - duration),
    previousEnd: start,
    label,
  };
}

export function safeCsvCell(value: unknown) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}

export function successfulPaymentMatch(organizationId: string, start: Date, end: Date) {
  return {
    organizationId,
    status: "successful",
    paymentDate: { $gte: start, $lt: end },
  };
}
