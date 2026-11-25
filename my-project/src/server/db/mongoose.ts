import "server-only";
import mongoose, { type Connection } from "mongoose";
import { getServerEnv } from "@/server/env";

type MongooseGlobal = typeof globalThis & {
  __freelanceFlowMongoosePromise?: Promise<typeof mongoose>;
};

const globalForMongoose = globalThis as MongooseGlobal;

export async function getMongooseConnection(): Promise<Connection> {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const env = getServerEnv();
  const uri =
    process.env.NODE_ENV === "test" && env.TEST_MONGODB_URI
      ? env.TEST_MONGODB_URI
      : env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB URI is not configured.");
  const dbName =
    process.env.NODE_ENV === "test" && env.TEST_MONGODB_DB
      ? env.TEST_MONGODB_DB
      : env.MONGODB_DB;

  if (!globalForMongoose.__freelanceFlowMongoosePromise) {
    // Disable Mongoose's internal command buffering so operations fail fast
    // instead of queuing for 10 seconds when the connection is not yet ready.
    mongoose.set("bufferCommands", false);

    globalForMongoose.__freelanceFlowMongoosePromise = mongoose
      .connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 0,
      })
      .catch((error: unknown) => {
        globalForMongoose.__freelanceFlowMongoosePromise = undefined;
        console.error(
          "[Mongoose] Connection failed:",
          error instanceof Error ? error.message : error,
        );
        throw error;
      });
  }

  await globalForMongoose.__freelanceFlowMongoosePromise;
  return mongoose.connection;
}
