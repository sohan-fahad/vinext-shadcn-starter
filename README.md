# vinext starter

Minimal vinext app on Cloudflare Workers with live runtime metrics and build benchmarks.

[![CI](https://github.com/h1n054ur/vinext-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/h1n054ur/vinext-starter/actions/workflows/ci.yml)

**Live:** https://vinext.h1n054ur.dev
**Article:** https://blog.cloudflare.com/vinext/

## What this is

Single-route App Router app running on [vinext](https://blog.cloudflare.com/vinext/) (Next.js API surface reimplemented on Vite), deployed to Workers.

The deployed page:
- Measures live runtime performance in your browser (TTFB, FCP, LCP, transfer sizes)
- Shows local build benchmark results (Next.js Turbopack vs vinext Vite/Rollup)
- Compares both against numbers from the Cloudflare blog post

## Results summary

**Bundle size (gzipped client JS):**

| | Next.js | vinext | Delta |
|---|---|---|---|
| CF blog (33 routes) | 168.9 KB | 74.0 KB | -56% |
| This repo (1 route) | 165.2 KB | 71.6 KB | -57% |

Bundle reduction checks out.

**Build time (3-run mean):**

| | Next.js | vinext |
|---|---|---|
| CF blog (33 routes) | 7.38s | 4.64s |
| This repo (1 route) | 2.79s | 3.40s |

Build speed advantage did not reproduce on a single-route app. CF benchmarked 33 routes; the gap likely scales with route count.

## Quick start

```
git clone https://github.com/h1n054ur/vinext-starter
cd vinext-starter
npm install
npm run dev
```

## Run benchmarks yourself

```
npm run bench      # 3 runs
npm run bench:5    # 5 runs
```

## Deploy

```
npm run deploy
```

## Scripts

| Script | Does |
|---|---|
| `dev` | vinext dev server |
| `build` | production build |
| `deploy` | build + deploy to Workers |
| `bench` | local build benchmark (3 runs) |
| `test` | vitest |

## Notes

- vinext is experimental
- [Cloudflare blog post](https://blog.cloudflare.com/vinext/)
- [vinext repo](https://github.com/cloudflare/vinext)
