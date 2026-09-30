import { createSupabaseServerClient } from "./supabase/server";

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

export const fallbackProjects: IntelProject[] = [
  {
    id: "meta-hyperion-richland",
    slug: "meta-hyperion-richland-parish",
    name: "Hyperion / Richland Parish Data Center",
    company: "Meta",
    market: "Northeast Louisiana",
    region: "Richland Parish, Louisiana",
    country: "United States",
    stage: "Under construction",
    announced_capacity_mw: 5000,
    investment_label: "$50B+",
    summary: "Meta's largest announced data-center campus, built to support the Hyperion multi-gigawatt AI training cluster.",
    source_name: "Meta Data Centers",
    source_url: "https://datacenters.atmeta.com/richland-parish-data-center/",
    source_published_at: "2026-07-13",
    last_verified_at: "2026-09-29T00:00:00Z",
    featured: true
  },
  {
    id: "amazon-northern-indiana",
    slug: "amazon-northern-indiana-2-4gw",
    name: "Northern Indiana Data Center Campuses",
    company: "Amazon Web Services",
    market: "Northern Indiana",
    region: "Northern Indiana",
    country: "United States",
    stage: "Announced / development",
    announced_capacity_mw: 2400,
    investment_label: "$15B",
    summary: "AWS announced new Northern Indiana campuses supporting AI and cloud workloads with 2.4 GW of planned data-center capacity.",
    source_name: "Amazon",
    source_url: "https://www.aboutamazon.com/news/company-news/amazon-15-billion-indiana-data-centers",
    source_published_at: null,
    last_verified_at: "2026-09-29T00:00:00Z",
    featured: true
  },
  {
    id: "openai-the-barn",
    slug: "openai-the-barn-saline-michigan",
    name: "The Barn",
    company: "OpenAI / Oracle / Related Digital",
    market: "Southeast Michigan",
    region: "Saline, Michigan",
    country: "United States",
    stage: "Under construction",
    announced_capacity_mw: 1000,
    investment_label: null,
    summary: "A 1 GW Stargate data-center campus in Saline, Michigan, developed with Oracle, Related Digital, and Walbridge.",
    source_name: "OpenAI",
    source_url: "https://openai.com/index/stargate-michigan-data-center/",
    source_published_at: "2026-06-01",
    last_verified_at: "2026-09-29T00:00:00Z",
    featured: true
  }
];

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
