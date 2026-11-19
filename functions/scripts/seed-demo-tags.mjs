// Adds a starter set of tags. Names that already exist (even soft-deleted)
// are left alone. Build first: npm --prefix functions run build
//
//   Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-present npm --prefix functions run seed
//   Production: gcloud auth application-default login
//               GCLOUD_PROJECT=<your-project-id> npm --prefix functions run seed
import { createOrReEnableTag, listTags } from "../lib/store.js";

const names = [
  "morning", "evening", "work", "personal", "exercise", "family", "reading",
  "health", "food", "travel", "friends", "learning", "creative", "outdoors",
  "rest", "chores", "shopping", "music", "meditation", "social", "commute",
  "meeting", "project", "weekend", "errands",
];

const existing = new Set((await listTags(true)).map((t) => t.name));
let added = 0;
for (const name of names) {
  if (existing.has(name)) continue;
  await createOrReEnableTag(name);
  added++;
}
console.log(`Added ${added} tag(s); ${names.length - added} already existed.`);
