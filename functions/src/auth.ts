// Static key unlock, temporary keys, and lockout (architecture/authentication.md).

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "firebase-functions/v2/https";
import { MAX_UNLOCK_FAILURES } from "./domain.js";
import { errors } from "./errors.js";
import * as store from "./store.js";

export const HEADER_STATIC_KEY = "x-present-key";
export const HEADER_SESSION = "x-present-session";
export const HEADER_CLIENT_ID = "x-present-client-id";

function header(req: Request, name: string): string {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Firebase Hosting and Cloud Run sit in front of the function, so the
// connection address is Google's proxy. The client's address is the first
// entry of X-Forwarded-For.
function clientIp(req: Request): string {
  const forwarded = header(req, "x-forwarded-for").split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

export function clientIdentity(req: Request): string {
  const clientId = header(req, HEADER_CLIENT_ID).trim() || "anonymous";
  return `${clientIp(req)}|${clientId}`;
}

export function sessionToken(req: Request): string {
  return header(req, HEADER_SESSION);
}

export function staticKeyFrom(req: Request): string {
  const fromHeader = header(req, HEADER_STATIC_KEY);
  if (fromHeader) return fromHeader;
  const body = req.body as { key?: unknown } | undefined;
  return typeof body?.key === "string" ? body.key : "";
}

function keysMatch(submitted: string, configured: string): boolean {
  // Compare digests so the comparison is constant time whatever the lengths.
  const a = createHash("sha256").update(submitted.trim()).digest();
  const b = createHash("sha256").update(configured).digest();
  return configured !== "" && timingSafeEqual(a, b);
}

export async function status(identity: string, token: string) {
  const lockout = await store.getLockout(identity);
  if (lockout.blocked) return { blocked: true, triesRemaining: 0, sessionValid: false };
  return {
    blocked: false,
    triesRemaining: MAX_UNLOCK_FAILURES - lockout.failures,
    sessionValid: token ? await validateSession(token) : false,
  };
}

export type UnlockOutcome =
  | { ok: true; sessionToken: string; expiresAt: Date }
  | { ok: false; triesRemaining: number };

export async function unlock(
  identity: string,
  key: string,
  configuredKey: string,
  ttlSeconds: number,
): Promise<UnlockOutcome> {
  const lockout = await store.getLockout(identity);
  if (lockout.blocked) throw errors.blocked();

  if (!keysMatch(key, configuredKey)) {
    const after = await store.recordFailure(identity);
    return { ok: false, triesRemaining: Math.max(0, MAX_UNLOCK_FAILURES - after.failures) };
  }

  await store.resetLockout(identity);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await store.createSession(token, expiresAt);
  return { ok: true, sessionToken: token, expiresAt };
}

export async function validateSession(token: string): Promise<boolean> {
  if (token.trim() === "") return false;
  const expires = await store.getSessionExpiry(token);
  if (!expires) return false;
  if (Date.now() > expires.getTime()) {
    await store.deleteSession(token).catch(() => undefined);
    return false;
  }
  return true;
}
