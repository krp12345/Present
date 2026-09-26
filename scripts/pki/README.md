# Private PKI

Two scripts, one package. They implement what `architecture/transport.md`
requires: HTTPS served with a certificate from a private CA, valid for the
IP addresses the phone and the home PC actually dial.

Needs Python 3.11+ and `cryptography` (`pip install cryptography`).

## Use

```bash
# once: create the authority (the root key is the crown jewel)
./scripts/make-ca.py --common-name "Present Home CA" --ask-passphrase

# install pki/ca.crt.pem as a trusted root on the home PC and on the phone

# then, and again whenever the DHCP lease changes:
./scripts/issue-cert.py
```

Written to `pki/` (override with `--dir` or `PRESENT_PKI_DIR`):

| File | What it is |
| --- | --- |
| `ca.key.pem` | Root private key. Mode 600. Never leaves this machine. |
| `ca.crt.pem` | Root certificate. Install this on every client. |
| `server.key.pem` | Server private key, unencrypted so the server can start unattended. |
| `server.crt.pem` | Server certificate for the discovered addresses. |
| `server.fullchain.pem` | Server certificate followed by the root. |

`--ask-passphrase` encrypts the CA key; `PRESENT_CA_PASSPHRASE` supplies the
same passphrase without a prompt, for unattended runs.

## Getting the root onto a phone

```bash
./scripts/share-ca.py     # prints a URL and a QR code; Ctrl-C when done
```

Serves `ca.crt.pem` alone over plain HTTP on the LAN, with the media type
iOS needs to offer a profile install. Plain HTTP because the phone cannot
validate HTTPS from this CA until it has this file; the printed SHA-256
fingerprint is what confirms nothing was swapped on the way. Do not reach
for `python3 -m http.server` in `pki/` instead: that publishes `ca.key.pem`
to the whole network.

On iOS the download is only half the job -- the root must then be switched
on under Settings -> General -> About -> Certificate Trust Settings.

## The DHCP part

The lease is not guessed. `ip -json addr` marks an address `dynamic` when it
came from DHCP rather than from static configuration, so
`DhcpLeaseAddressSource` reports exactly what the router handed out. If the
kernel shows no lease, `--discover auto` falls back to the source address of
the default route. Loopback is included unless `--no-loopback` is given, and
`--ip` adds anything discovery cannot see, such as the router's public IP.

The certificate is only valid while the lease holds. A DHCP reservation on
the router keeps the address stable; otherwise re-run `issue-cert.py` after a
change and restart the server.

Certificates last 397 days by default, because Apple clients reject server
certificates valid for more than 398.

## Shape

The two scripts are composition roots and nothing else: they parse flags,
choose implementations, and print. Each module below them has one job.

| Module | Job |
| --- | --- |
| `addresses` | Which IP addresses the certificate must cover |
| `commands` | Running `ip`, behind a protocol so tests need no network |
| `keys` | Creating a private key, one class per algorithm |
| `naming`, `subjects` | What name the certificate carries |
| `profiles` | Which extensions a root, or a TLS server certificate, gets |
| `validity`, `serials`, `clock` | When it is valid, and under which serial |
| `issuing` | Assembling and signing, given any issuer |
| `storage` | PEM on disk, atomic, with the right file modes |
| `authority` | Loading the CA that signs |
| `usecases` | The two operations, wired from abstractions only |

Why it is split this way:

- **Single responsibility** — a change to how an address is found touches
  `addresses` alone; a change to file layout touches `storage` alone.
- **Open/closed** — a new key algorithm, a new address source or a new
  certificate profile is a new class, not an edit to a working one.
- **Liskov** — `SelfIssuer` and `AuthorityIssuer` are interchangeable, so the
  root and the server certificate go through the same signing path.
- **Interface segregation** — the protocols are one or two methods each; a
  fake clock is a one-line class.
- **Dependency inversion** — `usecases` names only protocols. The scripts
  decide what those are; the tests decide differently.

## Tests

```bash
python3 -m unittest discover -s scripts/pki -t scripts
```

No network, no real clock, no random serials.
