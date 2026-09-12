# System overview

Present is a single web application served from a process that runs on the home machine. The same UI is used in a browser on the home PC and on the personal phone. Office networks and office devices are not used.

There is no user account table and no username. Identity is a configured static key. After that key is accepted, the server issues a temporary key. Further requests must carry a valid temporary key. Original intent: the key is sent in a request header; the server accepts or rejects before doing any other work.

```
Browser (home PC or personal phone)
    -> HTTPS only
    -> header with static key (unlock only)
    -> header with temporary key (after unlock)
Home server
    -> persistent store (choice open)
```

HTTP is not served. Certificate source is still open (see `transport.md`).

Modules the UI exposes after unlock: log the moment (default), history, tag management. Navigation between them is a shell (side menu). Pattern analysis is not a module yet.

## Parts

- **Unlock:** compare submitted static key to the configured secret; count failures; issue temporary keys; enforce lockout.
- **Session:** temporary key, one hour lifetime, independent per device so PC and phone may be open together.
- **Records:** present-moment notes with optional description, one or more tags, a time that is now or in the past.
- **Tags:** stable internal id, visible name, soft-delete flag.
- **History:** list, filter, edit, soft-delete records; refuse stale saves using a version on each record.

## What is still open

- Which persistent store to use.
- How the home process is reached from the personal phone on personal mobile data without a paid domain (tunnel, VPN, or similar). The need is decided; the mechanism is not.
- Where the HTTPS certificate comes from. HTTPS itself is decided (`transport.md`).
