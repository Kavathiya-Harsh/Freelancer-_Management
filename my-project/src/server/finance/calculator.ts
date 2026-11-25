export interface LineItemCalculationInput {
  description: string;
  quantityMilli: number; // e.g. 1 unit = 1000 milli, 1.5 units = 1500 milli
  unitAmountMinor: number; // e.g. $50.00 = 5000 minor
  lineDiscountMinor?: number; // minor units
  taxRateBasisPoints?: number; // e.g. 18.00% = 1800 bp
}

export interface CalculatedLineItem {
  description: string;
  quantityMilli: number;
  unitAmountMinor: number;
  lineDiscountMinor: number;
  taxRateBasisPoints: number;
  lineSubtotalMinor: number;
  lineNetMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
}

export interface InvoiceTotalsCalculation {
  lineItems: CalculatedLineItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
}

/**
 * Calculates exact integer financial amounts for a single line item.
 * Never uses raw floating-point multiplications for currency totals.
 */
export function calculateLineItem(input: LineItemCalculationInput): CalculatedLineItem {
  const quantityMilli = Math.max(0, Math.round(input.quantityMilli));
  const unitAmountMinor = Math.max(0, Math.round(input.unitAmountMinor));

  // lineSubtotal = (quantityMilli * unitAmountMinor) / 1000
  const lineSubtotalMinor = Math.round((quantityMilli * unitAmountMinor) / 1000);

  // Discount cannot exceed the line subtotal
  const rawDiscount = Math.max(0, Math.round(input.lineDiscountMinor || 0));
  const lineDiscountMinor = Math.min(rawDiscount, lineSubtotalMinor);

  // Net taxable line amount
  const lineNetMinor = lineSubtotalMinor - lineDiscountMinor;

  // Tax calculation via basis points: (net * bp) / 10,000
  const taxRateBasisPoints = Math.max(0, Math.round(input.taxRateBasisPoints || 0));
  const lineTaxMinor = Math.round((lineNetMinor * taxRateBasisPoints) / 10000);

  // Line total including tax
  const lineTotalMinor = lineNetMinor + lineTaxMinor;

  return {
    description: input.description,
    quantityMilli,
    unitAmountMinor,
    lineDiscountMinor,
    taxRateBasisPoints,
    lineSubtotalMinor,
    lineNetMinor,
    lineTaxMinor,
    lineTotalMinor,
  };
}

/**
 * Calculates complete, transaction-safe invoice totals from raw line items.
 */
export function calculateInvoiceTotals(
  items: LineItemCalculationInput[],
  amountPaidMinor: number = 0,
): InvoiceTotalsCalculation {
  const calculatedItems = items.map(calculateLineItem);

  let subtotalMinor = 0;
  let discountMinor = 0;
  let taxMinor = 0;
  let totalMinor = 0;

  for (const item of calculatedItems) {
    subtotalMinor += item.lineSubtotalMinor;
    discountMinor += item.lineDiscountMinor;
    taxMinor += item.lineTaxMinor;
    totalMinor += item.lineTotalMinor;
  }

  const normalizedPaid = Math.max(0, Math.round(amountPaidMinor));
  const amountDueMinor = Math.max(0, totalMinor - normalizedPaid);

  return {
    lineItems: calculatedItems,
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor,
    amountPaidMinor: normalizedPaid,
    amountDueMinor,
  };
}
