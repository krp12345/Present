// Entry point: one HTTPS function, `api`, which Firebase Hosting reaches
// through the rewrite of /api/** in firebase.json. Same origin as the app.

import { defineInt, defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { handle } from "./api.js";

// Keep in step with the "region" of the /api/** rewrite in firebase.json.
setGlobalOptions({ region: "us-central1", maxInstances: 2 });

// The unlock key lives in Cloud Secret Manager, never in the repository.
// Set it with: firebase functions:secrets:set PRESENT_STATIC_KEY
const staticKey = defineSecret("PRESENT_STATIC_KEY");

// Temporary key lifetime. One hour by design (architecture/authentication.md).
const sessionTtlSeconds = defineInt("PRESENT_SESSION_TTL_SECONDS", { default: 3600 });

export const api = onRequest({ secrets: [staticKey], invoker: "public" }, (req, res) =>
  handle(req, res, {
    staticKey: () => staticKey.value(),
    sessionTtlSeconds: () => sessionTtlSeconds.value(),
  }),
);
