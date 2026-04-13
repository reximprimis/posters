# Application Versioning

Current application version: `1.0`.

## Version naming rule

- Use semantic increment in the UI and docs: `1.0`, `1.1`, `1.2`, ...
- For each next release, increase the minor number by `+0.1`.
- Example progression: `1.0` -> `1.1` -> `1.2` -> `1.3`.

## Update checklist for next version

- Update version label in `public/index.html` (`appVersionPill`).
- Update this file (`docs/VERSIONING.md`) with the new current version.
- Add a short entry in commit message describing what changed in that version.
