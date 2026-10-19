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

function fetchRow({ source, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath }) {
  return {
    id: fetchId,
    source_id: source.id,
    fetched_at: observedAt,
    final_url: fetchResult?.finalUrl || source.url,
    http_status: fetchResult?.status ?? null,
    content_hash: hash,
    extraction_version: extractionVersion,
    duration_ms: fetchResult?.durationMs ?? null,
    state,
    error_class: error ? (error?.name ?? "Error") : null,
    error_message: error ? (error instanceof Error ? error.message : String(error)) : null,
    snapshot_object_path: snapshotObjectPath,
    response_byte_size: fetchResult?.byteSize ?? null,
    content_type: fetchResult?.contentType ?? null,
  };
}

async function recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now }) {
  const failures = Number(source?.consecutive_failures ?? 0) + 1;
  const pause = failures >= 10;
  let loggingError = null;
  let sourceUpdateError = null;

  try {
    await db.recordFetch(fetchRow({
      source, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath,
    }));
  } catch (recordError) {
    loggingError = recordError instanceof Error ? recordError.message : String(recordError);
  }

  try {
    await db.updateSource(source.id, {
      last_failure_at: observedAt,
      consecutive_failures: failures,
      ...(pause ? { enabled: false, pause_reason: "Paused after 10 consecutive scheduled-run failures" } : {}),
      next_due_at: nextDueAt(source.refresh_class ?? "daily", now),
    });
  } catch (updateError) {
    sourceUpdateError = updateError instanceof Error ? updateError.message : String(updateError);
  }

  return {
    state: "failed",
    failureState: state,
    error: error instanceof Error ? error.message : String(error),
    ...(loggingError ? { loggingError } : {}),
    ...(sourceUpdateError ? { sourceUpdateError } : {}),
  };
}

async function updateSourceSuccess(db, source, observedAt, now) {
  try {
    await db.updateSource(source.id, {
      last_success_at: observedAt,
      consecutive_failures: 0,
      pause_reason: null,
      next_due_at: nextDueAt(source.refresh_class ?? "daily", now),
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function processSource({ source, db, storage, fetchSourceImpl, extractContentImpl, now }) {
  const observedAt = now.toISOString();
  const fetchId = crypto.randomUUID();
  let fetchResult = null;
  let extractionVersion = null;
  let hash = null;
  let snapshotObjectPath = null;
  let state = "fetch_error";

  try {
    fetchResult = await fetchSourceImpl(source);
  } catch (error) {
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now });
  }

  let extracted;
  state = "extract_error";
  try {
    extracted = extractContentImpl(fetchResult.body, fetchResult.finalUrl || source.url);
    extractionVersion = extracted.extraction_version;
    hash = contentHash(extracted.text);
  } catch (error) {
    try {
      snapshotObjectPath = snapshotPath(source.id, fetchId, now, fetchResult.contentType);
      await storage.upload(snapshotObjectPath, fetchResult.body, { contentType: fetchResult.contentType ?? "text/html" });
    } catch (storageError) {
      return recordFailure({
        source, db, fetchId, observedAt, fetchResult, hash, extractionVersion,
        state: "storage_error", error: storageError, snapshotObjectPath: null, now,
      });
    }
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now });
  }

  let previous;
  state = "db_error";
  try {
    previous = await db.getLastSuccessfulFetch(source.id);
  } catch (error) {
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now });
  }

  if (previous?.content_hash === hash) {
    try {
      await db.recordFetch(fetchRow({
        source, fetchId, observedAt, fetchResult, hash, extractionVersion,
        state: "unchanged", error: null, snapshotObjectPath: null,
      }));
    } catch (error) {
      return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state: "db_error", error, snapshotObjectPath, now });
    }
    const warning = await updateSourceSuccess(db, source, observedAt, now);
    return { state: "unchanged", ...(warning ? { warning } : {}) };
  }

  state = "storage_error";
  try {
    snapshotObjectPath = snapshotPath(source.id, fetchId, now, fetchResult.contentType);
    await storage.upload(snapshotObjectPath, fetchResult.body, { contentType: fetchResult.contentType ?? "text/html" });
  } catch (error) {
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath: null, now });
  }

  state = "db_error";
  try {
    await db.recordFetch(fetchRow({
      source, fetchId, observedAt, fetchResult, hash, extractionVersion,
      state: "success", error: null, snapshotObjectPath,
    }));
  } catch (error) {
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now });
  }

  const observations = extractObservations(source, extracted, {
    id: fetchId,
    finalUrl: fetchResult.finalUrl || source.url,
    contentHash: hash,
    observedAt,
  });

  try {
    await db.recordObservations(observations);
  } catch (error) {
    return recordFailure({ source, db, fetchId, observedAt, fetchResult, hash, extractionVersion, state, error, snapshotObjectPath, now });
  }

  const warning = await updateSourceSuccess(db, source, observedAt, now);
  return { state: "success", observationCount: observations.length, ...(warning ? { warning } : {}) };
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
      try {
        results[index] = await processSource({ source: sources[index], db, storage, fetchSourceImpl, extractContentImpl, now });
      } catch (error) {
        results[index] = {
          state: "failed",
          failureState: "db_error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
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
        const { error } = await supabase.from("intel_source_fetches").upsert(row, { onConflict: "id" });
        if (error) throw error;
        return row;
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
