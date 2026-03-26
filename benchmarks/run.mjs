import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();

function parseRuns() {
  const arg = process.argv.find((value) => value.startsWith("--runs="));
  if (!arg) return 3;

  const parsed = Number.parseInt(arg.split("=")[1], 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return parsed;
}

function removeIfExists(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

function collectFiles(path, matcher, results = []) {
  if (!existsSync(path)) return results;

  const entries = readdirSync(path, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, matcher, results);
    } else if (matcher(full)) {
      results.push(full);
    }
  }

  return results;
}

function totalGzipBytes(files) {
  return files.reduce((sum, file) => {
    const source = readFileSync(file);
    return sum + gzipSync(source).length;
  }, 0);
}

function runCommand(command, args, env) {
  const started = process.hrtime.bigint();
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;

  if (result.status !== 0) {
    const stdout = result.stdout?.trim();
    const stderr = result.stderr?.trim();
    if (stdout) process.stdout.write(`${stdout}\n`);
    if (stderr) process.stderr.write(`${stderr}\n`);
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }

  return elapsedMs;
}

function benchmarkFramework({ name, command, args, outputDir, gzipFiles, runs, env }) {
  const timings = [];

  for (let index = 1; index <= runs; index += 1) {
    removeIfExists(resolve(root, outputDir));
    const elapsedMs = runCommand(command, args, env);
    timings.push(elapsedMs);
    process.stdout.write(`- ${name} run ${index}/${runs}: ${elapsedMs.toFixed(0)}ms\n`);
  }

  const meanMs = timings.reduce((sum, value) => sum + value, 0) / timings.length;
  const gzipBytes = totalGzipBytes(gzipFiles());

  return { name, meanMs, gzipBytes, timings };
}

function toKb(bytes) {
  return bytes / 1024;
}

function printResults(nextStats, vinextStats) {
  const speedup = nextStats.meanMs / vinextStats.meanMs;
  const bundleReduction = 1 - vinextStats.gzipBytes / nextStats.gzipBytes;

  process.stdout.write("\nBuild benchmark (local machine)\n");
  process.stdout.write("--------------------------------\n");
  process.stdout.write(`Next.js  mean build: ${nextStats.meanMs.toFixed(0)}ms\n`);
  process.stdout.write(`vinext   mean build: ${vinextStats.meanMs.toFixed(0)}ms\n`);
  process.stdout.write(`Speedup: ${speedup.toFixed(2)}x (vinext vs Next.js)\n\n`);

  process.stdout.write("Gzipped client JS size\n");
  process.stdout.write("----------------------\n");
  process.stdout.write(`Next.js: ${toKb(nextStats.gzipBytes).toFixed(1)} KB\n`);
  process.stdout.write(`vinext : ${toKb(vinextStats.gzipBytes).toFixed(1)} KB\n`);
  process.stdout.write(`Delta  : ${(bundleReduction * 100).toFixed(1)}% smaller\n\n`);

  process.stdout.write("Notes\n");
  process.stdout.write("-----\n");
  process.stdout.write("- This compares bundling/compilation on one tiny app.\n");
  process.stdout.write("- Next.js lint/type checks are disabled in next.config.mjs for fairness.\n");
  process.stdout.write("- App route exports `dynamic = \"force-dynamic\"` to avoid static pre-render skew.\n");
}

function main() {
  const runs = parseRuns();
  process.stdout.write(`Running local benchmark with ${runs} run(s) per framework...\n`);

  const nextStats = benchmarkFramework({
    name: "Next.js",
    command: resolve(root, "node_modules/.bin/next"),
    args: ["build"],
    outputDir: ".next",
    runs,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    gzipFiles: () => collectFiles(resolve(root, ".next/static/chunks"), (file) => file.endsWith(".js")),
  });

  const vinextStats = benchmarkFramework({
    name: "vinext",
    command: resolve(root, "node_modules/.bin/vinext"),
    args: ["build"],
    outputDir: "dist",
    runs,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    gzipFiles: () => collectFiles(resolve(root, "dist/client/assets"), (file) => file.endsWith(".js")),
  });

  printResults(nextStats, vinextStats);
}

main();
