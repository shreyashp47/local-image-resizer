# Local Image Resizer

[![CI](https://github.com/shreyashp47/local-image-resizer/actions/workflows/ci.yml/badge.svg)](https://github.com/shreyashp47/local-image-resizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Live:** https://local-image-resizer.vercel.app/

Offline, privacy-first image resizer for app icons and social media images.

**Your image never leaves your browser.** All processing happens locally via the
Canvas API — there is no upload step anywhere in the code. You can verify this
yourself: open DevTools → Network tab while using the tool and you will see zero
network requests carrying your image data.

## Features

- Resize and crop images to exact dimensions
- Fit modes: cover / contain / stretch, with aspect-ratio lock
- Export to JPEG, WebP, or PNG with quality control
- Batch processing with ZIP download
- Fully offline-capable (PWA)

## Development

```bash
npm install
npm run dev        # dev server
npm run lint       # ESLint
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

Requires Node 20+.

## Privacy guarantee

- No uploads — files are read via `FileReader` / `createObjectURL` only
- No analytics that transmit image data
- No external CDNs for libraries — everything is bundled and self-hosted

## Deployment

Hosted on Vercel (production on `main`, preview deploys per PR).

### Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New… → Project** → Import this repo.
3. Framework: Vite (auto-detected). Settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy. Production builds deploy on `main`; every PR gets a preview URL.

The `public/_headers` file adds CSP/security headers, and `public/_redirects`
maps unknown routes to the custom 404 page.

## Architecture

```
src/
├── main.ts          entry point
├── app.ts           app shell, state, dropzone, mode switch
├── settings.ts      settings panel (presets, modes, aspect lock, dims)
├── render.ts        debounced worker-backed output rendering + download
├── compare.ts       before/after compare slider
├── batch.ts         multi-image queue + ZIP export
├── presets.ts       preset table
├── workers/
│   └── imageWorker.ts   decode + process off the main thread
��── lib/
    ├── processImage.ts  multi-step downscale, crop/fit/stretch, export
    ├── geometry.ts      pure crop/fit math
    ├── decode.ts        EXIF-aware decoding, friendly errors
    ├── workerClient.ts  worker wrapper with main-thread fallback
    ├── settings.ts      localStorage persistence
    ├── dom.ts           DOM helpers
    └── types.ts         shared types
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
