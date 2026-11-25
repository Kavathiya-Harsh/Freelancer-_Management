export type CurrencyMetadata = {
  code: string;
  name: string;
  symbol: string;
  minorUnit: number;
};

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$", minorUnit: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", minorUnit: 2 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", minorUnit: 2 },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnit: 2 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", minorUnit: 2 },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", minorUnit: 2 },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnit: 0 },
  KRW: { code: "KRW", name: "South Korean Won", symbol: "₩", minorUnit: 0 },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", minorUnit: 2 },
  CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", minorUnit: 2 },
  AED: { code: "AED", name: "UAE Dirham", symbol: "AED", minorUnit: 2 },
  BHD: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", minorUnit: 3 },
  KWD: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", minorUnit: 3 },
};

export function getCurrencyMinorUnit(currency: string): number {
  const upper = (currency || "USD").toUpperCase();
  return SUPPORTED_CURRENCIES[upper]?.minorUnit ?? 2;
}

export function minorToMajor(minor: number, minorUnit: number): number {
  if (minorUnit === 0) return minor;
  return minor / Math.pow(10, minorUnit);
}

export function majorToMinor(major: number, minorUnit: number): number {
  if (minorUnit === 0) return Math.round(major);
  return Math.round(major * Math.pow(10, minorUnit));
}

export function formatMoney(
  minor: number,
  currency: string = "USD",
  minorUnit?: number,
): string {
  const precision = minorUnit ?? getCurrencyMinorUnit(currency);
  const major = minorToMajor(minor, precision);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(major);
  } catch {
    // Fallback for custom or unrecognized currency codes
    return `${currency.toUpperCase()} ${major.toFixed(precision)}`;
  }
}
