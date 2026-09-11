# Present — requirement elicitation answers

Captured interactively. Not product requirements yet.

## Access and identity

1. Who is this app for, in this first slice?
   Answer: Only me (one person)

2. How many access keys should exist?
   Answer: One shared key for every device

3. After a correct key, how long should access last?
   Answer: Because I am the only user, keep the flow simple: the key never expires. If needed, server config will allow me to change that later.

4. If the key is wrong, what should you see?
   Answer: Allow 5 tries. After more than 5, block the IP (or another unique ID if needed). If the key is correct, give back a unique temporary key which expires in 1 hour.

5. If the key is missing (blank submit, bookmark, another app), how should that be treated versus a wrong key?
   Answer: Treat missing key the same as a wrong key (counts toward the 5 tries)

6. Can phone and PC be used at the same time?
   Answer: Phone and PC at the same time is allowed

7. Where should you be able to reach the app?
   Answer: Without buying a new domain, can I make sure I access the application from the office while the server is at home? Home has Wi‑Fi; at the office I will have mobile data.

7b. Is reaching the home server from the office (mobile data, no new paid domain) in this first slice?
   Answer: I want office to home connection for sure.

## Present-moment record

8. When can a record be about?
   Answer: By default present, but I can log the past as well.

9. Must every record have a description?
   Answer: Tag is mandatory. Description is optional.

10. How should mood be captured?
   Answer: Mood is abstract. Description and tag are enough (no separate mood field).

11. How many tags on one record?
   Answer: At least one for now. Not sure if I will need more than one per record later, so accommodate that for the future.

12. How do tags come into existence?
   Answer: Pick from a list, or create a new tag when needed

13. Can you save with no tag?
   Answer: No (inferred from Q9: tag is mandatory)

14. After a successful save, what should you see?
   Answer: Show the record I just saved and allow editing what I submitted. Also see all logs in a separate module, and allow editing description and tags of past records.

15. May you delete a record after it is saved?
   Answer: Edit and delete both allowed

16. Where can you add a new tag?
   Answer: Both: while logging, and a separate tag screen

17. Can you rename or remove a tag? If removed, what happens to old records?
   Answer: When a record has an obsolete tag, mark that tag with a message or styling so I can see it is obsolete. Do not edit old records retrospectively for now. A unique ID (not visible to me; backend) and the tag name should be separate, so the tag name is editable.

18. Any length or writing rules you care about as a user?
   Answer: Description max 1000 characters. One tag name max 200 characters. Any Unicode (not English-only). UI shows a validation error when the edit goes above the limit. Show current count vs total only when tag name exceeds 190 while typing, or description exceeds 900. Keep the UI simpler: do not always show limits; only after those thresholds. Validation still exists.

## Seeing patterns and history

19. For this first slice, besides capture, is a history/logs list in scope?
   Answer: History is a dedicated module, not available on the logging screen itself. After login the user is taken directly to the log-the-moment screen. A small button opens a left-side hidden menu listing other modules. History and tags management are listed there.

20. What about “patterns” in this first slice?
   Answer: Leave pattern/analytics undefined until I have logs

21. Should export of logs exist in this first slice?
   Answer: No export in this first slice

## Launch and navigation

22. What is on the first screen when the app launches?
   Answer: First screen is only key entry, nothing else

23. After unlock, what is the main screen?
   Answer: (from Q19) Directly the log-the-moment screen. Other modules (history, tags) via a small button that opens a left-side hidden menu.

## How requirements should be written

24. Confirm how requirements should be written.
   Answer: Yes — one Given–When–Then = one test; observable behaviour only; no API/database/header wording in requirements

25. Requirements folder split.
   Answer: login, note present, tag management, navigation

25b. Should history/logs have its own requirements folder?
   Answer: Yes — also a history/logs module folder (listed in the side menu)

26. Should each requirement have a stable ID?
   Answer: Titles only; tests match by folder/file name

27. Language of the requirement documents?
   Answer: English for requirements; the app itself is Unicode / any language

## Architecture folder

28. Keep all technical details only in architecture/?
   Answer: The architecture folder is for high-level system architecture and technical details, but not actual code.

29. For architecture: how should the key story be described (still no code)?
   Answer: The configured static key is for authentication, like a password. There is no username for now because no one else will use it — the key is username and password combined. Extra layer: a temporary key.

30. Database for now?
   Answer: Not sure yet

31. What shape of UI?
   Answer: One web app — browser on PC and phone

## Out of scope

32. Out of scope for this first slice?
   Answer: All of these are out: pattern/analytics screens, accounts/email/passwords, sharing logs, reminders / “log now” notifications

## Access follow-up

33. After 5 failed key tries, how long does the block last?
   Answer: Blocked until I restart the server or clear it myself

34. When the 1-hour temporary key expires, what should happen?
   Answer: Force out of the app. Leave everything unfinished as null and void.

## Note present follow-up

35. When logging the past, how do you set the time on the log-the-moment screen?
   Answer: On the log screen, time is “now” unless I set a past date/time

## History follow-up

36. In the history module for this first slice, what can you do?
   Answer: List all records, open one, edit description/tags, delete; also filter by tag and by time range.

## Wrap up

37. Stop here, or keep going on a topic?
   Answer: That’s enough for now


