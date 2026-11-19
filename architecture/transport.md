# Transport

All client–server communication is **HTTPS**. The key in the header, the temporary key, pages, and data all travel on HTTPS. There is no parallel HTTP API or HTTP UI.

Firebase Hosting serves only HTTPS to clients: a plain HTTP request is redirected to HTTPS, and every response carries `Strict-Transport-Security`, so a browser that has visited once will not use HTTP again. The hop from Hosting to the Cloud Function stays inside Google's network over HTTPS.

## Certificates

Firebase Hosting provisions and renews the certificate for the project's `web.app` and `firebaseapp.com` domains (and for any custom domain added later). No private CA and no certificate installation on client devices is needed.

## Secrets on the wire

The static key and the temporary key are only sent as HTTPS headers. They must not be placed on a query string.

## Caching

API responses are sent with `Cache-Control: no-store`, so neither the Hosting CDN nor the browser keeps personal data or keys. Built assets under `/assets/` have content-hashed names and are cached long-term; `index.html` is revalidated on each load so a deploy takes effect immediately.
