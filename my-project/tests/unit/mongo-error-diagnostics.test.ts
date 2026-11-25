import { describe, expect, it } from "vitest";
import { getMongoErrorDiagnostics } from "../../src/server/db/mongo-error-diagnostics";

describe("MongoDB error diagnostics", () => {
  it("reports only error names and codes from nested causes", () => {
    const secretUri = "mongodb+srv://user:secret@cluster.example.test";
    const rootCause = Object.assign(new Error(secretUri), {
      code: "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR",
    });
    const error = new Error("server selection failed", { cause: rootCause });

    const diagnostics = getMongoErrorDiagnostics(error);

    expect(diagnostics).toEqual([
      { name: "Error" },
      { name: "Error", code: "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain(secretUri);
  });

  it("limits the cause chain to five entries", () => {
    let cause: Error = new Error("root");
    for (let index = 0; index < 8; index += 1) {
      cause = new Error(`cause-${index}`, { cause });
    }

    expect(getMongoErrorDiagnostics(cause)).toHaveLength(5);
  });
});
