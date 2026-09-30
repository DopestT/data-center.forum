import Link from "next/link";
import { notFound } from "next/navigation";
import { checkoutLinks } from "../../../lib/monetization";
import { formatCapacity, formatVerified, getProject } from "../../../lib/intelligence";
import { getProjectGraph } from "../../../lib/intelligence-graph";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, graph] = await Promise.all([getProject(slug), getProjectGraph(slug)]);
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


      {(graph.participants.length > 0 || graph.facts.length > 0 || graph.events.length > 0) && (
        <section className="section intelligenceGraphSection">
          <div className="sectionHead">
            <div>
              <span className="kicker">INTELLIGENCE GRAPH</span>
              <h2>Who and what is attached</h2>
            </div>
            <span className="mutedText">{graph.participants.length} organizations · {graph.facts.length} structured signals</span>
          </div>

          {graph.participants.length > 0 && (
            <>
              <h3 className="graphSubhead">Organizations & roles</h3>
              <div className="participantGrid">
                {graph.participants.map((participant) => (
                  <article className="participantCard" key={`${participant.name}-${participant.role}`}>
                    <span>{participant.role}</span>
                    <h4>{participant.name}</h4>
                    <p>{participant.note}</p>
                    <a href={participant.sourceUrl} target="_blank" rel="noreferrer">{participant.sourceName} →</a>
                  </article>
                ))}
              </div>
            </>
          )}

          {graph.facts.length > 0 && (
            <>
              <h3 className="graphSubhead">Structured signals</h3>
              <div className="signalGrid">
                {graph.facts.map((fact) => (
                  <article className="signalCard" key={`${fact.category}-${fact.label}`}>
                    <span>{fact.category}</span>
                    <small>{fact.label}</small>
                    <strong>{fact.value}</strong>
                    <a href={fact.sourceUrl} target="_blank" rel="noreferrer">{fact.sourceName} →</a>
                  </article>
                ))}
              </div>
            </>
          )}

          {graph.events.length > 0 && (
            <>
              <h3 className="graphSubhead">Material changes</h3>
              <div className="eventTimeline">
                {graph.events.map((event) => (
                  <article className="eventRow" key={`${event.date}-${event.headline}`}>
                    <div className="eventDate">{formatVerified(event.date)}</div>
                    <div>
                      <div className="vendorBadges"><span>{event.type}</span><span>{event.materiality.toUpperCase()}</span></div>
                      <h4>{event.headline}</h4>
                      <p>{event.summary}</p>
                      <a href={event.sourceUrl} target="_blank" rel="noreferrer">{event.sourceName} →</a>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

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
