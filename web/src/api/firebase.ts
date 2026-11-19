// Firebase setup and sign-in.
//
// The web config is not kept in the repository: Firebase Hosting serves it at
// /__/firebase/init.json for whichever project the app is deployed to. Run
// locally (localhost), the app talks to the Firebase emulators instead.

import { FirebaseApp, initializeApp } from "firebase/app";
import {
  Auth,
  GoogleAuthProvider,
  User,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from "firebase/auth";
import { Firestore, connectFirestoreEmulator, doc, getDoc, getFirestore } from "firebase/firestore";

// One hour from sign-in, as for the temporary key (architecture/authentication.md).
// firestore.rules enforces the same limit on the server side.
export const SESSION_MS = 60 * 60 * 1000;

type Services = { app: FirebaseApp; auth: Auth; db: Firestore };
let services: Promise<Services> | undefined;

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

async function init(): Promise<Services> {
  const res = await fetch("/__/firebase/init.json");
  if (!res.ok) throw new Error("Firebase configuration is not available");
  const app = initializeApp(await res.json());
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (isLocal) {
    connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, location.hostname, 8080);
  }
  return { app, auth, db };
}

export function firebase(): Promise<Services> {
  return (services ??= init());
}

export async function db(): Promise<Firestore> {
  return (await firebase()).db;
}

export type AuthState =
  | { kind: "signedOut" }
  | { kind: "notAllowed"; uid: string; email: string | null }
  | { kind: "signedIn"; expiresAt: number };

async function sessionExpiry(user: User): Promise<number> {
  const token = await user.getIdTokenResult();
  return new Date(token.authTime).getTime() + SESSION_MS;
}

// Calls back with the current sign-in state whenever it changes. Only the
// account registered under owners/{uid} in Firestore is let in.
export async function watchAuth(callback: (state: AuthState) => void): Promise<() => void> {
  const { auth, db } = await firebase();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback({ kind: "signedOut" });
    try {
      const expiresAt = await sessionExpiry(user);
      if (Date.now() >= expiresAt) {
        await fbSignOut(auth);
        return;
      }
      const owner = await getDoc(doc(db, "owners", user.uid));
      if (!owner.exists()) return callback({ kind: "notAllowed", uid: user.uid, email: user.email });
      callback({ kind: "signedIn", expiresAt });
    } catch {
      callback({ kind: "notAllowed", uid: user.uid, email: user.email });
    }
  });
}

export async function signIn(): Promise<void> {
  const { auth } = await firebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    // Some phone browsers block popups; fall back to a full-page redirect.
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") return;
    throw err;
  }
}

export async function signOut(): Promise<void> {
  const { auth } = await firebase();
  await fbSignOut(auth);
}

// True once the current sign-in is older than the session limit.
export async function sessionExpired(): Promise<boolean> {
  const { auth } = await firebase();
  const user = auth.currentUser;
  if (!user) return true;
  return Date.now() >= (await sessionExpiry(user));
}
