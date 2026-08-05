# ShipCommand Repository Knowledge Base

The `knowledge/` folder is a Git-tracked engineering notebook for useful, non-sensitive project knowledge that should be available on every computer where this repository is used.

## Knowledge vs. documentation

- `docs/` contains documentation about ShipCommand itself: its architecture, behavior, domain model, development, and operation.
- `knowledge/` contains notes about external systems, release processes, candidate endpoints, useful links, and ongoing investigations.

Material in `knowledge/` may be incomplete or exploratory. Promote stable conclusions about ShipCommand into `docs/` when they become part of the product's design or operating model.

## What belongs here

- Stable links to VersionOne, ServiceNow, ALM, SharePoint, reports, and process references
- Screen types, navigation paths, and non-sensitive identifiers
- Candidate API endpoint paths and questions to validate
- Investigation hypotheses, observations, outcomes, and next steps
- Release, RAID, request, and delivery process notes
- Public or internally shareable reference material relevant to the project

Safe examples:

- `https://versionone.example/Request.mvc/Summary?oid=Request:1234` after confirming it contains no secret or temporary authentication value
- `GET /rest-1.v1/Data/Epic` as an unverified endpoint candidate
- "Child Epics appear under the Relationships panel; verify required permissions."
- A link to a saved report that contains no embedded credentials or sensitive filters

## What must never be stored here

This repository is for non-sensitive knowledge only. Never store:

- Passwords, access tokens, API keys, cookies, authorization headers, or session identifiers
- Private keys or any other credentials
- Confidential record exports, production data, or personally identifiable information (PII)
- Screenshots containing sensitive data
- URLs containing temporary tokens, authentication codes, secrets, or credentials in query strings

Unsafe examples:

- `Authorization: Bearer ...`
- A browser URL containing `access_token=`, `code=`, `session=`, or a signed temporary download parameter
- A copied production incident record containing customer or employee data
- A screenshot showing names, email addresses, account details, or authentication information

When unsure, do not add the material. Record a sanitized description or a navigation path instead. Keep secrets in an approved secrets manager and sensitive records in their authorized source system.

## Add a link or note

1. Put frequently used links in [QUICK_LINKS.md](QUICK_LINKS.md), rough captures in [INBOX.md](INBOX.md), and durable notes in the appropriate integration, investigation, or process file.
2. Use a descriptive label rather than a bare URL.
3. Add enough context to explain the purpose, owner/source, and last verification date.
4. Mark assumptions and endpoint candidates as unverified until tested.
5. Inspect URLs and pasted text for credentials, temporary authentication values, production data, and PII before saving.

Example:

```markdown
- [VersionOne request search](https://versionone.example/Request.mvc/Search)
  - Purpose: Find requests by number or title.
  - Verified: YYYY-MM-DD
  - Notes: Requires normal VersionOne access; URL contains no temporary token.
```

## Synchronize across computers

Start from a clean working tree, pull before editing, review the diff for sensitive material, and resolve any merge conflicts before pushing.

```powershell
git pull
# edit knowledge files
git add knowledge
git commit -m "Update project reference notes"
git push origin main
```

Before committing, run `git diff --staged -- knowledge` and confirm every line is safe for everyone who can access the repository. Follow the repository's branch and review policy if direct updates to `main` are not allowed.
