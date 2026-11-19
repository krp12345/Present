// Data access, straight from the browser to Firestore. Firestore security
// rules (firestore.rules) only let the registered owner in, for one hour
// after sign-in, and re-check the limits below on Google's side.
//
// Collections:
//   owners/{uid}             present = this Google account may use the app (set in the console)
//   tags/{id}                { name, deleted, createdAt }
//   tagNames/{sha256(name)}  { tagId }  -- keeps names unique, soft-deleted included
//   records/{id}             { description, momentAt, deleted, version, tagIds, createdAt, updatedAt }

import {
  DocumentData,
  FirestoreError,
  QueryConstraint,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db, sessionExpired, signOut } from "./firebase";

export type Tag = { id: string; name: string; deleted: boolean };
export type RecordItem = {
  id: string;
  description: string;
  momentAt: string;
  version: number;
  deleted: boolean;
  tags: Tag[];
};

const MAX_DESCRIPTION_LEN = 1000;
const MAX_TAG_NAME_LEN = 200;

const fail = (message: string) => new Error(message);

// Length limits count Unicode characters, so an emoji counts as one.
const length = (s: string) => [...s].length;

function normalizeTagName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") throw fail("tag name required");
  if (length(trimmed) > MAX_TAG_NAME_LEN) throw fail("tag name too long");
  return trimmed;
}

function checkRecord(input: { description: string; tagIds: string[] }, momentAt: Date | null) {
  if (input.tagIds.length === 0) throw fail("at least one tag required");
  if (length(input.description) > MAX_DESCRIPTION_LEN) throw fail("description too long");
  if (momentAt && Number.isNaN(momentAt.getTime())) throw fail("invalid time");
  if (momentAt && momentAt.getTime() > Date.now()) throw fail("future time not allowed");
}

async function nameKey(name: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const byName = (a: Tag, b: Tag) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// RFC 3339 in UTC with whole seconds.
const formatTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function toRecord(id: string, data: DocumentData, tags: Map<string, Tag>): RecordItem {
  const momentAt: Timestamp | null = data.momentAt ?? null;
  return {
    id,
    description: data.description ?? "",
    momentAt: formatTime(momentAt ? momentAt.toDate() : new Date()),
    version: data.version,
    deleted: data.deleted === true,
    tags: ((data.tagIds ?? []) as string[])
      .map((t) => tags.get(t))
      .filter((t): t is Tag => t !== undefined)
      .sort(byName),
  };
}

// Turns Firestore failures into the messages the screens show. A refusal
// after the hour is up signs out, which returns to the sign-in screen and
// drops unsaved work.
async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof FirestoreError) {
      if (err.code === "permission-denied" || err.code === "unauthenticated") {
        if (await sessionExpired()) {
          await signOut();
          throw fail("session expired");
        }
        throw fail("not allowed");
      }
      if (err.code === "unavailable") throw fail("offline: could not reach the server");
      throw fail(err.message);
    }
    throw err;
  }
}

async function allTags(): Promise<Map<string, Tag>> {
  const snap = await getDocs(collection(await db(), "tags"));
  return new Map(
    snap.docs.map((d) => [d.id, { id: d.id, name: d.get("name"), deleted: d.get("deleted") === true }]),
  );
}

export const api = {
  async listTags(includeDeleted = false): Promise<Tag[]> {
    return guard(async () =>
      [...(await allTags()).values()].filter((t) => includeDeleted || !t.deleted).sort(byName),
    );
  },

  // Adds a tag, or re-enables the soft-deleted tag that already owns the name.
  async createTag(rawName: string): Promise<Tag> {
    const name = normalizeTagName(rawName);
    const key = await nameKey(name);
    return guard(async () => {
      const store = await db();
      const nameRef = doc(store, "tagNames", key);
      return runTransaction(store, async (tx) => {
        const owner = await tx.get(nameRef);
        if (owner.exists()) {
          const tagRef = doc(store, "tags", owner.get("tagId"));
          const existing = await tx.get(tagRef);
          if (existing.exists() && existing.get("deleted") === true) {
            tx.update(tagRef, { deleted: false });
            return { id: existing.id, name: existing.get("name"), deleted: false };
          }
          if (existing.exists()) throw fail("tag name already exists");
        }
        const tagRef = doc(collection(store, "tags"));
        tx.set(tagRef, { name, deleted: false, createdAt: serverTimestamp() });
        tx.set(nameRef, { tagId: tagRef.id });
        return { id: tagRef.id, name, deleted: false };
      });
    });
  },

  async renameTag(id: string, rawName: string): Promise<Tag> {
    const name = normalizeTagName(rawName);
    const key = await nameKey(name);
    return guard(async () => {
      const store = await db();
      const tagRef = doc(store, "tags", id);
      const newNameRef = doc(store, "tagNames", key);
      return runTransaction(store, async (tx) => {
        const tag = await tx.get(tagRef);
        const owner = await tx.get(newNameRef);
        if (owner.exists() && owner.get("tagId") !== id) throw fail("tag name already exists");
        if (!tag.exists() || tag.get("deleted") === true) throw fail("not found");
        const oldName: string = tag.get("name");
        if (oldName !== name) {
          tx.delete(doc(store, "tagNames", await nameKey(oldName)));
          tx.set(newNameRef, { tagId: id });
          tx.update(tagRef, { name });
        }
        return { id, name, deleted: false };
      });
    });
  },

  // Soft delete: the tag keeps its name and stays on existing records as obsolete.
  async deleteTag(id: string): Promise<void> {
    return guard(async () => {
      const store = await db();
      const tagRef = doc(store, "tags", id);
      await runTransaction(store, async (tx) => {
        const tag = await tx.get(tagRef);
        if (!tag.exists() || tag.get("deleted") === true) throw fail("not found");
        tx.update(tagRef, { deleted: true });
      });
    });
  },

  async listRecords(params: { tagId?: string; from?: string; to?: string } = {}): Promise<RecordItem[]> {
    return guard(async () => {
      const store = await db();
      const constraints: QueryConstraint[] = [where("deleted", "==", false)];
      if (params.tagId) constraints.push(where("tagIds", "array-contains", params.tagId));
      if (params.from) constraints.push(where("momentAt", ">=", Timestamp.fromDate(new Date(params.from))));
      if (params.to) constraints.push(where("momentAt", "<=", Timestamp.fromDate(new Date(params.to))));
      constraints.push(orderBy("momentAt", "desc"));
      const [snap, tags] = await Promise.all([getDocs(query(collection(store, "records"), ...constraints)), allTags()]);
      return snap.docs.map((d) => toRecord(d.id, d.data(), tags));
    });
  },

  async createRecord(input: { description: string; momentAt?: string; tagIds: string[] }): Promise<RecordItem> {
    const momentAt = input.momentAt ? new Date(input.momentAt) : null;
    checkRecord(input, momentAt);
    const tagIds = [...new Set(input.tagIds)];
    return guard(async () => {
      const store = await db();
      const ref = doc(collection(store, "records"));
      await runTransaction(store, async (tx) => {
        for (const tagId of tagIds) {
          if (!(await tx.get(doc(store, "tags", tagId))).exists()) throw fail("validation");
        }
        tx.set(ref, {
          description: input.description,
          // "Now" is the server's clock, so a fast phone clock cannot make it the future.
          momentAt: momentAt ? Timestamp.fromDate(momentAt) : serverTimestamp(),
          deleted: false,
          version: 1,
          tagIds,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      const [saved, tags] = await Promise.all([getDoc(ref), allTags()]);
      return toRecord(ref.id, saved.data()!, tags);
    });
  },

  // Optimistic locking: refused if the record changed since it was opened.
  async updateRecord(
    id: string,
    input: { description: string; momentAt: string; tagIds: string[]; version: number },
  ): Promise<RecordItem> {
    const momentAt = new Date(input.momentAt);
    checkRecord(input, momentAt);
    const tagIds = [...new Set(input.tagIds)];
    return guard(async () => {
      const store = await db();
      const ref = doc(store, "records", id);
      await runTransaction(store, async (tx) => {
        const current = await tx.get(ref);
        if (!current.exists() || current.get("deleted") === true) throw fail("not found");
        if (current.get("version") !== input.version) throw fail("record changed elsewhere");
        for (const tagId of tagIds) {
          if (!(await tx.get(doc(store, "tags", tagId))).exists()) throw fail("validation");
        }
        tx.update(ref, {
          description: input.description,
          momentAt: Timestamp.fromDate(momentAt),
          tagIds,
          version: input.version + 1,
          updatedAt: serverTimestamp(),
        });
      });
      const [saved, tags] = await Promise.all([getDoc(ref), allTags()]);
      return toRecord(id, saved.data()!, tags);
    });
  },

  // Soft delete: hidden from history, never physically removed.
  async deleteRecord(id: string): Promise<void> {
    return guard(async () => {
      const store = await db();
      const ref = doc(store, "records", id);
      await runTransaction(store, async (tx) => {
        const current = await tx.get(ref);
        if (!current.exists() || current.get("deleted") === true) throw fail("not found");
        tx.update(ref, { deleted: true, version: current.get("version") + 1, updatedAt: serverTimestamp() });
      });
    });
  },
};
