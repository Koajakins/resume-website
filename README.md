# resume-website

Personal resume site for Thomas Haggath, Cloud Security Engineer.

Live at [haggath.re](https://www.haggath.re).

## Stack

- **Resume site**: static HTML + CSS + vanilla JS, no build step
- **Blog** (`/blog/`): Eleventy v3 in `blog/`, deployed to `/www/blog/` on OVH

## Key files

```
index.html     — resume content
style.css      — all styles (CSS custom properties, dark/light mode)
script.js      — nav, scroll reveal, Formspree contact form
.htaccess      — CSP, HSTS, cache headers, redirects
sitemap.xml    — lastmod updated by CI on deploy
resume.pdf     — linked by download buttons
blog/          — Eleventy blog source
```

## Deployment

Push to `main` → GitHub Actions → FTP to OVH → Cloudflare cache purge → IndexNow ping.

CI also validates HTML with vnu.jar.

## External services

| Service | Purpose |
|---|---|
| Formspree | Contact form submissions |
| Plausible | Analytics (SRI-hashed script) |
| Cloudflare | CDN + proxy (auto-injects Insights script) |
| IndexNow | Search engine ping on deploy |
