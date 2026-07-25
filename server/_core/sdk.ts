import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";

export type SessionPayload = {
  userId: number;
  openId: string;
  name: string;
};

class SDKServer {
  private getSessionSecret() {
    const secret = process.env.JWT_SECRET || "mnil-ink-secret-change-me";
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    user: User,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId: user.id,
      openId: user.openId,
      name: user.name || "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: number; openId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId, openId, name } = payload as Record<string, unknown>;

      if (
        typeof userId !== "number" ||
        typeof openId !== "string" ||
        typeof name !== "string"
      ) {
        return null;
      }

      return {
        userId,
        openId,
        name,
      };
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    // Try to get session from cookie
    const cookieHeader = req.headers.cookie;
    let sessionToken: string | undefined;

    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      sessionToken = cookies.get(COOKIE_NAME);
    }

    if (!sessionToken) {
      throw ForbiddenError("No session cookie found");
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session");
    }

    // Get user from DB
    const { getUserById } = await import("../db");
    const user = await getUserById(session.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

function parseCookies(cookieHeader: string): Map<string, string> {
  const parsed = new Map<string, string>();
  cookieHeader.split(";").forEach(part => {
    const [key, ...rest] = part.trim().split("=");
    if (key) {
      parsed.set(key, rest.join("="));
    }
  });
  return parsed;
}

export const sdk = new SDKServer();
