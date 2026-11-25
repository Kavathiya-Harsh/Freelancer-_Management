import "server-only";
import argon2 from "argon2";
import { passwordSchema } from "./validation";

const argon2idOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  passwordSchema.parse(password);
  return argon2.hash(password, argon2idOptions);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash.startsWith("$argon2id$")) return false;
  return argon2.verify(passwordHash, password);
}
