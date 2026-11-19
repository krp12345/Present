# System overview

Present is a single web application hosted on **Firebase**. The same UI is used in a browser on the home PC and on the personal phone, at home or away.

There is no user account table and no username. Identity is a configured static key. After that key is accepted, the server issues a temporary key. Further requests must carry a valid temporary key. The key is sent in a request header; the server accepts or rejects before doing any other work.

```
Browser (home PC or personal phone)
    -> HTTPS only (Firebase Hosting, Google-managed certificate)
    -> header with static key (unlock only)
    -> header with temporary key (after unlock)
Firebase Hosting
    -> static SPA files
    -> /api/** rewritten to the `api` Cloud Function (same origin)
Cloud Function `api`
    -> Firestore (Admin SDK; browsers have no direct Firestore access)
    -> static key from Cloud Secret Manager
```

HTTP is not served to clients: Firebase Hosting redirects to HTTPS and sends HSTS (see `transport.md`).

Modules the UI exposes after unlock: log the moment (default), history, tag management. Navigation between them is a shell (side menu). Pattern analysis is not a module yet.

## Parts

- **Unlock:** compare submitted static key to the configured secret; count failures; issue temporary keys; enforce lockout.
- **Session:** temporary key, one hour lifetime, independent per device so PC and phone may be open together.
- **Records:** present-moment notes with optional description, one or more tags, a time that is now or in the past.
- **Tags:** stable internal id, visible name, soft-delete flag.
- **History:** list, filter, edit, soft-delete records; refuse stale saves using a version on each record.

## Decided infrastructure

- **Hosting:** Firebase Hosting serves the built SPA and fronts the API.
- **API:** one HTTPS Cloud Function for Firebase (2nd gen), reached through a Hosting rewrite.
- **Persistent store:** Cloud Firestore. Details: `data.md`.
- **Reachability:** the project's Firebase Hosting domain (`<project-id>.web.app`), from anywhere. Details: `reachability.md`.
- **HTTPS certificates:** managed by Firebase Hosting. Details: `transport.md`.
- **Static key storage:** Cloud Secret Manager, bound to the function. Must not be committed to the repository. Details: `data.md`.

## Implementation stack

- **Server:** TypeScript on Node.js 22, Cloud Functions for Firebase, Firebase Admin SDK for Firestore.
- **Client:** SolidJS SPA talking to the JSON API.
- **Testing:** manual verification against `requirements/` first; automated tests deferred until after that. Details: `implementation.md`, `testing.md`.
