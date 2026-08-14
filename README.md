# Local Image Resizer

Offline, privacy-first image resizer for app icons and social media images.

**Your image never leaves your browser.** All processing happens locally via the
Canvas API — there is no upload step anywhere in the code. You can verify this
yourself: open DevTools → Network tab while using the tool and you will see zero
network requests carrying your image data.

## Features

- Resize and crop images to exact dimensions
- Presets for app icons (App Store, Google Play) and social media (Instagram, YouTube, HD, 4K)
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

Hosted on Cloudflare Pages (production on `main`, preview deploys per PR).
See [ROADMAP.md](../ROADMAP.md) for the full plan.
