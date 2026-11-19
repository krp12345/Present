# Present

A personal log of what is happening in the present moment. Over time the logs are meant to be analysed; pattern views are not part of this first slice.

This repository is the product, its documentation, and a runnable first implementation.

## Who it is for

One person. The app is used from a web browser on the home PC and on a personal phone, at home or away. It is hosted on Firebase and reached over HTTPS at the project's Firebase Hosting address (see `architecture/reachability.md`).

## What this first slice does

After unlock, write what is happening (optional), attach at least one tag, and save. Browse, filter, edit, and hide past records. Manage tags.

## Documentation

| Place | What belongs there |
| --- | --- |
| `requirements/` | Observable behaviour only. No technology. One file per module. Each `##` heading is one Given–When–Then and maps to one test. Tests bind to the **heading title**, not to source internals. |
| `architecture/` | How the system is shaped: parts, access, storage, reachability, implementation stack. Technical, not source code. |

These two trees are the source of truth. Interview notes are not kept in the repository.

Requirement modules: `login`, `note-present`, `tag-management`, `navigation`, `history`.

Requirements are written in English. What the user types in the app may be any Unicode text.

## Out of this first slice

Pattern and analytics screens, export, accounts and email, sharing logs, reminders.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | SolidJS single-page app, served by **Firebase Hosting** |
| `functions/` | The JSON API (`/api/*`) as one **Cloud Function for Firebase** (TypeScript) |
| `firestore.rules`, `firestore.indexes.json` | **Firestore** security rules (deny all client access) and indexes |
| `firebase.json`, `.firebaserc` | Firebase project wiring: Hosting rewrites `/api/**` to the function |
| `scripts/deploy.sh` | One-command build and deploy |

## Running locally

Requirements: Node.js 22, Java 11+ (for the Firestore emulator).

```bash
npm run setup                                              # install all dependencies
echo 'PRESENT_STATIC_KEY=present-demo' > functions/.secret.local   # local unlock key (git-ignored)
npm run emulators                                          # builds, then runs Hosting + Functions + Firestore
```

Open http://127.0.0.1:5000 and unlock with `present-demo`. The emulator UI at
http://127.0.0.1:4000 shows the Firestore data. Emulator data is kept in
`.emulator-data/` between runs.

For hot reload of the web app, keep the emulators running and in another
terminal run `npm run dev:web` (http://localhost:5173, proxies `/api` to the
emulators). After changing `functions/src`, run `npm --prefix functions run build`
(or `build:watch`); the emulator reloads the function.

Starter tags (optional):

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-present npm --prefix functions run seed
```

## Deploying to Firebase

### One-time setup

1. Create a project at https://console.firebase.google.com (or use an existing one).
2. Upgrade it to the **Blaze** (pay-as-you-go) plan. Cloud Functions and
   Secret Manager need it. A single-person app like this normally stays
   inside the free quotas; setting a budget alert in Google Cloud Billing is
   a good idea.
3. In the console, create a **Firestore** database (Native mode). Pick a
   location close to you; it cannot be changed later.
4. Put the project id in `.firebaserc` (replace `your-firebase-project-id`).
5. Log in and install:
   ```bash
   npm run setup
   npx firebase login
   ```
6. Set the unlock key (stored in Cloud Secret Manager, never in the repository):
   ```bash
   npx firebase functions:secrets:set PRESENT_STATIC_KEY
   ```

### Every deploy

```bash
./scripts/deploy.sh
```

This deploys Firestore rules and indexes, the `api` function, and the built
web app. The app is then live at `https://<project-id>.web.app` (and
`https://<project-id>.firebaseapp.com`). The first deploy can take a few
minutes while Google enables the APIs and builds the indexes.

Optional starter tags in production (uses your Google login):

```bash
gcloud auth application-default login
GCLOUD_PROJECT=<project-id> npm --prefix functions run seed
```

### Operating it

- **Change the unlock key:** run `firebase functions:secrets:set PRESENT_STATIC_KEY` again, then `./scripts/deploy.sh` (the function picks up the new version on deploy).
- **Clear a lockout:** in the Firebase console → Firestore → `lockouts`, find the document whose `identity` field matches and set `blocked` to `false` and `failures` to `0` (or delete it).
- **Region:** the function runs in `us-central1`. To move it, change `region` in both `functions/src/index.ts` and the `/api/**` rewrite in `firebase.json`.
- **Expired sessions** are removed by Firestore's TTL policy on `sessions.expiresAt` (deployed from `firestore.indexes.json`); deletion can lag up to a day, but expired keys are refused immediately regardless.

## Remote

Private GitHub repository: https://github.com/krp12345/Present
