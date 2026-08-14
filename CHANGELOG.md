# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-14
### Added
- Interactive crop viewport with pan/zoom, aspect-ratio lock, and handle resize
- Presets for App Store, Google Play, Instagram, YouTube, HD, 4K
- Fit modes: cover / contain / stretch with live preview
- Export to JPEG, WebP, PNG with quality slider
- Batch processing with ZIP download (fflate)
- Before/after compare slider
- Offline-first PWA with Workbox (service worker, installable)
- Zero external runtime dependencies; all processing client-side via Canvas API + Web Worker

### Changed
- Refactored to decoupled modules: state, crop, render, settings, batch
- UI restyled with Cockroach Janta Party paper/ink/gold theme
- Left-aligned masthead header with seal emblem
- Settings moved to right sidebar; action bar at bottom (Download, Compare, Choose another)

### Fixed
- Production CSS bug: stylesheet now loads in production build
- Original preview image stretching (specificity fix)
- Crop viewport overflow at zoom
- Layout overlap at medium widths (max-width 1280px, shrink rules)

## [Unreleased]
### Added
- Professional repo files: CHANGELOG, ROADMAP, issue templates, PR template, Dependabot, CODEOWNERS