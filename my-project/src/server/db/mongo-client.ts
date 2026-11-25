import "server-only";
import { Db, MongoClient } from "mongodb";
import { getServerEnv } from "@/server/env";
import { getMongoErrorDiagnostics } from "./mongo-error-diagnostics";

type MongoGlobal = typeof globalThis & {
  __freelanceFlowMongoClient?: MongoClient;
  __freelanceFlowMongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

// The fallback lets Next.js analyze route modules during a build without a
// deployed secret. Requests always validate the environment before use.
export function getMongoClientInstance(): MongoClient {
  if (!globalForMongo.__freelanceFlowMongoClient) {
    const uri =
      (process.env.NODE_ENV === "test" && process.env.TEST_MONGODB_URI) ||
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/freelanceflow-build";
    let client: MongoClient;
    try {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8_000,
        connectTimeoutMS: 8_000,
        retryWrites: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "MongoParseError" &&
        /(?:Password|Username) contains unescaped characters/.test(error.message)
      ) {
        throw new Error(
          "MONGODB_URI has unescaped characters in its credentials. Percent-encode the username and password (for example, @ as %40).",
          { cause: error },
        );
      }
      throw error;
    }
    globalForMongo.__freelanceFlowMongoClient = client;
  }
  return globalForMongo.__freelanceFlowMongoClient;
}

export function getMongoClient(): Promise<MongoClient> {
  getServerEnv();
  const instance = getMongoClientInstance();
  if (!globalForMongo.__freelanceFlowMongoClientPromise) {
    globalForMongo.__freelanceFlowMongoClientPromise = instance
      .connect()
      .then(() => instance)
      .catch((error: unknown) => {
        globalForMongo.__freelanceFlowMongoClientPromise = undefined;
        console.error("MongoDB connection failed", {
          causes: getMongoErrorDiagnostics(error),
        });
        throw new Error("Database connection is unavailable.");
      });
  }
  return globalForMongo.__freelanceFlowMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const env = getServerEnv();
  const dbName =
    process.env.NODE_ENV === "test" && env.TEST_MONGODB_DB
      ? env.TEST_MONGODB_DB
      : env.MONGODB_DB;
  return client.db(dbName);
}
