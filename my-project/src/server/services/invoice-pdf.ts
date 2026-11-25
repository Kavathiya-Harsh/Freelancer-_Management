import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMoney } from "@/server/finance/currencies";
import type { InvoiceDocument } from "@/server/models/Invoice";

export async function generateInvoicePdf(invoice: InvoiceDocument): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Palette
  const colorForest = rgb(0.07, 0.21, 0.14); // #123524
  const colorMuted = rgb(0.35, 0.44, 0.38); // #587061
  const colorDark = rgb(0.1, 0.1, 0.1);
  const colorLine = rgb(0.9, 0.93, 0.9);

  let y = height - 50;

  // Header: Brand & Document Type
  page.drawText("FREELANCEFLOW", {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: colorForest,
  });

  page.drawText("TAX INVOICE", {
    x: width - 170,
    y,
    size: 18,
    font: fontBold,
    color: colorForest,
  });

  y -= 25;

  // Invoice Number & Status
  page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
    x: width - 170,
    y,
    size: 10,
    font: fontBold,
    color: colorDark,
  });

  y -= 14;
  page.drawText(`Status: ${invoice.status.toUpperCase()}`, {
    x: width - 170,
    y,
    size: 10,
    font: fontRegular,
    color: colorMuted,
  });

  y -= 14;
  page.drawText(
    `Issue Date: ${new Date(invoice.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    {
      x: width - 170,
      y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    },
  );

  y -= 14;
  page.drawText(
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    {
      x: width - 170,
      y,
      size: 9,
      font: fontBold,
      color: colorDark,
    },
  );

  // Issuer Info
  let issuerY = height - 85;
  page.drawText("ISSUED BY:", {
    x: 50,
    y: issuerY,
    size: 8,
    font: fontBold,
    color: colorMuted,
  });
  issuerY -= 14;
  page.drawText(invoice.issuerSnapshot?.name || "Independent Professional", {
    x: 50,
    y: issuerY,
    size: 11,
    font: fontBold,
    color: colorDark,
  });
  if (invoice.issuerSnapshot?.email) {
    issuerY -= 12;
    page.drawText(invoice.issuerSnapshot.email, {
      x: 50,
      y: issuerY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
  }

  // Client Bill To Info
  y -= 30;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: colorLine,
  });

  y -= 20;
  page.drawText("BILLED TO:", {
    x: 50,
    y,
    size: 8,
    font: fontBold,
    color: colorMuted,
  });

  y -= 15;
  page.drawText(invoice.clientSnapshot?.name || "Client", {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: colorDark,
  });

  if (invoice.clientSnapshot?.companyName) {
    y -= 13;
    page.drawText(invoice.clientSnapshot.companyName, {
      x: 50,
      y,
      size: 10,
      font: fontRegular,
      color: colorMuted,
    });
  }

  if (invoice.clientSnapshot?.email) {
    y -= 13;
    page.drawText(invoice.clientSnapshot.email, {
      x: 50,
      y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
  }

  y -= 25;

  // Line Items Table Header
  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: width - 100,
    height: 22,
    color: rgb(0.96, 0.98, 0.96),
  });

  page.drawText("DESCRIPTION", {
    x: 60,
    y,
    size: 8,
    font: fontBold,
    color: colorForest,
  });
  page.drawText("QTY", {
    x: 320,
    y,
    size: 8,
    font: fontBold,
    color: colorForest,
  });
  page.drawText("UNIT PRICE", {
    x: 380,
    y,
    size: 8,
    font: fontBold,
    color: colorForest,
  });
  page.drawText("AMOUNT", {
    x: width - 100,
    y,
    size: 8,
    font: fontBold,
    color: colorForest,
  });

  y -= 18;

  // Line items
  for (const item of invoice.lineItems) {
    const qty = (item.quantityMilli / 1000).toString();
    const unitPrice = formatMoney(
      item.unitAmountMinor,
      invoice.currency,
      invoice.minorUnit,
    );
    const lineTotal = formatMoney(
      item.lineTotalMinor,
      invoice.currency,
      invoice.minorUnit,
    );

    page.drawText(item.description.slice(0, 50), {
      x: 60,
      y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });
    page.drawText(qty, {
      x: 320,
      y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });
    page.drawText(unitPrice, {
      x: 380,
      y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });
    page.drawText(lineTotal, {
      x: width - 100,
      y,
      size: 9,
      font: fontBold,
      color: colorDark,
    });

    y -= 20;

    page.drawLine({
      start: { x: 50, y: y + 8 },
      end: { x: width - 50, y: y + 8 },
      thickness: 0.5,
      color: colorLine,
    });
  }

  y -= 10;

  // Financial Summary Totals Block
  const summaryX = width - 200;

  page.drawText("Subtotal:", {
    x: summaryX,
    y,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  page.drawText(formatMoney(invoice.subtotalMinor, invoice.currency, invoice.minorUnit), {
    x: width - 80,
    y,
    size: 9,
    font: fontRegular,
    color: colorDark,
  });

  if (invoice.discountMinor > 0) {
    y -= 15;
    page.drawText("Discount:", {
      x: summaryX,
      y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    page.drawText(
      `-${formatMoney(invoice.discountMinor, invoice.currency, invoice.minorUnit)}`,
      {
        x: width - 80,
        y,
        size: 9,
        font: fontRegular,
        color: colorMuted,
      },
    );
  }

  if (invoice.taxMinor > 0) {
    y -= 15;
    page.drawText("Tax:", {
      x: summaryX,
      y,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    page.drawText(formatMoney(invoice.taxMinor, invoice.currency, invoice.minorUnit), {
      x: width - 80,
      y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    });
  }

  y -= 18;
  page.drawLine({
    start: { x: summaryX, y: y + 5 },
    end: { x: width - 50, y: y + 5 },
    thickness: 1,
    color: colorLine,
  });

  page.drawText("Total:", {
    x: summaryX,
    y,
    size: 11,
    font: fontBold,
    color: colorForest,
  });
  page.drawText(formatMoney(invoice.totalMinor, invoice.currency, invoice.minorUnit), {
    x: width - 80,
    y,
    size: 11,
    font: fontBold,
    color: colorForest,
  });

  y -= 16;
  page.drawText("Amount Paid:", {
    x: summaryX,
    y,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  page.drawText(
    formatMoney(invoice.amountPaidMinor, invoice.currency, invoice.minorUnit),
    {
      x: width - 80,
      y,
      size: 9,
      font: fontRegular,
      color: colorDark,
    },
  );

  y -= 16;
  page.drawText("Balance Due:", {
    x: summaryX,
    y,
    size: 10,
    font: fontBold,
    color: colorDark,
  });
  page.drawText(
    formatMoney(invoice.amountDueMinor, invoice.currency, invoice.minorUnit),
    {
      x: width - 80,
      y,
      size: 10,
      font: fontBold,
      color: colorDark,
    },
  );

  // Notes & Payment Terms
  if (invoice.notes || invoice.terms) {
    y -= 40;
    page.drawLine({
      start: { x: 50, y: y + 10 },
      end: { x: width - 50, y: y + 10 },
      thickness: 1,
      color: colorLine,
    });

    if (invoice.notes) {
      page.drawText("Notes:", { x: 50, y, size: 8, font: fontBold, color: colorMuted });
      y -= 12;
      page.drawText(invoice.notes.slice(0, 100), {
        x: 50,
        y,
        size: 8,
        font: fontRegular,
        color: colorDark,
      });
      y -= 15;
    }

    if (invoice.terms) {
      page.drawText("Terms & Conditions:", {
        x: 50,
        y,
        size: 8,
        font: fontBold,
        color: colorMuted,
      });
      y -= 12;
      page.drawText(invoice.terms.slice(0, 100), {
        x: 50,
        y,
        size: 8,
        font: fontRegular,
        color: colorDark,
      });
    }
  }

  // Footer Branding
  page.drawText(
    "Generated by FreelanceFlow — Financial Management for Independent Professionals",
    {
      x: 50,
      y: 30,
      size: 7,
      font: fontRegular,
      color: colorMuted,
    },
  );

  return await pdfDoc.save();
}
