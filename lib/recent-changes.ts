import { getProjects } from "./intelligence";
import { getProjectGraph, type ProjectEvent } from "./intelligence-graph";

export type RecentChange = ProjectEvent & {
  projectSlug: string;
  projectName: string;
  company: string;
  region: string;
  stage: string;
  lastVerifiedAt: string;
  verificationStatus: "verified";
};

export async function getRecentChanges(limit = 30): Promise<RecentChange[]> {
  const projects = await getProjects();
  const projectGraphs = await Promise.all(
    projects.map(async (project) => ({
      project,
      graph: await getProjectGraph(project.slug)
    }))
  );

  return projectGraphs
    .flatMap(({ project, graph }) =>
      graph.events.map((event) => ({
        ...event,
        projectSlug: project.slug,
        projectName: project.name,
        company: project.company,
        region: project.region,
        stage: project.stage,
        lastVerifiedAt: project.last_verified_at,
        verificationStatus: "verified" as const
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, Math.max(0, limit));
}
