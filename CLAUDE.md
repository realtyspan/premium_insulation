# Premium Insulation, Inc. — Website

Marketing site + self-service job portfolio for Premium Insulation, Inc., a spray foam/cellulose/soundproofing insulation contractor in Red Hook, NY (owners: Karl Albrecht & Jeff Chandler, founded 2011). Serves Dutchess, Columbia, Ulster, Greene, Rensselaer & Albany counties.

## Stack, and why

**Plain static HTML/CSS/JS — no build step, no package.json, no bundler.** This was a deliberate constraint, not an oversight. It means:
- Netlify deploys the repo as-is (no build command needed — see `netlify.toml`).
- Local preview is just a static file server (`server.ps1`, a hand-rolled PowerShell HTTP listener — this dev machine originally had no Node/Python/http-server available).
- The portfolio/CMS system below was specifically designed to avoid needing a static site generator.

**Hosting: Netlify** (chosen over Brizy Cloud and Elementor/WordPress, both seriously considered). Netlify won because its ecosystem (Identity + Git Gateway + a git-backed CMS) let the client manage portfolio content without a heavier CMS/build pipeline, while keeping the site fully static.

**Contact form: Netlify Forms (native), not Formaloo.** The original brief specified Formaloo (for native Google Sheets + email integrations), but the client decided to use Netlify's built-in form handling instead — no external service, no API keys, no build step.
- `contact.html`'s form has `data-netlify="true"`, `name="contact"`, and a honeypot field (`netlify-honeypot="bot-field"` + hidden `bot-field` input) for spam filtering. Netlify detects it by parsing the static HTML at deploy — no JS-rendered form, so no duplicate hidden-form trick needed.
- `js/contact-form.js` intercepts submit and POSTs via `fetch` so the page shows an inline "Thank You" message (`#form-success` in `contact.html`) instead of redirecting to Netlify's default success page.
- Email notifications are **not** code — they're configured in the Netlify dashboard (Site settings → Forms → Form notifications → Email notification). Currently pointed at `realtyspan@gmail.com` for testing; **swap to the client's real business email before launch.**
- No Google Sheets sync (that was Formaloo-specific). If the client wants a Sheets copy of leads later, that needs Zapier or a Netlify Function — not built.
- Can only be fully tested (including the email send) on an actual Netlify deploy — the local `server.ps1` static server can't process Netlify Forms submissions.

**CMS: Decap CMS via Netlify Identity + Git Gateway.**
- Client logs into `/admin/` (Netlify Identity), which lets them edit `content/jobs.json` directly through a friendly form — no GitHub account, no code.
- `admin/config.yml` defines the schema: one **file collection** (`content/jobs.json`) containing a single **list** field. This (not a folder-per-entry collection) was the key trick that avoids needing a build step — the CMS and the live site both just read/write the one JSON file directly.
- The jobs list field uses `collapsed: true` + `minimize_collapsed: true` + `label_singular: "Job"` so each job renders as a single collapsed summary row ("Job Title — County") the client clicks to expand/edit, rather than one long fully-expanded scroll — this matters as more jobs get added. A true one-file-per-job folder collection would give an even closer sidebar-list UX, but was ruled out because it reopens the build-step problem above (a static site has no way to auto-discover multiple job files without a build step or manifest).
- ⚠️ **Netlify Identity + Git Gateway are officially deprecated** (confirmed directly from Netlify's docs, July 2026). Still fully functional, no removal date, but Netlify won't fix new bugs in it and explicitly recommends not using it for new setups. If it ever breaks, the known migration path is **DecapBridge** (a free drop-in replacement built specifically for this exact Decap CMS + Netlify pattern) — not yet needed, just flagging it.

## Portfolio / job detail architecture

- `content/jobs.json` — single source of truth, array of job objects: `title, county, serviceType, beforeImage, afterImage, gallery[] (0-6 photos), caption, date`. Edited by Decap CMS, fetched client-side by the pages below.
- `portfolio.html` + `js/portfolio.js` — filterable grid (by county + service type) of job teaser cards, each with an inline before/after drag slider.
- `portfolio-detail.html` + `js/portfolio-detail.js` — **one reusable page**, not one file per job. Reads `?job=<slug>` from the URL, where the slug is derived client-side from the job title via `slugify()` (no manual slug field in the CMS — one less thing for the non-technical client to fill in or typo). Shows the before/after pair as a hero slider plus a thumbnail grid (before + after + gallery) opening into a lightbox.
- `js/portfolio-common.js` — shared `createBASlider()`, `slugify()`, `el()`, `fetchJobs()` used by both the grid and detail pages, so the slider logic exists in exactly one place.
- **URLs are pretty: `/portfolio/<slug>`**, via a `status = 200` rewrite in `netlify.toml` (a rewrite, not a redirect — the URL stays put, which is what lets each job be indexed as its own page). `portfolio-detail.js` reads the slug from `location.pathname` and **still falls back to the old `?job=` query string**, so links shared before the change keep working; those legacy URLs canonicalise to the pretty form.
- Because the detail template is also served from a nested path, **every URL inside `portfolio-detail.html` is root-relative** (`/css/...`, `/js/...`, `/assets/...`), as is `fetchJobs()`'s `/content/jobs.json`. A relative path there resolves against `/portfolio/` and 404s. Keep this in mind when editing that page.
- `server.ps1` mirrors the `/portfolio/*` rewrite so pretty URLs work in local preview instead of only after deploy.

## SEO layer

- **Canonicals point at `https://premiuminsulationny.com`** on all five indexable pages. ⚠️ That domain is **not yet connected to Netlify** — until it is, canonicals reference a host that doesn't resolve. Connect the domain before (or alongside) treating the site as launched, otherwise leave this in mind when interpreting Search Console.
- **`index.html` carries a `HomeAndConstructionBusiness` JSON-LD block** (name, phone, founders, locality, six `areaServed` counties, three-service `hasOfferCatalog`). Street address, geo coordinates, and opening hours are **deliberately omitted rather than guessed** — adding them is the single biggest remaining local-SEO win, but they must come from the client.
- **Open Graph + Twitter Card tags on all six pages**, sharing one image: `assets/img/og-share.jpg` (1200x630, generated from the truck livery photo by `tools/make-icons.ps1`). OG image URLs must be absolute, hence the hardcoded domain.
- **`robots.txt`** (disallows `/admin/`, points at the sitemap) and **`sitemap.xml`** (five pages; `portfolio-detail.html` excluded since it is one noindex template serving every job).
- **Job pages are now indexable.** Each is served at its own `/portfolio/<slug>` URL, and `portfolio-detail.js` fills in the canonical, title, description and OG image from the matched job. When a slug matches nothing it injects `<meta name="robots" content="noindex">` instead, so a bad URL does not register as a soft 404. `robots.txt` disallows the bare `/portfolio-detail.html` template so it cannot be indexed in its own right.
- Job URLs are **not** in `sitemap.xml` — they come from CMS-edited `jobs.json`, and generating them would need a build step. Google discovers them through the links on `portfolio.html`, which is sufficient.

## Accessibility

- **Skip link** on every page, first child of `<body>`, targeting a `<main id="main">` landmark that wraps each page's content. It is `position: fixed` — `absolute` pins it to the top of the *document*, so it stays off screen when the page is restored at a scrolled position.
- **Mobile drawer** sets `aria-expanded` on the toggle, traps Tab within itself, closes on Escape, and returns focus to the toggle.
  - It uses the **`inert` attribute** to stay out of the tab order and accessibility tree while closed. The transform alone leaves the links focusable off screen. This was first attempted with a transitioned `visibility`, which does not reliably settle back to `hidden` after a close — `inert` is the right tool. `aria-hidden` is kept in sync for browsers predating `inert`.
  - Focus must move out of the drawer *before* it is inerted, or focus lands on `<body>` and the return-focus is lost.
- **Global `:focus-visible`** ring in brand gold. Form fields and the before/after slider handle define their own focus treatment and legitimately clear the outline; everything else inherits the global rule.
- **`prefers-reduced-motion`** damps all animation/transition durations, plus a JS branch that renders the stat counters at their final value (they animate `textContent`, which CSS cannot reach).

## Client-uploaded job photos (Netlify Image CDN)

The client uploads job photos through `/admin/` straight from a phone, at full
resolution. Rather than ask them to resize anything, every portfolio image is
requested through **Netlify's Image CDN**:

```
/.netlify/images?url=<encoded path>&w=<width>&q=78
```

- **No build step and no configuration** — the endpoint works out of the box for
  local site assets. (Remote hosts would need an `[images] remote_images`
  allowlist in `netlify.toml`; `imageUrl()` passes absolute URLs through
  untouched so they never 404.)
- Netlify negotiates **WebP/AVIF** from the browser's `Accept` header on its own,
  so no format handling is needed here.
- `js/portfolio-common.js` owns this: `imageUrl(src, width)` builds a single URL,
  and `applyImage(img, src, opts)` sets `src` + a `srcset`/`sizes` pair so a
  phone does not download a desktop-sized crop. Widths per slot are chosen to
  match the CSS: grid cards `[400, 800]`, detail hero `[900, 1800]`, thumbnails
  `[300, 600]`, lightbox `1800`.
- The detail hero passes `eager: true` — it is above the fold, and lazy-loading
  it would delay the largest contentful paint.
- **`server.ps1` mirrors the endpoint** (returning the original file, unresized),
  so local preview exercises the same URLs instead of a separate fallback path.
  Only `file://` bypasses the CDN.
- Encoding is handled by `encodeURIComponent`, which matters because client
  filenames routinely contain spaces, parentheses and `&` — an unencoded
  ampersand would truncate the query string.

⚠️ **This does not stop the original upload entering git.** Decap commits the raw
file through Git Gateway, so an 8MB phone photo is 8MB in history, permanently.
Decap has **no** `max_file_size` for the default git-backed media library (checked
— it only exists via third-party media services), so there is no guardrail to
add. Two options if the repo starts growing: run `tools/optimize-images.ps1` over
`assets/img/jobs/` periodically and commit the shrunk versions (history still
carries the originals), or move media to Cloudinary, which Decap supports natively
as a `media_library` and which keeps binaries out of git entirely.

## Images & performance

- All `<img>` tags carry intrinsic `width`/`height` (the one exception, `#lightboxImg`, is populated at runtime). This matters most for the two logos, which are styled `height: fixed; width: auto` and so cannot reserve horizontal space until load.
- Below-the-fold images use `loading="lazy" decoding="async"`; header logos stay eager.
- Favicons (`favicon-16/32.png`, `apple-touch-icon.png`) are a **"PI" monogram in the brand red/gold**, not the wordmark — the real logo is 480x288 and illegible below ~64px.
- `tools/make-icons.ps1` regenerates the favicon set + OG image. Only re-run if the brand mark changes.
- `tools/optimize-images.ps1` was reworked and now has two important properties:
  - **Idempotent.** JPEG re-encoding is lossy, so the old version degraded every image a little on every run — and the docs told you to re-run it routinely. It now skips files already within their width/size budget, and reverts any re-encode that fails to gain ≥8% at unchanged dimensions ("at quality floor").
  - **Matches extensions explicitly.** The old `Get-ChildItem -Include *.jpg` also matched `.jpeg` on Windows, which silently emitted a duplicate `GreenFiber.jpg` alongside `GreenFiber.jpeg`.
  - Full-bleed hero/banner images are capped at 1600px wide / quality 72 (they always sit under a dark overlay); half-column images 1200px / quality 78.

## Repo & deploy

- GitHub: `https://github.com/realtyspan/premium_insulation.git`, branch `main`.
- Netlify site is connected to that repo; Identity + Git Gateway have been enabled and at least one test invite has been walked through.
- Images are optimized via `tools/optimize-images.ps1` (uses .NET `System.Drawing` — no ImageMagick/PIL available on this dev machine). Re-run it after adding new large source photos to `assets/img/`.

## Known open items

- [ ] Set the Netlify Forms email notification recipient from the testing address (`realtyspan@gmail.com`) to the client's real business email before launch (Netlify dashboard → Site settings → Forms → Form notifications).
- [ ] Seed data in `content/jobs.json` uses plausible-but-placeholder before/after photo pairings, not real matched job photos — client should replace via `/admin/`.
- [ ] **Get the street address, ZIP, and business hours from the client** and add them to the JSON-LD block in `index.html` — the largest remaining local-SEO gain.
- [ ] Custom domain (premiuminsulationny.com) not yet pointed at Netlify — **now also blocks the canonical tags and sitemap from resolving.**
- [ ] Submit `sitemap.xml` to Google Search Console once the domain is live.
- [ ] Verify the `/portfolio/<slug>` rewrite on the deployed site. It is mirrored in `server.ps1` for local preview, but only Netlify exercises the real `netlify.toml` rule.
- [ ] Verify Netlify Image CDN on the deployed site (upload a large photo via `/admin/` and confirm the served image is resized and WebP/AVIF). Local preview only proves the URLs are well-formed — `server.ps1` returns the original file unresized.
- [ ] Netlify's docs mention image-transformation "credits" on Pro plans but do not publish free-plan limits. Transformations are edge-cached, so repeat views should not re-bill, but glance at account usage once real traffic starts.
- [ ] Netlify Identity/Git Gateway deprecation — no action needed now, but keep DecapBridge in mind if it ever stops working.
