# Testing contract

`requirements/` is the behaviour contract. `architecture/` is the technical shape without source code. Requirement text is English; what the user types in the app may be any Unicode.

Automated checks should follow `requirements/`, not the internals of a given implementation.

- One module folder has one `requirements.md`.
- Each `##` heading in that file is one test (one Given–When–Then).
- The hook is the **heading title** under `requirements/<module>/requirements.md`, not a numeric id and not a function or route name in source.
- Tests assert what a person can observe: screens, messages, presence or absence of records and tags, remaining tries, being locked out, discarded unsaved work.
- Tests must not require a particular database engine, framework, or header name. Those belong in architecture and may change.
- Header names, status codes, and storage details may appear in implementation tests later if needed; they are not the requirements suite.
