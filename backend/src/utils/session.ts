import { FastifyRequest, FastifyReply } from "fastify";
import { createHash, randomBytes } from "crypto";
import { env } from "./env";

export const SESSION_COOKIE_NAME = "lloka:session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  avatar: string | null;
  token: string | null;
  email: string | null;
};

export type SessionRecord = {
  id: string;
  userId: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user: SessionUser;
};

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function getSessionCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    signed: false,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(
    SESSION_COOKIE_NAME,
    `Bearer ${token}`,
    getSessionCookieOptions(),
  );
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: "/",
  });
}

export function extractBearerToken(request: FastifyRequest) {
  const authorizationHeader = request.headers.authorization;
  if (
    typeof authorizationHeader === "string" &&
    authorizationHeader.startsWith("Bearer ")
  ) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }
  const cookieToken = request.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.startsWith("Bearer ")) {
    return cookieToken.slice("Bearer ".length).trim();
  }
  return null;
}
