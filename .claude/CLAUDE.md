# Premium Insulation, Inc. — Website

Marketing site + self-service job portfolio for Premium Insulation, Inc., a spray foam/cellulose/soundproofing insulation contractor in Red Hook, NY (owners: Karl Albrecht & Jeff Chandler, founded 2011). Serves Dutchess, Columbia, Ulster, Greene, Rensselaer & Albany counties.

## Data Derivation setup (read first)

- **Always `git pull` before changing anything.** The client edits jobs through `/admin/` (Decap CMS), which commits straight to GitHub, so this copy goes stale without anyone touching it.
- This folder (`D:\Sites\premiuminsulation`) is the working copy since 2026-11-21. The old copy at `...\Temp Processing - Documents\Premium Insulation\Website` (OneDrive-synced) is retired — don't work there.
- Client files live in the client's Google Shared drive `G:\Shared drives\Premium Insulation\` (moved 2026-11-21): `2 Brand & Assets\Logo\Premium_Ins2.ai`, `2 Brand & Assets\Photos\` (job photos, Truck.jpg, `USB Files\` + `Resized\`), `3 Website\` (the website brief .docx/.pdf). Pull new source photos from there; never commit the brief (assets/*.pdf/.docx are gitignored because they'd be public).
- **Moving to Cloudflare (owner decision 2026-11-23).** The live site stays on Netlify, from `main`, until the owner approves the Cloudflare copy. The Cloudflare copy is built on the **`cloudflare-test` branch** — see "Moving to Cloudflare" below. Most of this file still describes the Netlify version on `main`.
- Domain premiuminsulationny.com — live on Netlify, which also runs its DNS (`www` redirects to it; **no email** on the domain — no MX/SPF/DMARC, checked 2026-11-22). Registrar/expiry: see the Domain Inventory sheet (`D:\Sites\_company\CLAUDE.md`).
- Pushing to `main` redeploys the live Netlify site — push only with the owner's OK.
- Preview: on `main`, `.claude/launch.json` config `premium-insulation-static` → http://localhost:8080 (`.tools/server.ps1`). On `cloudflare-test`, config `premium-insulation-cloudflare` → http://localhost:8081 (`.tools/preview.py`).

## Moving to Cloudflare (`cloudflare-test` branch)

Rebuilt on the Data Derivation starter 1.0.0 setup (`D:\Sites\_template`; read its `.claude/CLAUDE.md` and `SETUP-CHECKLIST.md`). Design, pages and jobs are unchanged; what changed:
- **Layout:** the site lives in `public/`, the only published folder. `wrangler.jsonc` (Worker `premium-insulation` → `premium-insulation.dataderivation.workers.dev`) and `src/worker.js` sit outside it. `netlify.toml` stays at the root until launch, unused by Cloudflare.
- **Addresses have no `.html`** (`/about`). All page links, canonicals, `og:url` and `sitemap.xml` were changed; `_redirects` 301s the old `.html` addresses so Google carries the ranking over. `public/404.html` is a branded not-found page (all paths root-relative, since it shows at any depth).
- **Job pages:** `/portfolio/<slug>` is served by `src/worker.js` (fetches `/portfolio-detail` from the static files and adds security headers, plus `noindex` on `*.workers.dev`). `.tools/preview.py` mirrors it.
- **Contact form:** `contact.html` posts to `/api/contact` (`src/worker.js`) with Turnstile + a honeypot named `website`. All original fields kept; the one "Phone or Email" box becomes the reply-to only when it is an email address. Secrets set by the owner in the dashboard: `TURNSTILE_SECRET`, `CONTACT_TO` (Jeff's address — never in the repo), `RESEND_API_KEY`. `CONTACT_FROM` is Resend's test sender for now (delivers only to the Resend account's own address, lands in junk).
- **Editing page:** Decap `^3.9.0` with **DecapBridge** logins (replaces Netlify Identity). `public/admin/config.yml` has a placeholder backend (`REPLACE-WITH-DECAPBRIDGE-SITE-ID`) pointed at `branch: cloudflare-test`, so test edits never reach the live site. Paths now start with `public/`.
- **Photo resizing:** `/cdn-cgi/image/width=…,quality=78,format=auto/…` (Cloudflare Images transformations) instead of Netlify Image CDN — **only on hosts in `RESIZE_HOSTS`** in `public/js/portfolio-common.js` (the real domain). `workers.dev` cannot resize, so the preview serves photos as uploaded. Paths are always URI-encoded per segment.
- `.tools/server.ps1` removed on this branch; image scripts now point at `public\assets\img`.

**Still to do before the preview works (needs the owner's sign-ins; follow the starter's SETUP-CHECKLIST Part B steps 3–7):**
1. Push the branch; Cloudflare → Workers & Pages → import `realtyspan/premium_insulation` (the Cloudflare GitHub app must be given access to it — the starter's app is on the Data-Derivation org only) with **production branch `cloudflare-test`** for now.
2. Turnstile widget for the workers.dev host → site key into `contact.html` (`REPLACE-WITH-TURNSTILE-SITE-KEY`), secret into the dashboard.
3. `CONTACT_TO`, `RESEND_API_KEY` secrets.
4. DecapBridge site (counts toward the free plan's 3) with a GitHub key for this repo → backend block into `config.yml`; invite the owner to test.
5. `python -I .tools/check_live.py https://premium-insulation.dataderivation.workers.dev`, a test form message, a test edit.

**At launch (only after the owner approves the preview):** merge `main` into `cloudflare-test` first so the client's latest job edits come across (renames to `public/` merge cleanly); move DNS from Netlify to Cloudflare; turn on Images → Transformations for the zone **before** the domain serves this code; add the custom domain + `www` to the Worker and the Turnstile widget; verify `premiuminsulationny.com` in Resend (or Cloudflare Email Sending) and switch `CONTACT_FROM`; `config.yml` → `branch: main` and the real `site_url`; delete the PRE-LAUNCH block in `public/_headers`; merge into `main` and switch the Worker's production branch to `main`; **stop Netlify auto-publishing** (its `publish = "."` would now serve the repo root) and keep its last deploy as a fallback for a week; re-invite the client's editors through DecapBridge (their Netlify login stops working). Decide whether to move the repo to the Data-Derivation GitHub org.

## Stack, and why

**Plain static HTML/CSS/JS — no build step, no package.json, no bundler.** This was a deliberate constraint, not an oversight. It means:
- Netlify deploys the repo as-is (no build command needed — see `netlify.toml`).
- Local preview is just a static file server (`.tools/server.ps1`, a hand-rolled PowerShell HTTP listener — this dev machine originally had no Node/Python/http-server available).
- The portfolio/CMS system below was specifically designed to avoid needing a static site generator.

**Hosting: Netlify** (chosen over Brizy Cloud and Elementor/WordPress, both seriously considered). Netlify won because its ecosystem (Identity + Git Gateway + a git-backed CMS) let the client manage portfolio content without a heavier CMS/build pipeline, while keeping the site fully static.

**Contact form: Netlify Forms (native), not Formaloo.** The original brief specified Formaloo (for native Google Sheets + email integrations), but the client decided to use Netlify's built-in form handling instead — no external service, no API keys, no build step.
- `contact.html`'s form has `data-netlify="true"`, `name="contact"`, and a honeypot field (`netlify-honeypot="bot-field"` + hidden `bot-field` input) for spam filtering. Netlify detects it by parsing the static HTML at deploy — no JS-rendered form, so no duplicate hidden-form trick needed.
- `js/contact-form.js` intercepts submit and POSTs via `fetch` so the page shows an inline "Thank You" message (`#form-success` in `contact.html`) instead of redirecting to Netlify's default success page.
- Email notifications are **not** code — they're configured in the Netlify dashboard (Site settings → Forms → Form notifications → Email notification). They go to the client's business email (Jeff's), plus a copy to the old test address `realtyspan@gmail.com`. Don't write the client's address into this file — it was publicly readable on the live site until Nov 2026 and the repo itself may be public.
- No Google Sheets sync (that was Formaloo-specific). If the client wants a Sheets copy of leads later, that needs Zapier or a Netlify Function — not built.
- Can only be fully tested (including the email send) on an actual Netlify deploy — the local `.tools/server.ps1` static server can't process Netlify Forms submissions.

**CMS: Decap CMS via Netlify Identity + Git Gateway.**
- Client logs into `/admin/` (Netlify Identity), which lets them edit `content/jobs.json` directly through a friendly form — no GitHub account, no code.
- `admin/config.yml` defines the schema: one **file collection** (`content/jobs.json`) containing a single **list** field. This (not a folder-per-entry collection) was the key trick that avoids needing a build step — the CMS and the live site both just read/write the one JSON file directly.
- The jobs list field uses `collapsed: true` + `minimize_collapsed: true` + `label_singular: "Job"` so each job renders as a single collapsed summary row ("Job Title — County") the client clicks to expand/edit, rather than one long fully-expanded scroll — this matters as more jobs get added. A true one-file-per-job folder collection would give an even closer sidebar-list UX, but was ruled out because it reopens the build-step problem above (a static site has no way to auto-discover multiple job files without a build step or manifest).
- ⚠️ **Netlify Identity + Git Gateway are officially deprecated** (confirmed directly from Netlify's docs, July 2026). Still fully functional, no removal date, but Netlify won't fix new bugs in it and explicitly recommends not using it for new setups. If it ever breaks, the known migration path is **DecapBridge** (a free drop-in replacement built specifically for this exact Decap CMS + Netlify pattern) — not yet needed, just flagging it.

## Portfolio / job detail architecture

- `content/jobs.json` — single source of truth, array of job objects: `title, county, serviceType, beforeImage, afterImage, gallery[] (0-6 photos), caption, date`. Edited by Decap CMS, fetched client-side by the pages below.
- `portfolio.html` + `js/portfolio.js` — filterable grid (by county + service type) of job teaser cards, each with an inline before/after drag slider.
- `portfolio-detail.html` + `js/portfolio-detail.js` — **one reusable page**, not one file per job. Reads `?job=<slug>` from the URL, where the slug is derived client-side from the job title via `slugify()` (no manual slug field in the CMS — one less thing for the non-technical client to fill in or typo). ⚠️ **The tradeoff: renaming a job changes its URL**, and the old address then shows the "Job Not Found" state. This bit once already, when a job was retitled from "Attic Spray Foam Retrofit" to "Daycare" and the previous link went dead — the Job Title field in `admin/config.yml` now carries a hint warning about it. Shows the before/after pair as a hero slider plus a thumbnail grid (before + after + gallery) opening into a lightbox.
- `js/portfolio-common.js` — shared `createBASlider()`, `slugify()`, `el()`, `fetchJobs()` used by both the grid and detail pages, so the slider logic exists in exactly one place.
- **URLs are pretty: `/portfolio/<slug>`**, via a `status = 200` rewrite in `netlify.toml` (a rewrite, not a redirect — the URL stays put, which is what lets each job be indexed as its own page). `portfolio-detail.js` reads the slug from `location.pathname` and **still falls back to the old `?job=` query string**, so links shared before the change keep working; those legacy URLs canonicalise to the pretty form.
- Because the detail template is also served from a nested path, **every URL inside `portfolio-detail.html` is root-relative** (`/css/...`, `/js/...`, `/assets/...`), as is `fetchJobs()`'s `/content/jobs.json`. A relative path there resolves against `/portfolio/` and 404s. Keep this in mind when editing that page.
- `.tools/server.ps1` mirrors the `/portfolio/*` rewrite so pretty URLs work in local preview instead of only after deploy.

## SEO layer

- **Canonicals point at `https://premiuminsulationny.com`** on all five indexable pages. The domain is connected to Netlify, so these resolve.
- **`index.html` carries a `HomeAndConstructionBusiness` JSON-LD block** (name, phone, founders, locality, six `areaServed` counties, three-service `hasOfferCatalog`). Street address, geo coordinates, and opening hours are **deliberately omitted rather than guessed** — adding them is the single biggest remaining local-SEO win, but they must come from the client.
- **Open Graph + Twitter Card tags on all six pages**, sharing one image: `assets/img/og-share.jpg` (1200x630, generated from the truck livery photo by `.tools/make-icons.ps1`). OG image URLs must be absolute, hence the hardcoded domain.
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
- **`.tools/server.ps1` mirrors the endpoint** (returning the original file, unresized),
  so local preview exercises the same URLs instead of a separate fallback path.
  Only `file://` bypasses the CDN.
- Encoding is handled by `encodeURIComponent`, which matters because client
  filenames routinely contain spaces, parentheses and `&` — an unencoded
  ampersand would truncate the query string.

⚠️ **This does not stop the original upload entering git.** Decap commits the raw
file through Git Gateway, so the full-size photo is in history permanently. Decap
has **no** `max_file_size` for the default git-backed media library (checked — it
only exists via third-party media services), so the only guardrail available is
the size hint on the image fields in `admin/config.yml`.

**Keep uploads under 1 MB — and do not "round that up".** Git Gateway proxies
GitHub's Contents API, which returns file content inline only up to 1 MB
(1,048,576 bytes); above that the `content` field comes back empty unless the
caller asks for the raw media type. Decap renders media thumbnails by fetching
the file through that API rather than generating real thumbnails
([decap-cms#946](https://github.com/decaporg/decap-cms/issues/946)), which makes
this the leading explanation for **thumbnails rendering blank in the editor while
the upload itself commits and displays on the site perfectly well** — a symptom
reported Aug 2026, not yet confirmed against a live CMS session.

If chasing that symptom again: first check whether small images (~100 KB) preview
fine while a near-1 MB one does not, and whether reloading `/admin/` makes the
thumbnail appear — Decap has a separate known quirk where fresh uploads need a
reload ([#3093](https://github.com/decaporg/decap-cms/issues/3093)). Note that
[#7639](https://github.com/decaporg/decap-cms/issues/7639) (images missing after
3.8.4) was ruled out: it affects only the preview pane, and this site runs
3.15.1/3.17.1.

**Do not "fix" this by re-running `.tools/optimize-images.ps1` over
`assets/img/jobs/`.** Rewriting a committed image *adds* a new blob while the
original stays in history forever, so it makes the repo **larger**, not smaller —
and since Image CDN already resizes on delivery, there is no serving benefit
either. The optimizer is for the site's own images in `assets/img/`, which are
committed once and served directly.

Scale, measured Aug 2026: whole repo 11 MB, largest single object a 1 MB client
upload. At ~1 MB per photo and 8 photos per job, this has years of runway. If
`.git` ever approaches a few hundred MB, the real fix is moving media to
Cloudinary, which Decap supports natively as a `media_library` and which keeps
binaries out of git entirely — external account, API key, and migrating existing
paths are the costs. Rewriting history (BFG / `git filter-repo`) would break Git
Gateway and is a genuine last resort.

## Images & performance

- All `<img>` tags carry intrinsic `width`/`height` (the one exception, `#lightboxImg`, is populated at runtime). This matters most for the two logos, which are styled `height: fixed; width: auto` and so cannot reserve horizontal space until load.
- Below-the-fold images use `loading="lazy" decoding="async"`; header logos stay eager.
- Favicons (`favicon-16/32.png`, `apple-touch-icon.png`) are a **"PI" monogram in the brand red/gold**, not the wordmark — the real logo is 480x288 and illegible below ~64px.
- `.tools/make-icons.ps1` regenerates the favicon set + OG image. Only re-run if the brand mark changes.
- `.tools/optimize-images.ps1` was reworked and now has two important properties:
  - **Idempotent.** JPEG re-encoding is lossy, so the old version degraded every image a little on every run — and the docs told you to re-run it routinely. It now skips files already within their width/size budget, and reverts any re-encode that fails to gain ≥8% at unchanged dimensions ("at quality floor").
  - **Matches extensions explicitly.** The old `Get-ChildItem -Include *.jpg` also matched `.jpeg` on Windows, which silently emitted a duplicate `GreenFiber.jpg` alongside `GreenFiber.jpeg`.
  - Full-bleed hero/banner images are capped at 1600px wide / quality 72 (they always sit under a dark overlay); half-column images 1200px / quality 78.

## Repo & deploy

- GitHub: `https://github.com/realtyspan/premium_insulation.git`, branch `main`.
- `publish = "."` serves the **whole repo**. Netlify never serves dot-folders, so internal files live in them: these notes in `.claude/CLAUDE.md`, the preview server and image scripts in `.tools/`. Put any new non-site file there too. (Forced 404 rules were tried first and failed: they match case-sensitively but Netlify serves files case-insensitively, so `/Claude.md` got through.)
- Netlify site is connected to that repo; Identity + Git Gateway have been enabled and at least one test invite has been walked through.
- Images are optimized via `.tools/optimize-images.ps1` (uses .NET `System.Drawing` — no ImageMagick/PIL available on this dev machine). Re-run it after adding new large source photos to `assets/img/`.

## Known open items

Checked 2026-11-21 against the live site and the Netlify dashboard:

- [x] Form notifications go to the client's business email (Jeff's) — 8 submissions, last 2026-11-20. The test address `realtyspan@gmail.com` still gets a copy; remove it only if the owner asks.
- [x] Custom domain connected: premiuminsulationny.com serves the Netlify site, `www` 301s to the bare domain. Canonicals and sitemap now resolve.
- [x] `/portfolio/<slug>` rewrite works on the deployed site.
- [x] Netlify Image CDN works on the deployed site (returns resized WebP).
- [x] `sitemap.xml` submitted to Google Search Console — **owner reports done, not verified** (needs a Google sign-in).
- [ ] Placeholder photos: Daycare has real before/after uploads; Foundation Wall Air-Seal has a real "before" but a stock `wall-cavity-fill-1.jpg` "after"; Commercial Hangar Insulation still uses the seed `hangar-dome-1/2.jpg` pair. Client replaces via `/admin/`.
- [x] Internal files hidden: `/CLAUDE.md`, `/Claude.md`, `/Server.ps1`, `/.tools/...` and the old `/tools/` paths all return 404 on the live site (checked 2026-11-21).
- [ ] **Get the street address, ZIP, and business hours from the client** and add them to the JSON-LD block in `index.html` — still missing on the live site; the largest remaining local-SEO gain.
- [ ] Netlify's docs mention image-transformation "credits" on Pro plans but do not publish free-plan limits. Transformations are edge-cached, so repeat views should not re-bill, but glance at account usage once real traffic starts.
- [ ] Netlify Identity/Git Gateway deprecation — no action needed now, but keep DecapBridge in mind if it ever stops working.
