# Reachability

The server process runs on the home machine.

## Home

The home PC and the personal phone on home Wi‑Fi reach the app via the machine’s address on the local network (host IP and the port the server listens on).

## Office

Away from home, the only client is the **personal phone**, on **personal mobile data**. Office Wi‑Fi, office LAN, and office-owned or office-managed devices are not used and are not a target.

That phone must reach the same home process over HTTPS. A new paid domain is out of scope. The mechanism (VPN into home, a tunnel, or similar) is not chosen yet. Whatever is chosen must not require buying a domain.


## Transport

The browser always uses HTTPS, on the LAN and from the office. HTTP is not served. Details: `transport.md`.

Office reachability (tunnel, VPN, or similar) must still expose this HTTPS endpoint to the personal phone on personal mobile data. The certificate source is open; a paid domain is not required.
