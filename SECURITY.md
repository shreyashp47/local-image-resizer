# Security Policy

Local Image Resizer is a fully client-side static site. There is no backend,
no database, and no secrets stored in this repository.

## Reporting a vulnerability

Please open a private advisory:

https://github.com/shreyashp47/local-image-resizer/security/advisories/new

Or report via the issue tracker: https://github.com/shreyashp47/local-image-resizer/issues

## What we take seriously

- Any XSS or content-injection vector (e.g. via filenames, EXIF metadata, or
  drag-and-drop content).
- Any way an image's pixel data could be transmitted without user action.
- Supply-chain issues in dependencies (checked via `npm audit` in CI).
