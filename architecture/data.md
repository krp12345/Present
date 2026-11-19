# Data

The durable store is **Cloud Firestore** in the Firebase project. It survives function restarts and redeploys and can be inspected by the operator in the Firebase console.

Browsers never read or write Firestore directly: the security rules deny all client access. Only the `api` Cloud Function, using the Admin SDK, touches the data.

## Tag

Collection `tags`, one document per tag.

- Internal unique id (the document id), not shown in the UI.
- Visible name, Unicode, maximum 200 characters, unique among tags as the user sees names (including that a soft-deleted name still occupies that name for re-enable). Uniqueness is enforced by a companion collection `tagNames`, keyed by a hash of the name and pointing at the owning tag; it is written in the same transaction as the tag.
- Soft-deleted flag. Remove from pick lists; never physically delete the document in this slice.
- Re-adding a name that belongs to a soft-deleted tag clears the deleted flag (re-enable). Do not create a second tag with the same name.

Records refer to tags by id. Renaming a tag changes the name everywhere those ids are shown. Soft-deleted tags still attached to records are shown as obsolete; records are not rewritten.

## Record

Collection `records`, one document per record.

- Optional description, Unicode, maximum 1000 characters.
- One or more tag ids (an array field, so history can filter by tag).
- No separate mood field. If mood is expressed, it is in the description and/or tags.
- Time of the moment (user-entered or defaulted to save time). Stored as an instant (Firestore timestamp); shown and entered in the device’s local timezone. Must not be in the future at the moment of save or edit.
- Soft-deleted flag. Hidden from history; not physically deleted in this slice. Restoring a record is not a UI flow in this slice.
- Version for optimistic locking. Read on open; save succeeds only if the version still matches; then the version advances. The check and the write happen in one transaction. On mismatch the save is refused and the client must load the latest.

History queries need composite indexes; they are declared in `firestore.indexes.json` and deployed with the app.

## Sessions

Collection `sessions`, keyed by a hash of the temporary key (the key itself is never stored), with its expiry. A Firestore TTL policy removes expired documents; expiry is also checked on every request.

## Lockout state

Collection `lockouts`, keyed by a hash of the client identity, with the identity in readable form, the failure count and the blocked flag. Kept in Firestore so restarts and redeploys do not clear them.

## Configuration

The static key lives in server configuration, not in the record/tag data. It is stored in **Cloud Secret Manager** as `PRESENT_STATIC_KEY` and bound to the function. It must not be committed to the repository.
