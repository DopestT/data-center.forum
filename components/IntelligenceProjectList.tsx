import Link from "next/link";
import type { IntelProject } from "../lib/intelligence";
import { formatCapacity, formatVerified } from "../lib/intelligence";

export function IntelligenceProjectList({ projects }: { projects: IntelProject[] }) {
  return (
    <div className="projectList">
      {projects.map((project) => (
        <article className="projectRow" key={project.slug}>
          <div className="projectPrimary">
            <div className="vendorBadges"><span>{project.stage}</span></div>
            <h3><Link href={`/database/${project.slug}`}>{project.name}</Link></h3>
            <p>{project.company} · {project.region}</p>
            <p className="projectSummary">{project.summary}</p>
          </div>
          <div className="projectFacts">
            <div><span>Capacity</span><strong>{formatCapacity(project.announced_capacity_mw)}</strong></div>
            <div><span>Investment</span><strong>{project.investment_label ?? "Not published"}</strong></div>
            <div><span>Checked</span><strong>{formatVerified(project.last_verified_at)}</strong></div>
            <Link href={`/database/${project.slug}`}>Open record →</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
