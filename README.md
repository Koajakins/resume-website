# resume-website

Personal resume site for Thomas Haggath, Cloud Security Engineer.

Live at [haggath.re](https://www.haggath.re).

## Stack

- **Resume site**: static HTML + CSS + vanilla JS, no build step
- **Blog** (`/blog/`): Eleventy v3 in `blog/`, deployed alongside the resume site

## Key files

```
index.html     — resume content
card.html      — standalone digital business card page (card.css for styling)
style.css      — all styles (CSS custom properties, dark/light mode)
script.js      — nav, scroll reveal, Formspree contact form
sitemap.xml    — root-level pages; lastmod updated by CI on deploy
resume.pdf     — linked by download buttons
blog/          — Eleventy blog source
scripts/       — build/deploy helper scripts (see below)
```

## Scripts

| Script | Purpose |
|---|---|
| `sync-writing.js` | Regenerates the "Writing" cards in `index.html` from blog post frontmatter |
| `linkedin_post.py` | Posts a new blog post to LinkedIn (run by the LinkedIn Syndication workflow) |
| `export-brand.js` | Exports brand assets (business card SVGs, wordmark, etc.) |
| `font-b64.js` | Base64-encodes font files for embedding |

## Deployment

Push to `main` → GitHub Actions → build blog with Eleventy → deploy to Cloudflare Pages via Wrangler → IndexNow ping.

CI also validates HTML with vnu.jar.

## External services

| Service | Purpose |
|---|---|
| Formspree | Contact form submissions |
| Plausible | Analytics (SRI-hashed script) |
| Cloudflare | CDN + proxy (auto-injects Insights script) |
| IndexNow | Search engine ping on deploy |
