# System overview

Present is a single web application hosted on **Firebase**, entirely on the free Spark plan. The same UI is used in a browser on the home PC and on the personal phone, at home or away.

There is no server code of our own. The browser signs in with **Google** through Firebase Authentication and reads and writes **Firestore** directly. Firestore **security rules**, evaluated by Google on every request, are the server-side gate: only the registered owner gets in, only for one hour after sign-in, and only with data that respects the limits.

```
Browser (home PC or personal phone)
    -> HTTPS only (Firebase Hosting, Google-managed certificate)
    -> Sign in with Google (Firebase Authentication)
    -> Firestore, with the user's ID token on every request
Firestore security rules
    -> owner only (owners/{uid} registered by hand in the console)
    -> one hour since sign-in
    -> data limits and optimistic-locking checks
```

Modules the UI exposes after sign-in: log the moment (default), history, tag management. Navigation between them is a shell (side menu). Pattern analysis is not a module yet.

## Parts

- **Sign-in:** Google account via Firebase Authentication; only the account listed in `owners` is let in. Details: `authentication.md`.
- **Session:** one hour from sign-in, independent per device so PC and phone may be open together.
- **Records:** present-moment notes with optional description, one or more tags, a time that is now or in the past.
- **Tags:** stable internal id, visible name, soft-delete flag.
- **History:** list, filter, edit, soft-delete records; refuse stale saves using a version on each record.

## Decided infrastructure

- **Hosting:** Firebase Hosting serves the built SPA and the Firebase web config (`/__/firebase/init.json`).
- **Identity:** Firebase Authentication, Google provider.
- **Persistent store:** Cloud Firestore, location `asia-south1` (Mumbai). Details: `data.md`.
- **Reachability:** the project's Firebase Hosting domain (`<project-id>.web.app`), from anywhere. Details: `reachability.md`.
- **HTTPS certificates:** managed by Firebase Hosting. Details: `transport.md`.
- **Deploy:** manual only, from the operator's own PC with the Firebase CLI (`scripts/deploy.sh`) after `firebase login`. Nothing in GitHub deploys; there is no CI credential.
- **Cost:** no billing account, no card. Free quotas only; over quota, requests are refused rather than charged.

## Implementation stack

- **Client:** SolidJS SPA with the Firebase web SDK (Auth, Firestore).
- **Server-side logic:** Firestore security rules (`firestore.rules`).
- **Testing:** manual verification against `requirements/` first; automated tests deferred until after that. Details: `implementation.md`, `testing.md`.
