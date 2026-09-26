# Present

A personal log of what is happening in the present moment. Over time the logs are meant to be analysed; pattern views are not part of this first slice.

This repository is the product, its documentation, and a runnable first implementation.

## Who it is for

One person. The app is used from a web browser on the home PC and on a personal phone. The server runs at home. At the office it is reached only from that personal phone on personal mobile data — never from office internet, never from office devices — and without buying a domain. The browser talks to the server over HTTPS only (see `architecture/transport.md`).

## What this first slice does

After unlock, write what is happening (optional), attach at least one tag, and save. Browse, filter, edit, and hide past records. Manage tags.

## Documentation

| Place | What belongs there |
| --- | --- |
| `requirements/` | Observable behaviour only. No technology. One file per module. Each `##` heading is one Given–When–Then and maps to one test. Tests bind to the **heading title**, not to source internals. |
| `architecture/` | How the system is shaped: parts, access, storage, reachability, implementation stack. Technical, not source code. |

These two trees are the source of truth. Interview notes are not kept in the repository.

Requirement modules: `login`, `note-present`, `tag-management`, `navigation`, `history`.

Requirements are written in English. What the user types in the app may be any Unicode text.

## Out of this first slice

Pattern and analytics screens, export, accounts and email, sharing logs, reminders.

## Running locally

Requirements: Go 1.22+, Node.js, PostgreSQL.

```bash
# database (example)
sudo -u postgres createuser present --password
sudo -u postgres createdb present -O present

cd web && npm ci && npm run build
cd .. && ./scripts/make-ca.py && ./scripts/issue-cert.py   # once, plus after the IP changes
./scripts/run.sh
```

The server is HTTPS only and listens on `:8443` by default (`PRESENT_ADDR`
overrides it). It refuses to start without a certificate and key; the boot
script prints the URLs the certificate is valid for.

Dev unlock key defaults to `present-demo` (`PRESENT_STATIC_KEY` overrides it).

## HTTPS certificates

The browser reaches the server by IP over HTTPS, with a certificate from a
private CA (`architecture/transport.md`). Two scripts do that; details in
`scripts/pki/README.md`.

```bash
./scripts/make-ca.py --ask-passphrase   # once; then trust pki/ca.crt.pem on every client
./scripts/issue-cert.py                # covers this host's DHCP address; re-run when it changes
```

The certificate covers the LAN address only. On Fedora Workstation the
default firewall zone already allows inbound TCP above 1024, so reaching the
server from another device on the home network needs no further setup.

Optional public tunnel for phone testing:

```bash
./scripts/run-tunnel.sh
```

## Remote

Private GitHub repository: https://github.com/krp12345/Present
