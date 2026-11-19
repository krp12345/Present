# Transport

All client–server communication is **HTTPS**: pages from Firebase Hosting, sign-in with Google, and every Firestore read and write. There is no HTTP UI or API.

Firebase Hosting serves only HTTPS to clients: a plain HTTP request is redirected to HTTPS, and every response carries `Strict-Transport-Security`, so a browser that has visited once will not use HTTP again.

## Certificates

Firebase Hosting provisions and renews the certificate for the project's `web.app` and `firebaseapp.com` domains (and for any custom domain added later). No private CA and no certificate installation on client devices is needed.

## Credentials on the wire

The Firebase ID token travels only in HTTPS requests to Google, sent by the Firebase SDK. It is never put in a URL.

## Caching

Built assets under `/assets/` have content-hashed names and are cached long-term; `index.html` is revalidated on each load so a deploy takes effect immediately. Personal data never passes through Hosting: it goes between the browser and Firestore only.
