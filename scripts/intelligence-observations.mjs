import crypto from "node:crypto";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function observationKey(observation) {
  const identity = {
    source_id: observation.source_id,
    predicate: observation.predicate,
    value_json: stable(observation.value_json ?? {}),
    observed_at: observation.observed_at,
  };
  return crypto.createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function sourceProjectSlugs(source) {
  if (Array.isArray(source?.metadata?.project_slugs)) return source.metadata.project_slugs.filter(Boolean);
  if (Array.isArray(source?.project_slugs)) return source.project_slugs.filter(Boolean);
  if (source?.project_hint) return [source.project_hint];
  if (source?.project_slug) return [source.project_slug];
  return [];
}

export function extractObservations(source, extractedContent, fetchMeta) {
  const projectSlugs = sourceProjectSlugs(source);
  const subjectText = source?.project_hint || projectSlugs[0] || source?.company_hint || source?.publisher || "unknown source";
  const observation = {
    source_id: source.id,
    fetch_id: fetchMeta.id,
    observed_at: fetchMeta.observedAt,
    published_at: source?.published_at ?? null,
    observation_type: "source_document",
    subject_text: subjectText,
    predicate: "source_content",
    value_json: {
      content_hash: fetchMeta.contentHash,
      project_slugs: projectSlugs,
      company_hint: source?.company_hint ?? null,
      market_hint: source?.market_hint ?? null,
      project_hint: source?.project_hint ?? projectSlugs[0] ?? null,
    },
    quote_or_excerpt: String(extractedContent?.text ?? "").slice(0, 1000) || null,
    source_url: fetchMeta.finalUrl || source.url,
    extraction_confidence: 1,
    extractor_version: extractedContent?.extraction_version ?? "unknown",
  };
  return [{ ...observation, observation_key: observationKey(observation) }];
}

export function shouldAutoResolveEntity(topConfidence, secondConfidence = null) {
  if (!Number.isFinite(topConfidence) || topConfidence < 0.95) return false;
  if (secondConfidence == null || !Number.isFinite(secondConfidence)) return true;
  return (topConfidence - secondConfidence) >= 0.05;
}
