import { getVerifiedIntelligenceEvents } from "./intelligence-events";

export type RecentChange = {
  date: string;
  type: string;
  headline: string;
  summary: string;
  materiality: "critical" | "high" | "medium" | "low";
  sourceName: string;
  sourceUrl: string;
  projectSlug: string;
  projectName: string;
  company: string;
  region: string;
  stage: string;
  lastVerifiedAt: string;
  verificationStatus: "verified";
};

export async function getRecentChanges(limit = 30): Promise<RecentChange[]> {
  const events = await getVerifiedIntelligenceEvents(limit);
  return events.map((event) => ({
    date: event.occurredAt ?? event.publishedAt ?? event.verifiedAt,
    type: event.eventType,
    headline: event.headline,
    summary: event.summary,
    materiality: event.materiality,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    projectSlug: event.projectSlug ?? "",
    projectName: event.projectName ?? "Data center intelligence",
    company: event.company ?? "Verified source",
    region: event.region ?? event.market ?? "",
    stage: "",
    lastVerifiedAt: event.verifiedAt,
    verificationStatus: "verified" as const,
  }));
}
