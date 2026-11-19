# UI shape

One web app. No native phone client in this slice. Away from home, only the personal phone is a client; office devices are out of scope.

## Screens

1. **Sign-in** — only "Sign in with Google" on launch (or "Access denied" for an account that is not the owner). No other chrome about the rest of the product.
2. **Log the moment** — default screen after unlock. Description, tags (full-screen picker with search and add-from-search), time (now unless a past time is set), save. After save, show that record and allow edit. History is not embedded here. There is no dedicated mood control.
3. **Side menu** — opened from a small control; hidden on the left until opened. Entries: history, tag management. Log the moment remains the home surface.
4. **History** — list of records that are not soft-deleted; open; edit description, tags, and time; filter by tag and by time range; delete with confirmation.
5. **Tag management** — add, rename, remove with confirmation.

## Limits in the UI

Show current count versus maximum only after description length exceeds 900 or a tag name exceeds 190 while typing. Over 1000 / 200, show a validation error and do not accept the value.

## Session end

One hour after sign-in, force the sign-in screen and drop unsaved fields.
