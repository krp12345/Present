# Implementation stack

Technology choices for building Present. Infrastructure decisions (Firestore, reachability, certificates, secret storage) are in the other architecture files.

## Server

- **Runtime:** Cloud Functions for Firebase (2nd gen), Node.js 22, TypeScript
- **HTTP:** one `onRequest` function, `api`, with a small hand-written router — no web framework
- **Database access:** Firebase Admin SDK for Firestore; multi-document changes run in Firestore transactions

The function serves the JSON API under `/api/`. Firebase Hosting serves the built SPA static assets and rewrites `/api/**` to the function, so both share one origin.

## Client

- **UI:** single-page application (SPA)
- **Framework:** SolidJS
- The browser talks to the API over HTTPS on the same origin (or via the Vite dev proxy to the Firebase emulators during local work).

## Shape

```
SolidJS SPA --HTTPS/JSON--> Firebase Hosting --rewrite /api/**--> Cloud Function `api` --Admin SDK--> Firestore
                                                                        |
                                                          Secret Manager (static key)
```

## Local work

The Firebase Local Emulator Suite runs Hosting, Functions and Firestore together, with the same rewrites as production. The local static key comes from `functions/.secret.local` (git-ignored).

## Testing (this phase)

Automated tests are **not written yet**. The operator verifies behaviour manually against `requirements/` first. When manual testing is complete, automated checks will follow the contract in `testing.md`.
