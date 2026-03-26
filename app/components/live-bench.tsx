"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLAIMED, LOCAL_BENCH } from "../../lib/site";

type Metrics = {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  domReady: number | null;
  load: number | null;
  transferKb: number | null;
  jsTransferKb: number | null;
  resourceCount: number | null;
};

const EMPTY: Metrics = {
  ttfb: null,
  fcp: null,
  lcp: null,
  domReady: null,
  load: null,
  transferKb: null,
  jsTransferKb: null,
  resourceCount: null,
};

type Status = "idle" | "running" | "done";

/**
 * Best-effort size for a resource entry.
 * transferSize is 0 for cross-origin without Timing-Allow-Origin.
 * encodedBodySize can also be 0 for opaque responses.
 * Fall back to decodedBodySize as last resort.
 */
function bestSize(r: PerformanceResourceTiming): number {
  return r.transferSize || r.encodedBodySize || r.decodedBodySize || 0;
}

function isJs(r: PerformanceResourceTiming): boolean {
  return (
    r.initiatorType === "script" ||
    r.name.endsWith(".js") ||
    /\.js[?#]/.test(r.name)
  );
}

export default function LiveBench() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [status, setStatus] = useState<Status>("idle");
  const lcpRef = useRef<number | null>(null);

  const collect = useCallback(async () => {
    setStatus("running");

    // Small delay so load/paint entries finalize
    await new Promise((r) => setTimeout(r, 600));

    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];

    // Try API sizes first
    let totalBytes = resources.reduce((s, r) => s + bestSize(r), 0);
    const jsResources = resources.filter(isJs);
    let jsBytes = jsResources.reduce((s, r) => s + bestSize(r), 0);

    // If API returned all zeros (opaque), measure JS via fetch Content-Length
    if (jsBytes === 0 && jsResources.length > 0) {
      const sizes = await Promise.all(
        jsResources.map(async (r) => {
          try {
            const resp = await fetch(r.name, { method: "HEAD" });
            const cl = resp.headers.get("content-length");
            return cl ? Number(cl) : 0;
          } catch {
            return 0;
          }
        }),
      );
      jsBytes = sizes.reduce((a, b) => a + b, 0);
    }

    // Same fallback for total if it was zero
    if (totalBytes === 0 && resources.length > 0) {
      const sizes = await Promise.all(
        resources.map(async (r) => {
          try {
            const resp = await fetch(r.name, { method: "HEAD" });
            const cl = resp.headers.get("content-length");
            return cl ? Number(cl) : 0;
          } catch {
            return 0;
          }
        }),
      );
      totalBytes = sizes.reduce((a, b) => a + b, 0);
    }

    // Add nav document transfer
    if (nav) {
      const navSize = nav.transferSize || nav.encodedBodySize || 0;
      totalBytes += navSize;
    }

    const paints = performance.getEntriesByType("paint");
    const fcpEntry = paints.find((p) => p.name === "first-contentful-paint");

    setMetrics({
      ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
      lcp: lcpRef.current ? Math.round(lcpRef.current) : null,
      domReady: nav
        ? Math.round(nav.domContentLoadedEventEnd - nav.startTime)
        : null,
      load: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      transferKb: Math.round((totalBytes / 1024) * 10) / 10,
      jsTransferKb: Math.round((jsBytes / 1024) * 10) / 10,
      resourceCount: resources.length,
    });
    setStatus("done");
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          lcpRef.current = entries[entries.length - 1].startTime;
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      return () => observer.disconnect();
    } catch {
      // LCP not supported
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setTimeout(collect, 800);
    if (document.readyState === "complete") {
      handler();
    } else {
      window.addEventListener("load", handler);
      return () => window.removeEventListener("load", handler);
    }
  }, [collect]);

  function fmt(v: number | null, unit: string) {
    if (v === null) return { value: "--", unit };
    return { value: String(v), unit };
  }

  const items = [
    { ...fmt(metrics.ttfb, "ms"), label: "TTFB" },
    { ...fmt(metrics.fcp, "ms"), label: "FCP" },
    { ...fmt(metrics.lcp, "ms"), label: "LCP" },
    { ...fmt(metrics.domReady, "ms"), label: "DOM Ready" },
    { ...fmt(metrics.load, "ms"), label: "Full Load" },
    { ...fmt(metrics.transferKb, "KB"), label: "Transfer (all)" },
    { ...fmt(metrics.jsTransferKb, "KB"), label: "JS Transfer" },
    {
      value:
        metrics.resourceCount !== null ? String(metrics.resourceCount) : "--",
      unit: "",
      label: "Resources",
    },
  ];

  const s = (ms: number) => (ms / 1000).toFixed(2);

  return (
    <>
      <section className="section">
        <div className="section-head">
          <h2>Runtime metrics (this page, your browser)</h2>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span
              className={`status-dot ${status === "running" ? "running" : status === "done" ? "done" : ""}`}
            />
            <button className="btn" type="button" onClick={collect}>
              {status === "idle"
                ? "Measure"
                : status === "running"
                  ? "Measuring..."
                  : "Re-measure"}
            </button>
          </div>
        </div>
        <div className="section-body">
          <div className="bench-grid">
            {items.map((item) => (
              <div className="metric" key={item.label}>
                <div className="metric-label">{item.label}</div>
                <div className="metric-value">
                  {item.value}
                  <span className="metric-unit">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Build benchmarks (local, {LOCAL_BENCH.runs}-run mean)</h2>
        </div>
        <div className="section-body">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Next.js (Turbopack)</th>
                <th>vinext (Vite/Rollup)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Build time</td>
                <td>{s(LOCAL_BENCH.nextBuildMs)}s</td>
                <td>{s(LOCAL_BENCH.vinextBuildMs)}s</td>
              </tr>
              <tr>
                <td>Client JS (gzip)</td>
                <td>{LOCAL_BENCH.nextBundleKb} KB</td>
                <td>
                  <span className="val-good">
                    {LOCAL_BENCH.vinextBundleKb} KB
                  </span>
                </td>
              </tr>
              <tr>
                <td>Bundle reduction</td>
                <td className="val-neutral">baseline</td>
                <td>
                  <span className="val-good">
                    {LOCAL_BENCH.bundleReductionPct}% smaller
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="bench-note">{LOCAL_BENCH.note}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Cloudflare blog claims (33-route app)</h2>
        </div>
        <div className="section-body">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>CF blog value</th>
                <th>Our 1-route result</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Client JS (gzip)</td>
                <td>
                  Next {CLAIMED.nextBundleKb} KB / vinext{" "}
                  {CLAIMED.vinextBundleKb} KB
                </td>
                <td>
                  Next {LOCAL_BENCH.nextBundleKb} KB / vinext{" "}
                  {LOCAL_BENCH.vinextBundleKb} KB
                </td>
                <td>
                  <span className="val-good">
                    confirmed (~{LOCAL_BENCH.bundleReductionPct}% smaller)
                  </span>
                </td>
              </tr>
              <tr>
                <td>Build speed</td>
                <td>
                  Next {s(CLAIMED.nextBuildMs)}s / vinext{" "}
                  {s(CLAIMED.vinextBuildMs)}s
                </td>
                <td>
                  Next {s(LOCAL_BENCH.nextBuildMs)}s / vinext{" "}
                  {s(LOCAL_BENCH.vinextBuildMs)}s
                </td>
                <td>
                  <span className="val-neutral">
                    not reproduced at 1 route
                  </span>
                </td>
              </tr>
              <tr>
                <td>Build (Rolldown)</td>
                <td>
                  <span className="val-good">
                    {s(CLAIMED.vinextRolldownBuildMs)}s
                  </span>
                </td>
                <td className="val-neutral">n/a</td>
                <td className="val-neutral">Vite 8, not stable yet</td>
              </tr>
            </tbody>
          </table>
          <ul className="notes" style={{ marginTop: "0.75rem" }}>
            <li>
              CF blog benchmarked a 33-route app. We have 1 route. Build speed
              gains likely scale with route count.
            </li>
            <li>
              Bundle size reduction is consistent regardless of route count.
            </li>
            <li>
              Transfer sizes use Resource Timing API with HEAD-request fallback
              for cross-origin restrictions.
            </li>
            <li>
              Run <code>npm run bench</code> locally to get your own build
              numbers.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
