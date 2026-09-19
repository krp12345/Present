# Implementation stack

Technology choices for building Present. Infrastructure decisions (PostgreSQL, reachability, certificates, secret storage) are in the other architecture files.

## Server

- **Language:** Go
- **HTTP:** standard library (`net/http`) — routing and handlers wired without a third-party web framework
- **Database access:** `pgx` with hand-written SQL

The home process serves a JSON API over HTTPS. It also serves the built SPA static assets.

## Client

- **UI:** single-page application (SPA)
- **Framework:** SolidJS
- The browser talks to the Go API over HTTPS on the same origin (or via a dev proxy during local work).

## Shape

```
SolidJS SPA  --HTTPS/JSON-->  Go (net/http)  --pgx-->  PostgreSQL
                                    |
                            OS secret store (static key)
                            Private CA TLS
```

## Testing (this phase)

Automated tests are **not written yet**. The operator verifies behaviour manually against `requirements/` first. When manual testing is complete, automated checks will follow the contract in `testing.md`.
