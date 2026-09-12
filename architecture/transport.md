# Transport

All client–server communication is **HTTPS**. The key in the header, the temporary key, pages, and data all travel on HTTPS. There is no parallel HTTP API or HTTP UI.

HTTP is not served. A client that speaks HTTP does not get a redirect and does not get the app.

This applies on the home network and when the personal phone is away from home on personal mobile data. Reachability (LAN IP, tunnel, VPN) must still present HTTPS to the browser.

Office Wi‑Fi and office devices are not clients.

## Certificates

A certificate is required for HTTPS. The source is not chosen yet (self-signed, private CA, or HTTPS terminated by a tunnel/VPN). A paid public domain is still out of scope, so a public web CA is not assumed.

Until that choice is made, architecture only requires: the browser talks HTTPS to Present; the operator will install or trust whatever certificate that choice needs on the home PC and the personal phone.

## Secrets on the wire

The static key and the temporary key are only sent as HTTPS headers. They must not be placed on a query string or in an HTTP (clear-text) request.
