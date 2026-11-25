import { NextResponse } from "next/server";

export function requestId(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && /^[a-zA-Z0-9_-]{8,128}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
}

export function success<T>(data: T, id: string, status = 200) {
  return NextResponse.json(
    { data, meta: { requestId: id } },
    { status, headers: { "x-request-id": id } },
  );
}

export function failure(code: string, message: string, id: string, status: number) {
  return NextResponse.json(
    { error: { code, message, details: [] }, meta: { requestId: id } },
    { status, headers: { "x-request-id": id } },
  );
}
