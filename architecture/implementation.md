# Implementation stack

Technology choices for building Present. Infrastructure decisions (Firestore, reachability, certificates, identity) are in the other architecture files.

## Client

- **UI:** single-page application (SPA)
- **Framework:** SolidJS
- **Data and sign-in:** Firebase web SDK (`firebase/auth`, `firebase/firestore`). Multi-document changes (tag create/rename with the name index, record save with its version check) run in Firestore transactions.
- The Firebase web config is not in the repository; the app fetches it from Firebase Hosting at `/__/firebase/init.json`.

## Server side

There is no server process and no Cloud Function: those need the paid Blaze plan. The only server-side logic is `firestore.rules`, which Google evaluates on every read and write.

## Shape

```
SolidJS SPA --HTTPS--> Firebase Hosting (static files + config)
     |
     +--Google sign-in--> Firebase Authentication
     |
     +--ID token--> Firestore --> security rules (owner, 1 hour, limits, versions)
```

## Local work

The Firebase Local Emulator Suite runs Hosting, Authentication and Firestore together. On `localhost` the app connects to the emulators automatically.

## Deploy

Manual only, from the operator's PC: `scripts/deploy.sh` (after `firebase login`) builds the web app and deploys Hosting and the Firestore rules and indexes. There is no CI deploy; pushing to GitHub deploys nothing.

## Testing (this phase)

Automated tests are **not written yet**. The operator verifies behaviour manually against `requirements/` first. When manual testing is complete, automated checks will follow the contract in `testing.md`.
