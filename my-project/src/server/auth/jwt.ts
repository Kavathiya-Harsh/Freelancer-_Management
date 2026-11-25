import "server-only";
import { randomUUID } from "node:crypto";
import { errors, SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const jwtEnvironmentSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().min(1),
  AUTH_ACCESS_TOKEN_TTL: z.coerce.number().int().min(600).max(900).default(900),
});

type JwtSettings = {
  key: Uint8Array;
  issuer: string;
  audience: string;
  accessTokenTtlSeconds: number;
};

function getJwtSettings(): JwtSettings {
  const result = jwtEnvironmentSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      "JWT configuration is invalid. Set a 32-byte base64url JWT_ACCESS_SECRET, JWT_ISSUER, and JWT_AUDIENCE.",
    );
  }
  const key = Buffer.from(result.data.JWT_ACCESS_SECRET, "base64url");
  if (
    key.byteLength !== 32 ||
    key.toString("base64url") !== result.data.JWT_ACCESS_SECRET
  ) {
    throw new Error("JWT_ACCESS_SECRET must be a canonical base64url encoding of 32 random bytes.");
  }
  return {
    key,
    issuer: result.data.JWT_ISSUER,
    audience: result.data.JWT_AUDIENCE,
    accessTokenTtlSeconds: result.data.AUTH_ACCESS_TOKEN_TTL,
  };
}

export type AccessTokenClaims = {
  userId: string;
  sessionId: string;
  tokenId: string;
  issuedAt: number;
  expiresAt: number;
};

export class InvalidAccessTokenError extends Error {
  constructor() {
    super("INVALID_ACCESS_TOKEN");
    this.name = "InvalidAccessTokenError";
  }
}

export async function signAccessToken(input: {
  userId: string;
  sessionId: string;
}): Promise<string> {
  const settings = getJwtSettings();
  if (!input.userId || !input.sessionId) {
    throw new Error("Access token subject and session ID are required.");
  }
  return new SignJWT({ sid: input.sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(settings.issuer)
    .setAudience(settings.audience)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${settings.accessTokenTtlSeconds}s`)
    .sign(settings.key);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const settings = getJwtSettings();
  try {
    const { payload } = await jwtVerify(token, settings.key, {
      algorithms: ["HS256"],
      issuer: settings.issuer,
      audience: settings.audience,
      requiredClaims: ["sub", "sid", "jti", "iat", "exp"],
      maxTokenAge: `${settings.accessTokenTtlSeconds}s`,
      clockTolerance: 5,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      throw new InvalidAccessTokenError();
    }
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      tokenId: payload.jti,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch (error) {
    if (error instanceof errors.JOSEError) throw new InvalidAccessTokenError();
    throw error;
  }
}
