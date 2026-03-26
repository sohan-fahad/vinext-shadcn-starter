export const BLOG_URL = "https://blog.cloudflare.com/vinext/";
export const REPO_URL = "https://github.com/h1n054ur/vinext-starter";
export const SITE_URL = "https://vinext.h1n054ur.dev";

export function deployButtonUrl(repoUrl: string): string {
  return `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(repoUrl)}`;
}

/** Cloudflare's claimed numbers from the blog post (33-route app). */
export const CLAIMED = {
  nextBuildMs: 7380,
  vinextBuildMs: 4640,
  vinextRolldownBuildMs: 1670,
  nextBundleKb: 168.9,
  vinextBundleKb: 74.0,
  vinextRolldownBundleKb: 72.9,
} as const;

/**
 * Local benchmark results (1-route app, 3 runs mean).
 * Machine: CI / dev box. Re-run with `npm run bench` to get your own.
 */
export const LOCAL_BENCH = {
  nextBuildMs: 2787,
  vinextBuildMs: 3401,
  nextBundleKb: 165.2,
  vinextBundleKb: 71.6,
  bundleReductionPct: 56.7,
  runs: 3,
  note: "Single-route app. Next.js Turbopack, vinext Vite/Rollup. Lint/types disabled for fairness.",
} as const;
