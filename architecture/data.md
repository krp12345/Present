# Data

The durable store is **PostgreSQL** on the home machine. It must survive process restart and can be queried by the operator.

## Tag

- Internal unique id, not shown in the UI.
- Visible name, Unicode, maximum 200 characters, unique among tags as the user sees names (including that a soft-deleted name still occupies that name for re-enable).
- Soft-deleted flag. Remove from pick lists; never physically delete the row in this slice.
- Re-adding a name that belongs to a soft-deleted tag clears the deleted flag (re-enable). Do not insert a second row with the same name.

Records refer to tags by id. Renaming a tag changes the name everywhere those ids are shown. Soft-deleted tags still attached to records are shown as obsolete; records are not rewritten.

## Record

- Optional description, Unicode, maximum 1000 characters.
- One or more tag ids.
- No separate mood field. If mood is expressed, it is in the description and/or tags.
- Time of the moment (user-entered or defaulted to save time). Stored as an instant; shown and entered in the device’s local timezone. Must not be in the future at the moment of save or edit.
- Soft-deleted flag. Hidden from history; not physically deleted in this slice. Restoring a record is not a UI flow in this slice.
- Version (or equivalent) for optimistic locking. Read on open; save succeeds only if the version still matches; then the version advances. On mismatch the save is refused and the client must load the latest.

## Lockout state

Failure counts and blocked identities must live in PostgreSQL so restart does not clear them.

## Configuration

The static key lives in server configuration, not in the record/tag data. It is read from the **OS secret store** on the home machine (for example Linux keyring or macOS Keychain). It must not be committed to the repository.
