import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutLinks } from "../../../lib/monetization";
import { formatCapacity, formatVerified, getProject } from "../../../lib/intelligence";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/vendors">Companies</Link><Link href="/pricing">Pricing</Link></nav>
      </header>

      <section className="commerceHero projectDetailHero">
        <span className="kicker">{project.stage}</span>
        <h1>{project.name}</h1>
        <p>{project.summary}</p>
        <div className="heroActions">
          <a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Track with Pro Beta — $49/mo</a>
          <a href={project.source_url} target="_blank" rel="noreferrer">Open primary source →</a>
        </div>
      </section>

      <section className="section compactSection">
        <div className="recordGrid">
          <div><span>Company</span><strong>{project.company}</strong></div>
          <div><span>Market</span><strong>{project.market}</strong></div>
          <div><span>Location</span><strong>{project.region}</strong></div>
          <div><span>Announced capacity</span><strong>{formatCapacity(project.announced_capacity_mw)}</strong></div>
          <div><span>Investment</span><strong>{project.investment_label ?? "Not published"}</strong></div>
          <div><span>Last checked</span><strong>{formatVerified(project.last_verified_at)}</strong></div>
        </div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">EVIDENCE</span><h2>Source trail</h2></div></div>
        <article className="sourceCard">
          <div>
            <span className="tag">PRIMARY SOURCE</span>
            <h3>{project.source_name}</h3>
            <p>{project.source_published_at ? `Published ${formatVerified(project.source_published_at)} · ` : ""}Record checked {formatVerified(project.last_verified_at)}.</p>
          </div>
          <a className="secondaryButton" href={project.source_url} target="_blank" rel="noreferrer">View source</a>
        </article>
      </section>

      <section className="section intel">
        <span className="kicker">WHY PRO BETA EXISTS</span>
        <h2>The database is free to search. Monitored research is paid.</h2>
        <p>Use public records for one-off research. Pro Beta is manually fulfilled: tell us what matters, and we maintain the watchlist, change digest, priority data requests, and CSV snapshots while the self-serve dashboard is completed.</p>
        <div className="heroActions"><a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro Beta — $49/mo</a><Link href="/database">Back to database →</Link></div>
      </section>
    </main>
  );
}
