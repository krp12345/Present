import { errors } from "./errors.js";

export const MAX_DESCRIPTION_LEN = 1000;
export const MAX_TAG_NAME_LEN = 200;
export const MAX_UNLOCK_FAILURES = 5;

export type Tag = { id: string; name: string; deleted: boolean };

export type RecordItem = {
  id: string;
  description: string;
  momentAt: Date;
  version: number;
  deleted: boolean;
  tags: Tag[];
};

export type RecordInput = {
  description: string;
  momentAt: Date | null;
  tagIds: string[];
  version: number;
};

export type RecordFilter = { tagId?: string; from?: Date; to?: Date };

// Length limits count Unicode code points, not UTF-16 units, so an emoji is
// one character just as it was for the Go server.
function codePoints(s: string): number {
  return [...s].length;
}

export function validateDescription(description: string): void {
  if (codePoints(description) > MAX_DESCRIPTION_LEN) throw errors.descriptionTooLong();
}

export function normalizeTagName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") throw errors.tagNameRequired();
  if (codePoints(trimmed) > MAX_TAG_NAME_LEN) throw errors.tagNameTooLong();
  return trimmed;
}

const RFC3339 = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

export function parseTime(value: string): Date {
  const date = new Date(value);
  if (!RFC3339.test(value) || Number.isNaN(date.getTime())) throw errors.invalidTime();
  return date;
}

// RFC 3339 in UTC with whole seconds, the format the Go server produced.
export function formatTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
