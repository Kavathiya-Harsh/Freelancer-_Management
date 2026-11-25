import { failure } from "@/server/api/response";

export function invoiceError(error: unknown, rid: string) {
  const rawCode = error instanceof Error ? error.message : "INVOICE_ERROR";
  let status = 400;
  let code = rawCode;
  let message = "Unable to process invoice request.";

  if (rawCode.startsWith("CANNOT_PAY_DRAFT_INVOICE")) {
    code = "CANNOT_PAY_DRAFT_INVOICE";
    message = rawCode;
  } else if (rawCode.startsWith("CANNOT_PAY_VOID_INVOICE")) {
    code = "CANNOT_PAY_VOID_INVOICE";
    message = rawCode;
  } else if (rawCode.startsWith("OVERPAYMENT_REJECTED")) {
    code = "OVERPAYMENT_REJECTED";
    message = rawCode;
  } else if (rawCode.startsWith("CANNOT_EDIT_ISSUED_INVOICE")) {
    code = "CANNOT_EDIT_ISSUED_INVOICE";
    status = 409;
    message = "Only draft invoices can be edited.";
  } else if (rawCode.startsWith("CANNOT_VOID_PAID_INVOICE")) {
    code = "CANNOT_VOID_PAID_INVOICE";
    status = 409;
    message = rawCode;
  } else if (rawCode.startsWith("REVERSAL_FORBIDDEN")) {
    code = "REVERSAL_FORBIDDEN";
    status = 403;
    message = rawCode;
  } else {
    switch (rawCode) {
      case "UNAUTHENTICATED":
        status = 401;
        message = "You must be signed in.";
        break;
      case "WORKSPACE_FORBIDDEN":
        status = 403;
        message = "You do not have permission for this invoice operation.";
        break;
      case "WORKSPACE_ARCHIVED":
        status = 409;
        message = "Cannot modify records in an archived workspace.";
        break;
      case "INVOICE_NOT_FOUND":
        status = 404;
        message = "Invoice not found.";
        break;
      case "PAYMENT_NOT_FOUND":
        status = 404;
        message = "Payment not found.";
        break;
      case "CLIENT_NOT_FOUND":
        status = 404;
        message = "The selected client was not found.";
        break;
      case "CLIENT_ARCHIVED":
        status = 409;
        message = "Cannot create invoice for an archived client.";
        break;
      case "PROJECT_NOT_FOUND":
        status = 404;
        message = "The selected project was not found.";
        break;
      case "PROJECT_ARCHIVED":
        status = 409;
        message = "The selected project is archived.";
        break;
      case "CURRENCY_UNSUPPORTED":
        status = 400;
        message = "The selected currency is not supported.";
        break;
      case "INVOICE_ALREADY_ISSUED":
        status = 409;
        message = "Invoice has already been issued.";
        break;
      case "INVOICE_VOIDED":
        status = 409;
        message = "Invoice has been voided.";
        break;
    }
  }
  return failure(code, message, rid, status);
}
