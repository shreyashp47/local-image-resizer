# Roadmap

## v0.2 — Polish & Reliability
- [ ] Add keyboard shortcuts (arrow keys for nudge, space for pan, +/- zoom)
- [ ] Improve crop handle hit targets on touch
- [ ] Better error toasts with retry actions
- [ ] Export progress indicator for large batch jobs
- [ ] Accessibility audit (WCAG AA)
- [ ] Unit test coverage ≥ 90% for pure logic modules

## v0.3 — Feature Expansion
- [ ] Rotate/flip controls in crop viewport
- [ ] EXIF orientation auto-correct (optional toggle)
- [ ] Custom watermark overlay (text or image)
- [ ] Rename output files with preset name
- [ ] Shareable link with preset encoded (query params)

## v0.4 — Platform Polish
- [ ] Dark mode manual toggle + system preference sync
- [ ] iOS/Android PWA install prompts + splash screens
- [ ] Offline-first service worker strategy tuning
- [ ] Performance budget: < 100KB JS gzipped, < 2s LCP

## v1.0 — Stability Release
- [ ] Remove all experimental flags
- [ ] Full browser matrix in CI (Chromium, Firefox, WebKit)
- [ ] Signed releases + checksums
- [ ] Documentation site (Docusaurus or VitePress)

## Non-functional
- [ ] Zero external runtime dependencies (already true)
- [ ] No telemetry/analytics ever
- [ ] Supply-chain security: `npm audit` clean in CI, lockfile pinned