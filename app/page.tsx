import LiveBench from "./components/live-bench";
import { BLOG_URL, REPO_URL, SITE_URL, deployButtonUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const deployUrl = deployButtonUrl(REPO_URL);

  return (
    <main className="page">
      <header className="header">
        <h1>vinext starter</h1>
        <p>
          Minimal App Router app built with{" "}
          <a href={BLOG_URL}>vinext</a> (Next.js API on Vite),
          deployed to Cloudflare Workers. Live runtime metrics below,
          plus local build benchmark results comparing Next.js and vinext
          on the same codebase.
        </p>
        <nav className="links">
          <a href={REPO_URL}>source</a>
          <a href={BLOG_URL}>cf blog</a>
          <a href={deployUrl}>deploy</a>
          <a href={SITE_URL}>{new URL(SITE_URL).hostname}</a>
        </nav>
      </header>

      <LiveBench />
    </main>
  );
}
