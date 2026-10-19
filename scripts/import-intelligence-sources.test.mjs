import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "import-intelligence-sources.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/import-intelligence-sources.mjs must exist");
  return import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);
}

const base = {
  id: "example-source",
  publisher: "Example Utility",
  source_type: "utility_filing",
  authority_tier: 1,
  url: "https://example.com/filings/",
  jurisdiction: "Virginia",
  refresh_class: "standard",
};

test("manifest validation normalizes safe source rows and defaults new imports disabled", async () => {
  const { validateSourceManifest } = await loadModule();
  const [source] = validateSourceManifest([{ ...base, url: "https://EXAMPLE.com/filings/#latest" }]);
  assert.equal(source.url, "https://example.com/filings/");
  assert.equal(source.enabled, false);
  assert.equal(source.allow_http, false);
  assert.equal(source.refresh_class, "standard");
  assert.equal(source.authority_tier, 1);
});

test("manifest validation accepts only known tiers and refresh classes", async () => {
  const { validateSourceManifest } = await loadModule();
  assert.throws(() => validateSourceManifest([{ ...base, authority_tier: 0 }]), /authority_tier/i);
  assert.throws(() => validateSourceManifest([{ ...base, authority_tier: 5 }]), /authority_tier/i);
  assert.throws(() => validateSourceManifest([{ ...base, refresh_class: "hourly" }]), /refresh_class/i);
});

test("manifest validation rejects unsafe schemes and requires explicit HTTP allowlisting", async () => {
  const { validateSourceManifest } = await loadModule();
  assert.throws(() => validateSourceManifest([{ ...base, url: "ftp://example.com/file" }]), /https|http/i);
  assert.throws(() => validateSourceManifest([{ ...base, url: "http://example.gov/agenda" }]), /allow_http/i);
  const [allowed] = validateSourceManifest([{ ...base, id: "gov-http", url: "http://example.gov/agenda", allow_http: true }]);
  assert.equal(allowed.url, "http://example.gov/agenda");
  assert.equal(allowed.allow_http, true);
});

test("manifest validation rejects duplicate ids and canonical urls", async () => {
  const { validateSourceManifest } = await loadModule();
  assert.throws(() => validateSourceManifest([base, { ...base, url: "https://other.example/source" }]), /duplicate.*id/i);
  assert.throws(
    () => validateSourceManifest([
      base,
      { ...base, id: "second", url: "https://EXAMPLE.com/filings/#another" },
    ]),
    /duplicate.*url/i
  );
});
