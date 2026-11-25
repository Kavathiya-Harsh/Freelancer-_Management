import { failure } from "@/server/api/response";

export function paymentError(error: unknown, rid: string) {
  const code = error instanceof Error ? error.message : "PAYMENT_ERROR";
  if (code === "UNAUTHENTICATED")
    return failure(code, "Authentication is required.", rid, 401);
  if (code === "WORKSPACE_FORBIDDEN")
    return failure(code, "You do not have permission for payment operations.", rid, 403);
  if (code === "WORKSPACE_ARCHIVED")
    return failure(code, "Cannot modify payments in an archived workspace.", rid, 409);
  if (code === "INVOICE_NOT_FOUND" || code === "PAYMENT_NOT_FOUND")
    return failure(code, "The requested financial record was not found.", rid, 404);
  if (code.startsWith("OVERPAYMENT_REJECTED"))
    return failure("OVERPAYMENT_REJECTED", code, rid, 422);
  if (code.startsWith("CANNOT_"))
    return failure(
      code.split(":")[0],
      code.split(":").slice(1).join(":").trim() || code,
      rid,
      409,
    );
  return failure("PAYMENT_ERROR", "Unable to process the payment request.", rid, 400);
}
