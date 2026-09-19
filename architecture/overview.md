# System overview

Present is a single web application served from a process that runs on the home machine. The same UI is used in a browser on the home PC and on the personal phone. Office networks and office devices are not used.

There is no user account table and no username. Identity is a configured static key. After that key is accepted, the server issues a temporary key. Further requests must carry a valid temporary key. Original intent: the key is sent in a request header; the server accepts or rejects before doing any other work.

```
Browser (home PC or personal phone)
    -> HTTPS only (private CA)
    -> header with static key (unlock only)
    -> header with temporary key (after unlock)
Home server
    -> PostgreSQL
    -> static key from OS secret store
```

HTTP is not served. Certificates come from a private CA (see `transport.md`).

Modules the UI exposes after unlock: log the moment (default), history, tag management. Navigation between them is a shell (side menu). Pattern analysis is not a module yet.

## Parts

- **Unlock:** compare submitted static key to the configured secret; count failures; issue temporary keys; enforce lockout.
- **Session:** temporary key, one hour lifetime, independent per device so PC and phone may be open together.
- **Records:** present-moment notes with optional description, one or more tags, a time that is now or in the past.
- **Tags:** stable internal id, visible name, soft-delete flag.
- **History:** list, filter, edit, soft-delete records; refuse stale saves using a version on each record.

## Decided infrastructure

- **Persistent store:** PostgreSQL on the home machine.
- **Remote reachability:** direct access by IP address — LAN IP at home, public IP from the personal phone on personal mobile data. No VPN or tunnel. A paid domain is not used. The operator keeps the current public IP reachable (for example a command someone at home runs and shares, or a private note on the phone). Details: `reachability.md`.
- **HTTPS certificates:** private CA operated by the operator; root cert installed on the home PC and personal phone. Details: `transport.md`.
- **Static key storage:** OS secret store on the home machine (for example Linux keyring or macOS Keychain). Must not be committed to the repository. Details: `data.md`.

## Implementation stack

- **Server:** Go, `net/http`, `pgx` with hand-written SQL.
- **Client:** SolidJS SPA talking to a Go JSON API.
- **Testing:** manual verification against `requirements/` first; automated tests deferred until after that. Details: `implementation.md`, `testing.md`.
