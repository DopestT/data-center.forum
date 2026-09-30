import { createSupabaseServerClient } from "./supabase/server";
import projectGraphData from "../data/project-graph.json";

export type ProjectParticipant = {
  name: string;
  role: string;
  note: string;
  sourceName: string;
  sourceUrl: string;
};

export type ProjectFact = {
  category: string;
  label: string;
  value: string;
  sourceName: string;
  sourceUrl: string;
};

export type ProjectEvent = {
  date: string;
  type: string;
  headline: string;
  summary: string;
  materiality: "low" | "medium" | "high";
  sourceName: string;
  sourceUrl: string;
};

export type ProjectGraph = {
  participants: ProjectParticipant[];
  facts: ProjectFact[];
  events: ProjectEvent[];
};

export const fallbackGraph = projectGraphData as Record<string, ProjectGraph>;

export function getFallbackProjectGraph(slug: string): ProjectGraph {
  return fallbackGraph[slug] ?? { participants: [], facts: [], events: [] };
}


function sourceFrom(row: any) {
  const source = Array.isArray(row?.intel_sources) ? row.intel_sources[0] : row?.intel_sources;
  return {
    sourceName: source?.publisher ?? "Source",
    sourceUrl: source?.url ?? "#"
  };
}

function orgFrom(row: any) {
  const org = Array.isArray(row?.intel_organizations) ? row.intel_organizations[0] : row?.intel_organizations;
  return org?.name ?? "Organization";
}

function humanize(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function getProjectGraph(slug: string): Promise<ProjectGraph> {
  const fallback = getFallbackProjectGraph(slug);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: project, error: projectError } = await supabase
      .from("intel_projects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (projectError || !project?.id) return fallback;

    const [participantResult, factResult, eventResult] = await Promise.all([
      supabase
        .from("intel_project_participants")
        .select("role,notes,last_verified_at,intel_organizations(name),intel_sources(publisher,url)")
        .eq("project_id", project.id)
        .order("role"),
      supabase
        .from("intel_project_facts")
        .select("category,fact_key,text_value,number_value,unit,intel_sources(publisher,url)")
        .eq("project_id", project.id)
        .eq("is_current", true)
        .order("category")
        .order("fact_key"),
      supabase
        .from("intel_project_events")
        .select("event_date,event_type,headline,summary,materiality,intel_sources(publisher,url)")
        .eq("project_id", project.id)
        .order("event_date", { ascending: false })
    ]);

    const participants = (participantResult.data ?? []).map((row: any) => ({
      name: orgFrom(row),
      role: humanize(row.role),
      note: row.notes ?? "",
      ...sourceFrom(row)
    }));

    const facts = (factResult.data ?? []).map((row: any) => {
      const value = row.text_value ?? `${row.number_value ?? ""}${row.unit ? ` ${row.unit}` : ""}`.trim();
      return {
        category: humanize(row.category),
        label: humanize(row.fact_key),
        value,
        ...sourceFrom(row)
      };
    });

    const events = (eventResult.data ?? []).map((row: any) => ({
      date: row.event_date,
      type: humanize(row.event_type),
      headline: row.headline,
      summary: row.summary,
      materiality: row.materiality as "low" | "medium" | "high",
      ...sourceFrom(row)
    }));

    return {
      participants: participants.length ? participants : fallback.participants,
      facts: facts.length ? facts : fallback.facts,
      events: events.length ? events : fallback.events
    };
  } catch {
    return fallback;
  }
}
