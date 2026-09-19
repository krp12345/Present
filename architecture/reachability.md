# Reachability

The server process runs on the home machine.

## Home

The home PC and the personal phone on home Wi‑Fi reach the app via the machine’s **LAN IP address** and the port the server listens on, over HTTPS.

## Office

Away from home, the only client is the **personal phone**, on **personal mobile data**. Office Wi‑Fi, office LAN, and office-owned or office-managed devices are not used and are not a target.

That phone reaches the same home process over HTTPS using the home machine’s **public IP address** and the same port. A paid domain is not used. There is no VPN or tunnel in this slice.

The public IP may change. The operator is responsible for knowing the current address — for example by asking someone at home to run a command that prints the full URL and sharing it (such as via WhatsApp), or by noting the public IP in a private note on the phone when at home. Home router port forwarding (or equivalent) must expose the server port to the internet.

## Transport

The browser always uses HTTPS, on the LAN and from the office. HTTP is not served. Details: `transport.md`.

Direct IP access still uses HTTPS with a certificate from the operator’s private CA. A paid domain is not required.
