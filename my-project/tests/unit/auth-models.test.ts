import { describe, expect, it } from "vitest";
import { AuthSessionModel } from "../../src/server/models/AuthSession";
import { AuthTokenModel } from "../../src/server/models/AuthToken";
import { RefreshTokenModel } from "../../src/server/models/RefreshToken";
import { UserModel } from "../../src/server/models/User";

describe("custom auth persistence schemas", () => {
  it("uses separate collections and protects the unique normalized email index", () => {
    expect(UserModel.collection.collectionName).toBe("users");
    expect(UserModel.schema.path("passwordHash").options.select).toBe(false);
    const emailIndex = UserModel.schema
      .indexes()
      .find(([keys]) => keys.normalizedEmail === 1);
    expect(emailIndex?.[1]).toMatchObject({ unique: true });
  });

  it("stores session, refresh-token, and one-time-token records separately", () => {
    expect(AuthSessionModel.collection.collectionName).toBe("authSessions");
    expect(RefreshTokenModel.collection.collectionName).toBe("authRefreshTokens");
    expect(AuthTokenModel.collection.collectionName).toBe("authTokens");
    const refreshIndex = RefreshTokenModel.schema
      .indexes()
      .find(([keys]) => keys.tokenHash === 1);
    const oneTimeTokenIndex = AuthTokenModel.schema
      .indexes()
      .find(([keys]) => keys.tokenHash === 1);
    expect(refreshIndex?.[1]).toMatchObject({ unique: true });
    expect(oneTimeTokenIndex?.[1]).toMatchObject({ unique: true });
  });
});
