# Data

The durable store is **Cloud Firestore** in the Firebase project, location `asia-south1` (Mumbai). It can be inspected and edited by the operator in the Firebase console.

The browser reads and writes Firestore directly. `firestore.rules` decides what is allowed: only the owner, only within one hour of sign-in, and only data that keeps the limits below.

## Owner

Collection `owners`. One document whose ID is the owner's Firebase Authentication user ID. The operator creates it by hand in the Firebase console; clients can never create, change or list it. A signed-in account without a document here is refused everything.

## Tag

Collection `tags`, one document per tag.

- Internal unique id (the document id), not shown in the UI.
- Visible name, Unicode, maximum 200 characters, unique among tags as the user sees names (including that a soft-deleted name still occupies that name for re-enable). Uniqueness is kept by a companion collection `tagNames`, keyed by a SHA-256 of the name and pointing at the owning tag; it is written in the same transaction as the tag.
- Soft-deleted flag. Remove from pick lists; never physically delete the document in this slice (the rules refuse deletes).
- Re-adding a name that belongs to a soft-deleted tag clears the deleted flag (re-enable). Do not create a second tag with the same name.

Records refer to tags by id. Renaming a tag changes the name everywhere those ids are shown. Soft-deleted tags still attached to records are shown as obsolete; records are not rewritten.

## Record

Collection `records`, one document per record.

- Optional description, Unicode, maximum 1000 characters.
- One or more tag ids (an array field, so history can filter by tag).
- No separate mood field. If mood is expressed, it is in the description and/or tags.
- Time of the moment (user-entered, or the server's time at save when left empty). Stored as an instant (Firestore timestamp); shown and entered in the device's local timezone. Must not be in the future at the moment of save or edit (the rules allow five minutes for a phone clock that runs fast).
- Soft-deleted flag. Hidden from history; not physically deleted in this slice (the rules refuse deletes). Restoring a record is not a UI flow in this slice.
- Version for optimistic locking. Read on open; the save runs in a transaction that succeeds only if the version still matches, then the version advances. The rules also require every change to advance the version by exactly one. On mismatch the save is refused and the client must load the latest.

History queries need composite indexes; they are declared in `firestore.indexes.json` and deployed with the app.

## Length limits

The app checks limits in Unicode characters (an emoji is one). Security rules can only measure strings in UTF-16 units, where an emoji is two, so the rules cap descriptions at 2000 and tag names at 400 units: never stricter than the app, still a hard upper bound.

## Configuration

There is no static key and no server secret. Who may use the app is the `owners` collection. There is no deploy key either: GitHub Actions deploys through Workload Identity Federation (`docs/deploy-setup.md`).
