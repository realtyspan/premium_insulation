# Premium Insulation, Inc. — Website

Marketing site + self-service job portfolio for Premium Insulation, Inc., a spray foam/cellulose/soundproofing insulation contractor in Red Hook, NY (owners: Karl Albrecht & Jeff Chandler, founded 2011). Serves Dutchess, Columbia, Ulster & Greene counties.

## Stack, and why

**Plain static HTML/CSS/JS — no build step, no package.json, no bundler.** This was a deliberate constraint, not an oversight. It means:
- Netlify deploys the repo as-is (no build command needed — see `netlify.toml`).
- Local preview is just a static file server (`server.ps1`, a hand-rolled PowerShell HTTP listener — this dev machine originally had no Node/Python/http-server available).
- The portfolio/CMS system below was specifically designed to avoid needing a static site generator.

**Hosting: Netlify** (chosen over Brizy Cloud and Elementor/WordPress, both seriously considered). Netlify won because its ecosystem (Identity + Git Gateway + a git-backed CMS) let the client manage portfolio content without a heavier CMS/build pipeline, while keeping the site fully static.

**Contact form: placeholder, pending Formaloo.** The original design brief specified embedding a Formaloo form (native Google Sheets + email notification integrations). `contact.html` has a plain HTML form with a comment marking exactly where the real Formaloo embed goes — **this swap has not been done yet.**

**CMS: Decap CMS via Netlify Identity + Git Gateway.**
- Client logs into `/admin/` (Netlify Identity), which lets them edit `content/jobs.json` directly through a friendly form — no GitHub account, no code.
- `admin/config.yml` defines the schema: one **file collection** (`content/jobs.json`) containing a single **list** field. This (not a folder-per-entry collection) was the key trick that avoids needing a build step — the CMS and the live site both just read/write the one JSON file directly.
- ⚠️ **Netlify Identity + Git Gateway are officially deprecated** (confirmed directly from Netlify's docs, July 2026). Still fully functional, no removal date, but Netlify won't fix new bugs in it and explicitly recommends not using it for new setups. If it ever breaks, the known migration path is **DecapBridge** (a free drop-in replacement built specifically for this exact Decap CMS + Netlify pattern) — not yet needed, just flagging it.

## Portfolio / job detail architecture

- `content/jobs.json` — single source of truth, array of job objects: `title, county, serviceType, beforeImage, afterImage, gallery[] (0-6 photos), caption, date`. Edited by Decap CMS, fetched client-side by the pages below.
- `portfolio.html` + `js/portfolio.js` — filterable grid (by county + service type) of job teaser cards, each with an inline before/after drag slider.
- `portfolio-detail.html` + `js/portfolio-detail.js` — **one reusable page**, not one file per job. Reads `?job=<slug>` from the URL, where the slug is derived client-side from the job title via `slugify()` (no manual slug field in the CMS — one less thing for the non-technical client to fill in or typo). Shows the before/after pair as a hero slider plus a thumbnail grid (before + after + gallery) opening into a lightbox.
- `js/portfolio-common.js` — shared `createBASlider()`, `slugify()`, `el()`, `fetchJobs()` used by both the grid and detail pages, so the slider logic exists in exactly one place.
- URLs are query-string based (`portfolio-detail.html?job=foo`), not pretty (`/portfolio/foo`). Pretty URLs are possible later via a Netlify `_redirects` rule but were deliberately left out of v1 to avoid an untested extra layer.

## Repo & deploy

- GitHub: `https://github.com/realtyspan/premium_insulation.git`, branch `main`.
- Netlify site is connected to that repo; Identity + Git Gateway have been enabled and at least one test invite has been walked through.
- Images are optimized via `tools/optimize-images.ps1` (uses .NET `System.Drawing` — no ImageMagick/PIL available on this dev machine). Re-run it after adding new large source photos to `assets/img/`.

## Known open items

- [ ] Swap the placeholder contact form for the real Formaloo embed (`contact.html`).
- [ ] Seed data in `content/jobs.json` uses plausible-but-placeholder before/after photo pairings, not real matched job photos — client should replace via `/admin/`.
- [ ] `assets/Logo.png` (old low-res logo, superseded by `assets/img/PremiumInsulation-Logo.png`) is still sitting unused in the repo — never explicitly removed.
- [ ] Custom domain (premiuminsulationny.com) not yet pointed at Netlify.
- [ ] Consider pretty URLs for job detail pages via Netlify `_redirects` if desired.
- [ ] Netlify Identity/Git Gateway deprecation — no action needed now, but keep DecapBridge in mind if it ever stops working.
