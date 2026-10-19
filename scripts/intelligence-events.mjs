import crypto from "node:crypto";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function verificationState(evidence = [], manualApproval = false) {
  const supporting = evidence.filter((item) => item?.relation === "supports");
  const contradicting = evidence.filter((item) => item?.relation === "contradicts");

  if (contradicting.length && supporting.length) return "conflicting";
  if (manualApproval) return "verified";
  if (supporting.some((item) => Number(item?.authority_tier) === 1 && item?.direct_authority === true)) return "verified";

  const distinctSupportingSources = new Set(supporting.map((item) => item?.source_id).filter(Boolean));
  if (distinctSupportingSources.size >= 2) return "corroborated";
  if (distinctSupportingSources.size === 1) return "single_source";
  return "unverified";
}

export function eventKey({ entityId, claimType, normalizedValue, effectiveDate }) {
  return crypto.createHash("sha256").update(JSON.stringify(stable({
    entity_id: entityId ?? null,
    claim_type: claimType ?? null,
    normalized_value: normalizedValue ?? null,
    effective_date: effectiveDate ?? null,
  }))).digest("hex");
}

export function isChyronEligible(event) {
  return event?.verification_status === "verified"
    && event?.is_public === true
    && ["critical", "high", "medium"].includes(event?.materiality);
}

export function buildPublicEvent(claim) {
  if (claim?.verification_status !== "verified") throw new Error("Only verified claims can become public events");
  const effectiveDate = claim?.effective_date ?? claim?.last_verified_at ?? null;
  return {
    event_key: eventKey({
      entityId: claim?.subject_entity_id,
      claimType: claim?.claim_type,
      normalizedValue: claim?.normalized_value,
      effectiveDate,
    }),
    event_type: claim?.claim_type ?? "update",
    headline: claim?.headline ?? `${claim?.claim_type ?? "Intelligence"} update`,
    summary: claim?.summary ?? "Verified intelligence update.",
    materiality: claim?.materiality ?? "medium",
    verification_status: "verified",
    project_id: claim?.project_id ?? null,
    company_id: claim?.company_id ?? null,
    market: claim?.market ?? null,
    region: claim?.region ?? null,
    occurred_at: claim?.occurred_at ?? effectiveDate,
    published_at: claim?.published_at ?? null,
    verified_at: claim?.last_verified_at ?? new Date().toISOString(),
    primary_source_id: claim?.primary_source_id ?? null,
    evidence_count: Number(claim?.evidence_count ?? 0),
    is_public: true,
  };
}
