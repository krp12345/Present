// HTTP routes. Paths, methods, bodies and responses are the same as the Go
// server's, so the web client did not have to change.

import type { Response } from "express";
import type { Request } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import * as auth from "./auth.js";
import { RecordFilter, RecordInput, RecordItem, formatTime, normalizeTagName, parseTime, validateDescription } from "./domain.js";
import { AppError, errors } from "./errors.js";
import * as store from "./store.js";

export type Config = { staticKey: () => string; sessionTtlSeconds: () => number };

type Ctx = { req: Request; res: Response; id: string; config: Config };
type Handler = (ctx: Ctx) => Promise<void>;
type Route = { pattern: RegExp; session: boolean; methods: Record<string, Handler> };

const ID = "([^/]+)";

function send(res: Response, status: number, body?: unknown): void {
  if (body === undefined) {
    res.status(status).end();
    return;
  }
  res.status(status).json(body);
}

function body(req: Request): Record<string, unknown> {
  const value = req.body;
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw errors.invalidBody();
  return value as Record<string, unknown>;
}

function stringField(b: Record<string, unknown>, key: string): string {
  const value = b[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw errors.invalidBody();
  return value;
}

function queryString(req: Request, key: string): string {
  const value = req.query[key];
  return typeof value === "string" ? value : "";
}

function recordDto(r: RecordItem) {
  return {
    id: r.id,
    description: r.description,
    momentAt: formatTime(r.momentAt),
    version: r.version,
    deleted: r.deleted,
    tags: r.tags.map((t) => ({ id: t.id, name: t.name, deleted: t.deleted })),
  };
}

function recordInput(req: Request): RecordInput {
  const b = body(req);
  const tagIds = b.tagIds ?? [];
  if (!Array.isArray(tagIds) || !tagIds.every((t) => typeof t === "string")) throw errors.invalidBody();
  const version = b.version ?? 0;
  if (typeof version !== "number" || !Number.isInteger(version)) throw errors.invalidBody();
  const momentAt = stringField(b, "momentAt");
  return {
    description: stringField(b, "description"),
    momentAt: momentAt ? parseTime(momentAt) : null,
    tagIds: tagIds as string[],
    version,
  };
}

function checkRecord(input: RecordInput, defaultNow: boolean): RecordInput & { momentAt: Date } {
  if (input.tagIds.length === 0) throw errors.atLeastOneTag();
  validateDescription(input.description);
  const now = new Date();
  // A new record without a time is "now"; an edit must say when the moment was.
  if (!input.momentAt && !defaultNow) throw errors.invalidTime();
  const momentAt = input.momentAt ?? now;
  if (momentAt.getTime() > now.getTime()) throw errors.futureTime();
  return { ...input, momentAt };
}

const routes: Route[] = [
  {
    pattern: /^\/api\/unlock$/,
    session: false,
    methods: {
      POST: async ({ req, res, config }) => {
        const identity = auth.clientIdentity(req);
        const outcome = await auth.unlock(
          identity,
          auth.staticKeyFrom(req),
          config.staticKey(),
          config.sessionTtlSeconds(),
        );
        if (!outcome.ok) {
          send(res, 401, { error: "denied", triesRemaining: outcome.triesRemaining });
          return;
        }
        send(res, 200, { sessionToken: outcome.sessionToken, expiresAt: outcome.expiresAt.toISOString() });
      },
    },
  },
  {
    pattern: /^\/api\/status$/,
    session: false,
    methods: {
      GET: async ({ req, res }) => {
        send(res, 200, await auth.status(auth.clientIdentity(req), auth.sessionToken(req)));
      },
    },
  },
  {
    pattern: /^\/api\/tags$/,
    session: true,
    methods: {
      GET: async ({ req, res }) => {
        send(res, 200, await store.listTags(queryString(req, "includeDeleted") === "true"));
      },
      POST: async ({ req, res }) => {
        const name = normalizeTagName(stringField(body(req), "name"));
        send(res, 201, await store.createOrReEnableTag(name));
      },
    },
  },
  {
    pattern: new RegExp(`^/api/tags/${ID}$`),
    session: true,
    methods: {
      PUT: async ({ req, res, id }) => {
        const name = normalizeTagName(stringField(body(req), "name"));
        send(res, 200, await store.renameTag(id, name));
      },
      DELETE: async ({ res, id }) => {
        await store.softDeleteTag(id);
        send(res, 204);
      },
    },
  },
  {
    pattern: /^\/api\/records$/,
    session: true,
    methods: {
      GET: async ({ req, res }) => {
        const filter: RecordFilter = {};
        const tagId = queryString(req, "tagId");
        const from = queryString(req, "from");
        const to = queryString(req, "to");
        if (tagId) filter.tagId = tagId;
        if (from) filter.from = parseTime(from);
        if (to) filter.to = parseTime(to);
        send(res, 200, (await store.listRecords(filter)).map(recordDto));
      },
      POST: async ({ req, res }) => {
        const input = checkRecord(recordInput(req), true);
        send(res, 201, recordDto(await store.createRecord(input)));
      },
    },
  },
  {
    pattern: new RegExp(`^/api/records/${ID}$`),
    session: true,
    methods: {
      GET: async ({ res, id }) => {
        send(res, 200, recordDto(await store.getRecord(id)));
      },
      PUT: async ({ req, res, id }) => {
        const input = checkRecord(recordInput(req), false);
        send(res, 200, recordDto(await store.updateRecord(id, input)));
      },
      DELETE: async ({ res, id }) => {
        await store.softDeleteRecord(id);
        send(res, 204);
      },
    },
  },
];

export async function handle(req: Request, res: Response, config: Config): Promise<void> {
  // Responses carry personal data and per-device keys; never let the Hosting
  // CDN or a browser cache them.
  res.set("Cache-Control", "no-store");
  try {
    for (const route of routes) {
      const match = route.pattern.exec(req.path);
      if (!match) continue;
      const handler = route.methods[req.method];
      if (!handler) throw errors.methodNotAllowed();
      let id = "";
      if (match[1] !== undefined) {
        id = decodeURIComponent(match[1]);
        if (id === "." || id === ".." || id.includes("/")) throw errors.notFound();
      }
      if (route.session && !(await auth.validateSession(auth.sessionToken(req)))) {
        throw errors.sessionExpired();
      }
      await handler({ req, res, id, config });
      return;
    }
    throw errors.notFound();
  } catch (err) {
    if (err instanceof AppError) {
      send(res, err.status, { error: err.message });
      return;
    }
    if (err instanceof URIError) {
      send(res, 404, { error: "not found" });
      return;
    }
    logger.error("request failed", err);
    send(res, 500, { error: "server error" });
  }
}
