export type MongoErrorDiagnostic = {
  name: string;
  code?: string | number;
};

export function getMongoErrorDiagnostics(
  error: unknown,
): MongoErrorDiagnostic[] {
  const diagnostics: MongoErrorDiagnostic[] = [];
  let current: unknown = error;

  while (current instanceof Error && diagnostics.length < 5) {
    const diagnostic: MongoErrorDiagnostic = { name: current.name };
    if ("code" in current) {
      const code = current.code;
      if (typeof code === "string" || typeof code === "number") {
        diagnostic.code = code;
      }
    }
    diagnostics.push(diagnostic);
    current = "cause" in current ? current.cause : undefined;
  }

  return diagnostics;
}
