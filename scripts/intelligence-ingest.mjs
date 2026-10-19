import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { extractContent } from "./intelligence-content.mjs";
import { fetchSource } from "./intelligence-fetch.mjs";
import { extractObservations } from "./intelligence-observations.mjs";
import { nextDueAt } from "./intelligence-schedule.mjs";

const scriptPath = fileURLToPath(import.meta.url);

export function contentHash(text) {
  return crypto.createHash("sha256").update(String(text ?? "")).digest("hex");
}

function snapshotPath(sourceId, fetchId, now, contentType) {
  const date = now instanceof Date ? now : new Date(now);
  const extension = String(contentType ?? "").includes("json") ? "json" : "html";
  return `${sourceId}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${fetchId}.${extension}`;
}

async function processSource({ source, db, storage, fetchSourceImpl, extractContentImpl, now }) {
  const observedAt = now.toISOString();
  const fetchId = crypto.randomUUID();
  let fetchResult = null;
  let extractionVersion = null;
  let hash = null;
  let snapshotObjectPath = null;
  let failureState = "fetch_error";
  let fetchRecorded = false;

  try {
    fetchResult = await fetchSourceImpl(source);

    failureState = "extract_error";
    let extracted;
    try {
      extracted = extractContentImpl(fetchResult.body, fetchResult.finalUrl || source.url);
    } catch (extractionError) {
      snapshotObjectPath = snapshotPath(source.id, fetchId, now, fetchResult.contentType);
      try {
        await storage.upload(snapshotObjectPath, fetchResult.body, { contentType: fetchResult.contentType ?? "text/html" });
      } catch (storageError) {
        failureState = "storage_error";
        throw storageError;
      }
      throw extractionError;
    }

    extractionVersion = extracted.extraction_version;
    hash = contentHash(extracted.text);

    failureState = "db_error";
    const previous = await db.getLastSuccessfulFetch(source.id);

    if (previous?.content_hash === hash) {
      await db.recordFetch({
        id: fetchId,
        source_id: source.id,
        fetched_at: observedAt,
        final_url: fetchResult.finalUrl || source.url,
        http_status: fetchResult.status,
        content_hash: hash,
        extraction_version: extractionVersion,
        duration_ms: fetchResult.durationMs ?? null,
        state: "unchanged",
        error_class: null,
        error_message: null,
        snapshot_object_path: null,
        response_byte_size: fetchResult.byteSize ?? null,
        content_type: fetchResult.contentType ?? null,
      });
      fetchRecorded = true;
      await db.updateSource(source.id, {
        last_success_at: observedAt,
        consecutive_failures: 0,
        pause_reason: null,
        next_due_at: nextDueAt(source.refresh_class ?? "daily", now),
      });
      return { state: "unchanged" };
    }

    failureState = "storage_error";
    snapshotObjectPath = snapshotPath(source.id, fetchId, now, fetchResult.contentType);
    await storage.upload(snapshotObjectPath, fetchResult.body, { contentType: fetchResult.contentType ?? "text/html" });

    failureState = "db_error";
    await db.recordFetch({
      id: fetchId,
      source_id: source.id,
      fetched_at: observedAt,
      final_url: fetchResult.finalUrl || source.url,
      http_status: fetchResult.status,
      content_hash: hash,
      extraction_version: extractionVersion,
      duration_ms: fetchResult.durationMs ?? null,
      state: "success",
      error_class: null,
      error_message: null,
      snapshot_object_path: snapshotObjectPath,
      response_byte_size: fetchResult.byteSize ?? null,
      content_type: fetchResult.contentType ?? null,
    });
    fetchRecorded = true;

    const observations = extractObservations(source, extracted, {
      id: fetchId,
      finalUrl: fetchResult.finalUrl || source.url,
      contentHash: hash,
      observedAt,
    });
    await db.recordObservations(observations);
    await db.updateSource(source.id, {
      last_success_at: observedAt,
      consecutive_failures: 0,
      pause_reason: null,
      next_due_at: nextDueAt(source.refresh_class ?? "daily", now),
    });
    return { state: "success", observationCount: observations.length };
  } catch (error) {
    const failures = Number(source?.consecutive_failures ?? 0) + 1;
    const pause = failures >= 10;
    const failureRow = {
      id: fetchId,
      source_id: source.id,
      fetched_at: observedAt,
      final_url: fetchResult?.finalUrl || source.url,
      http_status: fetchResult?.status ?? null,
      content_hash: hash,
      extraction_version: extractionVersion,
      duration_ms: fetchResult?.durationMs ?? null,
      state: failureState,
      error_class: error?.name ?? "Error",
      error_message: error instanceof Error ? error.message : String(error),
      snapshot_object_path: snapshotObjectPath,
      response_byte_size: fetchResult?.byteSize ?? null,
      content_type: fetchResult?.contentType ?? null,
    };

    try {
      if (fetchRecorded && typeof db.updateFetch === "function") {
        const { id: _id, ...failurePatch } = failureRow;
        await db.updateFetch(fetchId, failurePatch);
      } else {
        await db.recordFetch(failureRow);
      }
    } catch {
      // Failure telemetry is best-effort; never let it abort neighboring sources.
    }

    try {
      await db.updateSource(source.id, {
        last_failure_at: observedAt,
        consecutive_failures: failures,
        ...(pause ? { enabled: false, pause_reason: "Paused after 10 consecutive scheduled-run failures" } : {}),
        next_due_at: nextDueAt(source.refresh_class ?? "daily", now),
      });
    } catch {
      // Source-state bookkeeping is also isolated from the rest of the batch.
    }

    return { state: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function runIngestionBatch({
  sources,
  db,
  storage,
  fetchSourceImpl = fetchSource,
  extractContentImpl = extractContent,
  now = new Date(),
  concurrency = 20,
}) {
  if (!Array.isArray(sources)) throw new Error("sources must be an array");
  const workerCount = Math.max(1, Math.min(20, Number(concurrency) || 1, Math.max(1, sources.length)));
  let cursor = 0;
  const results = new Array(sources.length);

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= sources.length) return;
      results[index] = await processSource({
        source: sources[index],
        db,
        storage,
        fetchSourceImpl,
        extractContentImpl,
        now,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return {
    checked: sources.length,
    succeeded: results.filter((result) => result?.state === "success" || result?.state === "unchanged").length,
    unchanged: results.filter((result) => result?.state === "unchanged").length,
    failed: results.filter((result) => result?.state === "failed").length,
    observationCount: results.reduce((sum, result) => sum + Number(result?.observationCount ?? 0), 0),
    results,
  };
}

function createSupabaseAdapters(supabase) {
  return {
    db: {
      async getLastSuccessfulFetch(sourceId) {
        const { data, error } = await supabase.from("intel_source_fetches")
          .select("content_hash")
          .eq("source_id", sourceId)
          .in("state", ["success", "unchanged"])
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      async recordFetch(row) {
        const { error } = await supabase.from("intel_source_fetches").insert(row);
        if (error) throw error;
        return row;
      },
      async updateFetch(fetchId, patch) {
        const { error } = await supabase.from("intel_source_fetches").update(patch).eq("id", fetchId);
        if (error) throw error;
      },
      async recordObservations(rows) {
        if (!rows.length) return;
        const { error } = await supabase.from("intel_raw_observations").upsert(rows, { onConflict: "observation_key", ignoreDuplicates: true });
        if (error) throw error;
      },
      async updateSource(sourceId, patch) {
        const { error } = await supabase.from("intel_sources").update(patch).eq("id", sourceId);
        if (error) throw error;
      },
    },
    storage: {
      async upload(objectPath, body, options = {}) {
        const { data, error } = await supabase.storage.from("intel-source-snapshots").upload(
          objectPath,
          Buffer.from(String(body)),
          { contentType: options.contentType ?? "text/html", upsert: false }
        );
        if (error) throw error;
        return data;
      },
    },
  };
}

async function runCli() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const now = new Date();
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: sources, error } = await supabase.from("intel_sources")
    .select("*")
    .eq("enabled", true)
    .lte("next_due_at", now.toISOString())
    .order("next_due_at", { ascending: true })
    .limit(1000);
  if (error) throw error;
  const adapters = createSupabaseAdapters(supabase);
  const summary = await runIngestionBatch({ sources: sources ?? [], ...adapters, now, concurrency: 20 });
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
