# Present

A personal log of what is happening in the present moment. Over time the logs are meant to be analysed; pattern views are not part of this first slice.

This repository is the product, its documentation, and a runnable first implementation.

## Who it is for

One person. The app is used from a web browser on the home PC and on a personal phone, at home or away. It is hosted on Firebase's free plan and reached over HTTPS at the project's Firebase Hosting address (see `architecture/reachability.md`).

## What this first slice does

After signing in with Google, write what is happening (optional), attach at least one tag, and save. Browse, filter, edit, and hide past records. Manage tags.

## Documentation

| Place | What belongs there |
| --- | --- |
| `requirements/` | Observable behaviour only. No technology. One file per module. Each `##` heading is one Given–When–Then and maps to one test. Tests bind to the **heading title**, not to source internals. |
| `architecture/` | How the system is shaped: parts, access, storage, reachability, implementation stack. Technical, not source code. |

These two trees are the source of truth. Interview notes are not kept in the repository.

Requirement modules: `login`, `note-present`, `tag-management`, `navigation`, `history`.

Requirements are written in English. What the user types in the app may be any Unicode text.

## Out of this first slice

Pattern and analytics screens, export, sharing logs, reminders.

## Cost

Everything runs on free tiers and **no card is needed anywhere**:

- **Firebase Spark (free) plan:** Hosting, Authentication and Firestore. A Spark project has no billing account, so it cannot be charged; past the daily free quota (for example 50,000 Firestore reads a day) requests are refused until the next day instead.
- **GitHub Actions:** free for this public repository.

Do not upgrade the Firebase project to Blaze; nothing here needs it.

## Layout

| Path | What it is |
| --- | --- |
| `web/` | SolidJS single-page app. Talks to Firestore directly with the Firebase web SDK. |
| `firestore.rules` | The server-side gate: only the owner, only within an hour of sign-in, and data limits |
| `firestore.indexes.json` | Indexes for the history filters |
| `firebase.json`, `.firebaserc` | Firebase project wiring |
| `.github/workflows/deploy.yml` | Deploys on every push to `main` (or on demand) |
| `scripts/deploy.sh` | The same deploy from your own machine, if ever needed |

## Running locally

Requirements: Node.js 22, Java 11+ (for the Firestore emulator).

```bash
npm run setup       # install dependencies
npm run emulators   # builds, then runs Hosting + Authentication + Firestore locally
```

Open http://127.0.0.1:5000 and press **Sign in with Google**. The Auth
emulator shows a fake account picker: add any test account. The app then
shows "Access denied" with that account's ID. Open the emulator UI at
http://127.0.0.1:4000 → Firestore, create the collection `owners` with a
document whose ID is that value (no fields needed), and reload. Emulator data
is kept in `.emulator-data/` between runs.

For hot reload, keep the emulators running and in another terminal run
`npm run dev:web` (http://localhost:5173).

## Putting it on Firebase (one time, about 15 minutes, no card)

Nothing in these steps is ever typed into a chat or committed.

### 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Create a project**. Any name. Google Analytics is not needed. It is created on the free Spark plan.
2. **Build → Firestore Database → Create database** → *Standard edition*, location **asia-south1 (Mumbai)**, start in **production mode**. The location cannot be changed later.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable**, pick your support email, **Save**.
4. **Project settings (gear) → General → Your apps → Web (`</>`)**: register a web app (any nickname). Tick **Also set up Firebase Hosting**. Skip the SDK snippet; the app loads its config from Hosting by itself.
5. Note the **Project ID** shown in Project settings.

### 2. Give GitHub permission to deploy

1. Open https://console.cloud.google.com/iam-admin/serviceaccounts and pick the same project.
2. **Create service account**, name `github-deploy`. Grant it the roles **Firebase Admin** and **Service Usage Consumer**. Done.
3. Open the new account → **Keys → Add key → Create new key → JSON**. A file downloads.
4. In GitHub: **this repository → Settings → Secrets and variables → Actions**:
   - **Secrets → New repository secret**: name `FIREBASE_SERVICE_ACCOUNT`, value: the whole content of the downloaded JSON file. Then delete the file from your computer.
   - **Variables → New repository variable**: name `FIREBASE_PROJECT_ID`, value: your project ID.

### 3. Deploy

Push to `main`, or **Actions → Deploy to Firebase → Run workflow**. When it is green, the app is at `https://<project-id>.web.app`.

### 4. Make yourself the owner

1. Open the app and **Sign in with Google**. The first time it says *Access denied* and shows your account ID.
2. In the Firebase console → **Firestore Database → Start collection**: collection ID `owners`, document ID: that account ID, add any field (for example `note` = `me`), **Save**.
3. Reload the app. You are in.

Any other Google account that signs in only ever sees *Access denied*.

## Operating it

- **Revoke GitHub's deploy access:** delete the key (or the whole `github-deploy` service account) in Google Cloud, and the `FIREBASE_SERVICE_ACCOUNT` secret in GitHub.
- **Add or remove a device:** nothing to do; sign in with the same Google account anywhere. To stop someone, remove their document from `owners` (only yours should be there).
- **Moving the database region** is not possible; create a new project instead.

## Remote

GitHub repository (public): https://github.com/krp12345/Present
