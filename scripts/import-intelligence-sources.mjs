import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { refreshIntervalMs } from "./intelligence-schedule.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "..");

export function canonicalizeSourceUrl(value, allowHttp = false) {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    throw new Error("Source URL must be a valid HTTPS or explicitly allowlisted HTTP URL");
  }

  if (url.protocol === "http:" && !allowHttp) {
    throw new Error("HTTP source requires allow_http=true");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Source URL must use HTTPS or explicitly allowlisted HTTP");
  }

  url.hash = "";
  return url.toString();
}

export function validateSourceManifest(items) {
  if (!Array.isArray(items)) throw new Error("Source manifest must be an array");
  const seenIds = new Set();
  const seenUrls = new Set();

  return items.map((item, index) => {
    const id = String(item?.id ?? "").trim();
    const publisher = String(item?.publisher ?? "").trim();
    const sourceType = String(item?.source_type ?? "").trim();
    const authorityTier = Number(item?.authority_tier);
    const refreshClass = String(item?.refresh_class ?? "daily").trim();
    const allowHttp = item?.allow_http === true;

    if (!id) throw new Error(`Source ${index} requires id`);
    if (!publisher) throw new Error(`Source ${id} requires publisher`);
    if (!sourceType) throw new Error(`Source ${id} requires source_type`);
    if (!Number.isInteger(authorityTier) || authorityTier < 1 || authorityTier > 4) {
      throw new Error(`Source ${id} authority_tier must be 1-4`);
    }
    refreshIntervalMs(refreshClass);

    const url = canonicalizeSourceUrl(item?.url, allowHttp);
    if (seenIds.has(id)) throw new Error(`Duplicate source id: ${id}`);
    if (seenUrls.has(url)) throw new Error(`Duplicate source URL: ${url}`);
    seenIds.add(id);
    seenUrls.add(url);

    const projectSlugs = Array.isArray(item?.project_slugs)
      ? item.project_slugs.map((value) => String(value).trim()).filter(Boolean)
      : item?.project_slug
        ? [String(item.project_slug).trim()]
        : [];

    return {
      id,
      publisher,
      title: item?.title ? String(item.title).trim() : null,
      source_type: sourceType,
      authority_tier: authorityTier,
      url,
      jurisdiction: item?.jurisdiction ? String(item.jurisdiction).trim() : null,
      company_hint: item?.company_hint ? String(item.company_hint).trim() : null,
      market_hint: item?.market_hint ? String(item.market_hint).trim() : null,
      project_hint: item?.project_hint ? String(item.project_hint).trim() : (projectSlugs[0] ?? null),
      project_slugs: projectSlugs,
      refresh_class: refreshClass,
      enabled: item?.enabled === true,
      allow_http: allowHttp,
      metadata: item?.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata : {},
    };
  });
}

function rowsForDatabase(items) {
  return items.map(({ id, allow_http, project_slugs, metadata, ...source }) => ({
    ...source,
    metadata: {
      ...metadata,
      registry_id: id,
      allow_http,
      project_slugs,
    },
  }));
}

async function runCli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const manifestArg = args.find((arg) => !arg.startsWith("--"));
  const manifestPath = manifestArg ? path.resolve(manifestArg) : path.join(rootDir, "data", "source-manifest.initial.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const validated = validateSourceManifest(manifest);

  if (dryRun) {
    console.log(JSON.stringify({ valid: true, count: validated.length, enabled: validated.filter((item) => item.enabled).length }, null, 2));
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("intel_sources").upsert(rowsForDatabase(validated), { onConflict: "url" });
  if (error) throw error;
  console.log(`Imported ${validated.length} intelligence sources (${validated.filter((item) => item.enabled).length} enabled).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
