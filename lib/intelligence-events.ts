import { createSupabaseServerClient } from "./supabase/server";
import { getProjects } from "./intelligence";
import { getProjectGraph } from "./intelligence-graph";

export type IntelligenceEvent = {
  id: string;
  eventType: string;
  headline: string;
  summary: string;
  materiality: "critical" | "high" | "medium" | "low";
  verificationStatus: "verified";
  projectId: string | null;
  projectSlug: string | null;
  projectName: string | null;
  company: string | null;
  market: string | null;
  region: string | null;
  occurredAt: string | null;
  publishedAt: string | null;
  verifiedAt: string;
  sourceName: string;
  sourceUrl: string;
  evidenceCount: number;
  isPublic: true;
};

const CHYRON_MATERIALITY = ["critical", "high", "medium"] as const;

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fallbackVerifiedEvents(limit: number): Promise<IntelligenceEvent[]> {
  const projects = await getProjects();
  const graphs = await Promise.all(projects.map(async (project) => ({
    project,
    graph: await getProjectGraph(project.slug),
  })));

  return graphs
    .flatMap(({ project, graph }) => graph.events.map((event, index) => ({
      id: `fallback:${project.slug}:${event.date}:${index}`,
      eventType: event.type,
      headline: event.headline,
      summary: event.summary,
      materiality: event.materiality,
      verificationStatus: "verified" as const,
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      company: project.company,
      market: project.market,
      region: project.region,
      occurredAt: event.date,
      publishedAt: event.date,
      verifiedAt: project.last_verified_at,
      sourceName: event.sourceName,
      sourceUrl: event.sourceUrl,
      evidenceCount: 1,
      isPublic: true as const,
    })))
    .sort((a, b) => new Date(b.verifiedAt || b.occurredAt || 0).getTime() - new Date(a.verifiedAt || a.occurredAt || 0).getTime())
    .slice(0, Math.max(0, limit));
}

export async function getVerifiedIntelligenceEvents(limit = 30): Promise<IntelligenceEvent[]> {
  const safeLimit = Math.max(0, Math.min(200, limit));
  if (!safeLimit) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("intel_events")
      .select("id,event_type,headline,summary,materiality,project_id,market,region,occurred_at,published_at,verified_at,primary_source_id,evidence_count,is_public,verification_status")
      .eq("verification_status", "verified")
      .eq("is_public", true)
      .order("verified_at", { ascending: false })
      .limit(safeLimit);

    if (!error && data?.length) {
      const projects = await getProjects();
      const projectMap = new Map(projects.map((project) => [project.id, project]));
      const sourceIds = [...new Set(data.map((row: any) => row.primary_source_id).filter(Boolean))];
      let sourceMap = new Map<string, { publisher: string; url: string }>();

      if (sourceIds.length) {
        const sourceResult = await supabase.from("intel_sources").select("id,publisher,url").in("id", sourceIds);
        if (!sourceResult.error) {
          sourceMap = new Map((sourceResult.data ?? []).map((source: any) => [source.id, { publisher: source.publisher, url: source.url }]));
        }
      }

      return data.map((row: any) => {
        const project = row.project_id ? projectMap.get(row.project_id) : undefined;
        const source = row.primary_source_id ? sourceMap.get(row.primary_source_id) : undefined;
        return {
          id: row.id,
          eventType: humanize(row.event_type),
          headline: row.headline,
          summary: row.summary,
          materiality: row.materiality,
          verificationStatus: "verified" as const,
          projectId: row.project_id ?? null,
          projectSlug: project?.slug ?? null,
          projectName: project?.name ?? null,
          company: project?.company ?? null,
          market: row.market ?? project?.market ?? null,
          region: row.region ?? project?.region ?? null,
          occurredAt: row.occurred_at ?? null,
          publishedAt: row.published_at ?? null,
          verifiedAt: row.verified_at ?? row.occurred_at ?? new Date(0).toISOString(),
          sourceName: source?.publisher ?? project?.source_name ?? "Verified source",
          sourceUrl: source?.url ?? project?.source_url ?? "#",
          evidenceCount: Number(row.evidence_count ?? 0),
          isPublic: true as const,
        };
      });
    }
  } catch {
    // Fall through to the verified legacy/static project graph during migration or outage.
  }

  return fallbackVerifiedEvents(safeLimit);
}

export async function getChyronEvents(limit = 20): Promise<IntelligenceEvent[]> {
  const capped = Math.max(0, Math.min(20, limit));
  if (!capped) return [];
  const events = await getVerifiedIntelligenceEvents(Math.max(60, capped * 3));
  return events
    .filter((event) => CHYRON_MATERIALITY.includes(event.materiality as (typeof CHYRON_MATERIALITY)[number]))
    .slice(0, Math.min(20, capped));
}
