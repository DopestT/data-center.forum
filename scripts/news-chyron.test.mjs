import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

function publicTopbarFiles(dir = path.join(root, "app")) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "admin") continue;
      results.push(...publicTopbarFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      const source = fs.readFileSync(full, "utf8");
      if (source.includes('className="topbar"')) results.push(path.relative(root, full));
    }
  }
  return results;
}

test("verified intelligence events are the single public read model", () => {
  assert.equal(exists("lib/intelligence-events.ts"), true, "lib/intelligence-events.ts must exist");
  const source = read("lib/intelligence-events.ts");
  assert.match(source, /from\(["']intel_events["']\)/);
  assert.match(source, /eq\(["']verification_status["'],\s*["']verified["']\)/);
  assert.match(source, /eq\(["']is_public["'],\s*true\)/);
  assert.match(source, /getVerifiedIntelligenceEvents/);
  assert.match(source, /getChyronEvents/);
  assert.match(source, /\["critical",\s*"high",\s*"medium"\]/);
  assert.match(source, /slice\(0,\s*Math\.min\(20,/);
  assert.doesNotMatch(source, /intelligence-change-queue|source-snapshots/i, "public read model must never consume raw ingestion state");
  assert.match(source, /getProjectGraph/, "verified project-graph fallback must remain available");
});

test("news chyron has stable empty copy, internal links and accessibility", () => {
  assert.equal(exists("components/NewsChyron.tsx"), true, "components/NewsChyron.tsx must exist");
  const source = read("components/NewsChyron.tsx");
  assert.match(source, /DATA CENTER INTELLIGENCE · SOURCE-LINKED PROJECT DATA/);
  assert.match(source, /href=\{event\.projectSlug\s*\?\s*`\/database\/\$\{event\.projectSlug\}`\s*:\s*["']\/changes["']\}/);
  assert.match(source, /aria-label=/);
  assert.match(source, /VERIFIED/);
  assert.doesNotMatch(source, /target=["']_blank["']/, "chyron should navigate internally, not directly to sources");
});

test("public topbar owns the site-wide chyron and public routes stop duplicating raw topbars", () => {
  assert.equal(exists("components/PublicTopbar.tsx"), true, "components/PublicTopbar.tsx must exist");
  const source = read("components/PublicTopbar.tsx");
  assert.match(source, /NewsChyron/);
  assert.match(source, /className=["']topbar["']/);
  assert.deepEqual(publicTopbarFiles(), [], "all public routes with topbars must use PublicTopbar; admin is excluded");
});

test("chyron styles crawl, pause and respect reduced motion", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.newsChyron/);
  assert.match(css, /@keyframes\s+newsChyronCrawl/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /overflow-x:\s*auto/);
});

test("recent changes compatibility wrapper reads from verified event model", () => {
  const source = read("lib/recent-changes.ts");
  assert.match(source, /getVerifiedIntelligenceEvents/);
  assert.doesNotMatch(source, /getProjectGraph/);
  assert.doesNotMatch(source, /intelligence-change-queue|source-snapshots/i);
});
