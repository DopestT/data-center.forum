import Link from "next/link";
import { checkoutLinks } from "../../lib/monetization";
import { formatCapacity, formatVerified, getProjects } from "../../lib/intelligence";

export default async function DatabasePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const [projects, params] = await Promise.all([getProjects(), searchParams]);
  const q = (params.q ?? "").trim().toLowerCase();
  const stage = (params.stage ?? "").trim().toLowerCase();

  const filtered = projects.filter((project) => {
    const haystack = [
      project.name,
      project.company,
      project.market,
      project.region,
      project.country,
      project.stage,
      project.summary
    ].join(" ").toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    const matchesStage = !stage || project.stage.toLowerCase().includes(stage);
    return matchesQuery && matchesStage;
  });

  const capacityMw = filtered.reduce((sum, project) => sum + (project.announced_capacity_mw ?? 0), 0);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav>
          <Link href="/database">Database</Link>
          <Link href="/vendors">Companies</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/jobs">Jobs</Link>
        </nav>
      </header>

      <section className="commerceHero databaseHero">
        <span className="kicker">PROJECT & POWER DATABASE</span>
        <h1>Search the buildout.</h1>
        <p>Source-linked data-center projects organized by company, market, status, capacity, and investment. Every public record shows where the claim came from and when we last checked it.</p>
        <div className="heroActions">
          <a className="buttonLink" href="#results">Browse projects</a>
          <a href={checkoutLinks.pro} target="_blank" rel="noreferrer">Get Pro — $49/mo →</a>
        </div>
      </section>

      <section className="section compactSection">
        <div className="databaseMetrics">
          <div><strong>{filtered.length}</strong><span>projects shown</span></div>
          <div><strong>{formatCapacity(capacityMw)}</strong><span>announced capacity</span></div>
          <div><strong>Source-linked</strong><span>public evidence trail</span></div>
          <div><strong>$49/mo</strong><span>tracking + export</span></div>
        </div>
      </section>

      <section id="results" className="section darkSection">
        <div className="sectionHead">
          <div><span className="kicker">DATABASE</span><h2>Find a project</h2></div>
          <Link href="/pricing">Compare access →</Link>
        </div>

        <form className="databaseSearch" action="/database" method="get">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search company, market, project, state…" />
          <select name="stage" defaultValue={params.stage ?? ""}>
            <option value="">All stages</option>
            <option value="construction">Under construction</option>
            <option value="announced">Announced / development</option>
          </select>
          <button type="submit">Search</button>
        </form>

        {filtered.length ? (
          <div className="projectList">
            {filtered.map((project) => (
              <article className="projectRow" key={project.slug}>
                <div className="projectPrimary">
                  <div className="vendorBadges"><span>{project.stage}</span>{project.featured && <span>VERIFIED SOURCE</span>}</div>
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
        ) : (
          <div className="emptyState"><span className="kicker">NO MATCH</span><h3>No project matched that search.</h3><p>Try a company, state, market, or broader status term.</p></div>
        )}
      </section>

      <section className="section intel databaseUpsell">
        <span className="kicker">PRO</span>
        <h2>Stop checking the same project twice.</h2>
        <p>Pro is the simple paid layer: project tracking, alerts when a record changes, advanced filters, and CSV export. No enterprise sales call required.</p>
        <div className="heroActions">
          <a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro — $49/mo</a>
          <a href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Feature a company — $99/mo →</a>
        </div>
      </section>
    </main>
  );
}
