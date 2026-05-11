# Marketing media — where to drop files

Everything in `public/` is served verbatim by Vite at the same path. Drop a file at `public/hero/home.jpg` → the app references it as `/hero/home.jpg`. No rebuild needed in dev (Vite serves it on next request); in production you redeploy.

## Conventions

| Folder | What goes there | Filename convention | Recommended dimensions |
|---|---|---|---|
| `brand/` | Logo, favicon, company stamp/seal, anything that's part of the visual identity | `logo.svg`, `logo-white.svg`, `favicon.svg`, `stamp.png` | SVG for logos; raster 256×256+ for favicon; transparent PNG 200×200 for stamp |
| `hero/` | Page-banner photos for the public site | `home.jpg`, `services.jpg`, `gallery.jpg`, `about.jpg` | 1920×1080+, optimized JPG, ≤ 400 KB ideally |
| `gallery/` | Photos used in galleries and inline page imagery | slug-based: `engine-rebuild.jpg`, `hull-restoration.jpg`, `about-workshop.jpg`, etc. | 1200×800 |
| `videos/` | Marketing videos (intro reel, hero loops) | `home-hero.mp4`, `about-intro.mp4`, etc. | H.264 MP4, ≤ 10 MB; if larger, host on Cloudflare R2 |
| `flyers/` | Downloadable PDFs (services brochure, price lists) | `rigoo-services.pdf`, `rigoo-pricing-2026.pdf` | PDF, ≤ 2 MB |

## Files the app currently references

Pages will show a broken-image icon (or fail silently for backgrounds) until you upload these:

| Path | Used by | Required? |
|---|---|---|
| `/brand/logo.svg` | `Navbar`, `Footer` | optional — falls back to ⚓ emoji on load error |
| `/gallery/engine-rebuild.jpg` | `Gallery` page card | yes (or remove the entry from `galleryItems` config in `Gallery.jsx`) |
| `/gallery/hull-restoration.jpg` | `Gallery` | same |
| `/gallery/gel-coat-polish.jpg` | `Gallery` | same |
| `/gallery/bottom-paint.jpg` | `Gallery` | same |
| `/gallery/propeller-repair.jpg` | `Gallery` | same |
| `/gallery/transom-replacement.jpg` | `Gallery` | same |
| `/gallery/about-workshop.jpg` | `About` page side image | yes |
| `/flyers/rigoo-services.pdf` | `Footer` "Download brochure" link | optional — link 404s if missing, no crash |
| `/brand/stamp.png` | Slot reserved for any future on-site display of the company stamp/seal | optional — not currently rendered on any page |

## Company stamp on PDFs (separate path)

The company stamp that appears on **invoice and quotation PDFs** is a backend asset, not a frontend one. Drop it at:

```
rigoo-marine-backend/invoice-module/src/main/resources/branding/stamp.png
rigoo-marine-backend/invoice-module/src/main/resources/branding/logo.png
```

See [`rigoo-marine-backend/invoice-module/src/main/resources/branding/README.md`](../../rigoo-marine-backend/invoice-module/src/main/resources/branding/README.md) for sizing and placement details. After dropping the files in, rebuild the `invoice-module` Docker image (or restart the JVM in dev) to pick them up.

## Adding a new gallery item

1. Drop the photo in `public/gallery/` with a slug filename (lowercase-with-hyphens, e.g. `winterization.jpg`).
2. Open `src/pages/public/Gallery.jsx` and add an entry to `galleryItems`:
   ```js
   { slug: 'winterization', title: 'Winterization', category: 'Mechanical' },
   ```
3. Reload — that's it. The image path is derived from the slug.

## Adding a video to a page

1. Drop the MP4 in `public/videos/` (e.g. `about-intro.mp4`).
2. In the target page:
   ```jsx
   <Box
     component="video"
     src="/videos/about-intro.mp4"
     poster="/hero/about.jpg"
     controls
     preload="metadata"
     sx={{ width: '100%', borderRadius: 3 }}
   />
   ```
3. **Always set `preload="metadata"`** — without it the browser starts downloading the whole video on page load, killing first-paint.

## When to move to a CDN

Static media bundled with the app is fine for:
- Total media payload under ~20 MB
- Photos under ~500 KB each
- Videos under ~10 MB each, ≤ 3 in total

If you exceed any of those, push the heavy files to **Cloudflare R2** (free egress, S3-compatible, ~$0.015/GB stored) and reference `https://media.rigoomarine.qa/<file>` instead of `/path`. The wiring in the pages stays the same — only the URL changes.

## Optimization quick reference

```bash
# Compress a JPG (drop quality to 82, strip metadata)
magick input.jpg -strip -quality 82 -resize '1920x>' output.jpg

# Convert PNG to WebP (~30% smaller for photos)
cwebp -q 82 input.png -o output.webp

# Compress an MP4 (target ~5 Mbps)
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k output.mp4
```
