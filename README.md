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

## Remote

Private GitHub repository: https://github.com/krp12345/Present
