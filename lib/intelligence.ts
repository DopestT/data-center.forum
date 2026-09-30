import { createSupabaseServerClient } from "./supabase/server";
import projectsData from "../data/projects.json";

export type IntelProject = {
  id: string;
  slug: string;
  name: string;
  company: string;
  market: string;
  region: string;
  country: string;
  stage: string;
  announced_capacity_mw: number | null;
  investment_label: string | null;
  summary: string;
  source_name: string;
  source_url: string;
  source_published_at: string | null;
  last_verified_at: string;
  featured: boolean;
};

export const fallbackProjects = projectsData as IntelProject[];

const projectFields = "id,slug,name,company,market,region,country,stage,announced_capacity_mw,investment_label,summary,source_name,source_url,source_published_at,last_verified_at,featured";

export async function getProjects(): Promise<IntelProject[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("intel_projects")
      .select(projectFields)
      .eq("is_public", true)
      .order("featured", { ascending: false })
      .order("announced_capacity_mw", { ascending: false });

    if (!error && data?.length) return data as IntelProject[];
  } catch {
    // The static verified seed keeps the public database usable before migration 006 is applied.
  }
  return fallbackProjects;
}

export async function getProject(slug: string): Promise<IntelProject | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("intel_projects")
      .select(projectFields)
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();

    if (!error && data) return data as IntelProject;
  } catch {
    // Fall through to the verified seed.
  }
  return fallbackProjects.find((project) => project.slug === slug) ?? null;
}

export function formatCapacity(mw: number | null) {
  if (mw == null) return "Not published";
  if (mw >= 1000) return `${(mw / 1000).toFixed(mw % 1000 === 0 ? 0 : 1)} GW`;
  return `${mw.toLocaleString()} MW`;
}

export function formatVerified(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}
