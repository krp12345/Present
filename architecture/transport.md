# Transport

All client–server communication is **HTTPS**. The key in the header, the temporary key, pages, and data all travel on HTTPS. There is no parallel HTTP API or HTTP UI.

HTTP is not served. A client that speaks HTTP does not get a redirect and does not get the app.

This applies on the home network and when the personal phone is away from home on personal mobile data. Reachability is by IP address (LAN or public); HTTPS is still required. Details: `reachability.md`.

Office Wi‑Fi and office devices are not clients.

## Certificates

HTTPS uses a certificate issued by a **private CA** operated by the operator. A paid public domain is out of scope, so a public web CA is not used.

The operator runs the CA and issues a server certificate for the home machine. The CA root certificate is installed and trusted on the home PC and on the personal phone. Because access is by IP address rather than a domain name, the server certificate must be valid for the addresses in use (LAN IP, public IP, or both, depending on how the operator configures it).

## Secrets on the wire

The static key and the temporary key are only sent as HTTPS headers. They must not be placed on a query string or in an HTTP (clear-text) request.
