// Firestore persistence. This replaces the PostgreSQL repositories.
//
// Collections:
//   lockouts/{sha256(identity)}  { identity, failures, blocked }
//   sessions/{sha256(token)}     { expiresAt, createdAt }
//   tags/{id}                    { name, deleted, createdAt }
//   tagNames/{sha256(name)}      { tagId }  -- enforces unique names, soft-deleted included
//   records/{id}                 { description, momentAt, deleted, version, tagIds, createdAt, updatedAt }
//
// Clients never touch Firestore directly (firestore.rules denies everything);
// only this function, through the Admin SDK, reads and writes.

import { createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Firestore, Timestamp, getFirestore } from "firebase-admin/firestore";
import { MAX_UNLOCK_FAILURES, RecordFilter, RecordInput, RecordItem, Tag } from "./domain.js";
import { errors } from "./errors.js";

initializeApp();
const db: Firestore = getFirestore();

const lockouts = db.collection("lockouts");
const sessions = db.collection("sessions");
const tags = db.collection("tags");
const tagNames = db.collection("tagNames");
const records = db.collection("records");

// Document ids are hashes so that any string (IPs, Unicode tag names, tokens)
// is a valid id, and so raw session tokens are never stored.
function hashId(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// ---------- lockout ----------

export type Lockout = { failures: number; blocked: boolean };

export async function getLockout(identity: string): Promise<Lockout> {
  const snap = await lockouts.doc(hashId(identity)).get();
  return { failures: snap.get("failures") ?? 0, blocked: snap.get("blocked") ?? false };
}

// Records one failed unlock atomically and returns the new state.
export async function recordFailure(identity: string): Promise<Lockout> {
  const ref = lockouts.doc(hashId(identity));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const failures = (snap.get("failures") ?? 0) + 1;
    const state = { failures, blocked: failures >= MAX_UNLOCK_FAILURES };
    tx.set(ref, { identity, ...state, updatedAt: FieldValue.serverTimestamp() });
    return state;
  });
}

export async function resetLockout(identity: string): Promise<void> {
  await lockouts
    .doc(hashId(identity))
    .set({ identity, failures: 0, blocked: false, updatedAt: FieldValue.serverTimestamp() });
}

// ---------- sessions ----------

export async function createSession(token: string, expiresAt: Date): Promise<void> {
  await sessions.doc(hashId(token)).create({
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getSessionExpiry(token: string): Promise<Date | null> {
  const snap = await sessions.doc(hashId(token)).get();
  const expires: Timestamp | undefined = snap.get("expiresAt");
  return expires ? expires.toDate() : null;
}

export async function deleteSession(token: string): Promise<void> {
  await sessions.doc(hashId(token)).delete();
}

// ---------- tags ----------

function toTag(snap: FirebaseFirestore.DocumentSnapshot): Tag {
  return { id: snap.id, name: snap.get("name"), deleted: snap.get("deleted") === true };
}

function byName(a: Tag, b: Tag): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export async function listTags(includeDeleted: boolean): Promise<Tag[]> {
  const snap = await tags.get();
  return snap.docs
    .map(toTag)
    .filter((t) => includeDeleted || !t.deleted)
    .sort(byName);
}

// Adds a tag, or re-enables the soft-deleted tag that already owns the name.
export async function createOrReEnableTag(name: string): Promise<Tag> {
  const nameRef = tagNames.doc(hashId(name));
  return db.runTransaction(async (tx) => {
    const owner = await tx.get(nameRef);
    if (owner.exists) {
      const tagRef = tags.doc(owner.get("tagId"));
      const existing = await tx.get(tagRef);
      if (existing.exists && existing.get("deleted") === true) {
        tx.update(tagRef, { deleted: false });
        return { id: existing.id, name: existing.get("name"), deleted: false };
      }
      if (existing.exists) throw errors.tagNameExists();
      // A dangling name entry: fall through and claim the name afresh.
    }
    const tagRef = tags.doc();
    tx.set(tagRef, { name, deleted: false, createdAt: FieldValue.serverTimestamp() });
    tx.set(nameRef, { tagId: tagRef.id });
    return { id: tagRef.id, name, deleted: false };
  });
}

export async function renameTag(id: string, name: string): Promise<Tag> {
  const tagRef = tags.doc(id);
  const newNameRef = tagNames.doc(hashId(name));
  return db.runTransaction(async (tx) => {
    const [tag, owner] = await tx.getAll(tagRef, newNameRef);
    if (owner.exists && owner.get("tagId") !== id) throw errors.tagNameExists();
    if (!tag.exists || tag.get("deleted") === true) throw errors.notFound();
    const oldName: string = tag.get("name");
    if (oldName !== name) {
      tx.delete(tagNames.doc(hashId(oldName)));
      tx.set(newNameRef, { tagId: id });
      tx.update(tagRef, { name });
    }
    return { id, name, deleted: false };
  });
}

export async function softDeleteTag(id: string): Promise<void> {
  const tagRef = tags.doc(id);
  await db.runTransaction(async (tx) => {
    const tag = await tx.get(tagRef);
    if (!tag.exists || tag.get("deleted") === true) throw errors.notFound();
    // The name entry stays: a soft-deleted tag still owns its name.
    tx.update(tagRef, { deleted: true });
  });
}

// ---------- records ----------

type RecordDoc = {
  description: string;
  momentAt: Timestamp;
  deleted: boolean;
  version: number;
  tagIds: string[];
};

function isValidDocId(id: string): boolean {
  return id !== "" && !id.includes("/") && id !== "." && id !== "..";
}

async function loadTagsById(ids: Iterable<string>): Promise<Map<string, Tag>> {
  const unique = [...new Set(ids)].filter(isValidDocId);
  const out = new Map<string, Tag>();
  if (unique.length === 0) return out;
  const snaps = await db.getAll(...unique.map((id) => tags.doc(id)));
  for (const snap of snaps) if (snap.exists) out.set(snap.id, toTag(snap));
  return out;
}

function toRecord(id: string, data: RecordDoc, tagMap: Map<string, Tag>): RecordItem {
  const recordTags = (data.tagIds ?? [])
    .map((tagId) => tagMap.get(tagId))
    .filter((t): t is Tag => t !== undefined)
    .sort(byName);
  return {
    id,
    description: data.description ?? "",
    momentAt: data.momentAt.toDate(),
    version: data.version,
    deleted: data.deleted === true,
    tags: recordTags,
  };
}

export async function listRecords(filter: RecordFilter): Promise<RecordItem[]> {
  let query: FirebaseFirestore.Query = records.where("deleted", "==", false);
  if (filter.tagId) query = query.where("tagIds", "array-contains", filter.tagId);
  if (filter.from) query = query.where("momentAt", ">=", Timestamp.fromDate(filter.from));
  if (filter.to) query = query.where("momentAt", "<=", Timestamp.fromDate(filter.to));
  const snap = await query.orderBy("momentAt", "desc").get();

  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as RecordDoc }));
  const tagMap = await loadTagsById(docs.flatMap((d) => d.data.tagIds ?? []));
  return docs.map((d) => toRecord(d.id, d.data, tagMap));
}

export async function getRecord(id: string): Promise<RecordItem> {
  if (!isValidDocId(id)) throw errors.notFound();
  const snap = await records.doc(id).get();
  const data = snap.data() as RecordDoc | undefined;
  if (!data || data.deleted) throw errors.notFound();
  return toRecord(snap.id, data, await loadTagsById(data.tagIds ?? []));
}

// Every tag id must name an existing tag (soft-deleted ones included), as the
// foreign key did in PostgreSQL.
async function requireTags(tx: FirebaseFirestore.Transaction, tagIds: string[]): Promise<Map<string, Tag>> {
  if (!tagIds.every(isValidDocId)) throw errors.validation();
  const snaps = await tx.getAll(...tagIds.map((id) => tags.doc(id)));
  if (snaps.some((s) => !s.exists)) throw errors.validation();
  return new Map(snaps.map((s) => [s.id, toTag(s)]));
}

export async function createRecord(input: RecordInput & { momentAt: Date }): Promise<RecordItem> {
  const tagIds = [...new Set(input.tagIds)];
  const ref = records.doc();
  return db.runTransaction(async (tx) => {
    const tagMap = await requireTags(tx, tagIds);
    const data: RecordDoc = {
      description: input.description,
      momentAt: Timestamp.fromDate(input.momentAt),
      deleted: false,
      version: 1,
      tagIds,
    };
    tx.create(ref, { ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return toRecord(ref.id, data, tagMap);
  });
}

// Optimistic locking: the save succeeds only if the caller read the current
// version; the version then advances.
export async function updateRecord(id: string, input: RecordInput & { momentAt: Date }): Promise<RecordItem> {
  if (!isValidDocId(id)) throw errors.notFound();
  const tagIds = [...new Set(input.tagIds)];
  const ref = records.doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.data() as RecordDoc | undefined;
    if (!current || current.deleted) throw errors.notFound();
    if (input.version !== current.version) throw errors.staleVersion();
    const tagMap = await requireTags(tx, tagIds);
    const data: RecordDoc = {
      description: input.description,
      momentAt: Timestamp.fromDate(input.momentAt),
      deleted: false,
      version: current.version + 1,
      tagIds,
    };
    tx.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
    return toRecord(id, data, tagMap);
  });
}

export async function softDeleteRecord(id: string): Promise<void> {
  if (!isValidDocId(id)) throw errors.notFound();
  const ref = records.doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("deleted") === true) throw errors.notFound();
    tx.update(ref, { deleted: true });
  });
}
