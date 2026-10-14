import Link from "next/link";
import { checkoutLinks } from "../../lib/monetization";
import { formatVerified } from "../../lib/intelligence";
import { getRecentChanges } from "../../lib/recent-changes";

export default async function ChangesPage() {
  const changes = await getRecentChanges(30);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav>
          <Link href="/database">Database</Link>
          <Link href="/changes">Changes</Link>
          <Link href="/database/companies">Operators</Link>
          <Link href="/database/markets">Markets</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </header>

      <section className="commerceHero">
        <span className="kicker">VERIFIED CHANGES</span>
        <h1>See what changed.</h1>
        <p>Material project updates from the verified intelligence record: capacity, construction, partners, power, and other changes that affect the buildout. Raw source-watch detections stay out of this feed until they are reviewed.</p>
        <div className="heroActions">
          <Link className="buttonLink" href="/database">Search the database</Link>
          <a href={checkoutLinks.pro} target="_blank" rel="noreferrer">Track projects with Pro Beta — $49/mo →</a>
        </div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead">
          <div>
            <span className="kicker">RECENT INTELLIGENCE</span>
            <h2>Verified project changes</h2>
          </div>
          <span className="mutedText">{changes.length} verified events</span>
        </div>

        {changes.length ? (
          <div className="eventTimeline">
            {changes.map((change) => (
              <article className="eventRow" key={`${change.projectSlug}-${change.date}-${change.headline}`}>
                <div className="eventDate">{formatVerified(change.date)}</div>
                <div>
                  <div className="vendorBadges">
                    <span>VERIFIED</span>
                    <span>{change.materiality.toUpperCase()}</span>
                    <span>{change.type}</span>
                  </div>
                  <h3><Link href={`/database/${change.projectSlug}`}>{change.headline}</Link></h3>
                  <p>{change.company} · {change.region} · {change.projectName}</p>
                  <p>{change.summary}</p>
                  <div className="heroActions">
                    <Link href={`/database/${change.projectSlug}`}>Open project record →</Link>
                    <a href={change.sourceUrl} target="_blank" rel="noreferrer">{change.sourceName} →</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <span className="kicker">NO VERIFIED EVENTS</span>
            <h3>No verified project changes are published yet.</h3>
            <p>Source-watch detections are intentionally withheld until they are reviewed and converted into verified intelligence events.</p>
          </div>
        )}
      </section>

      <section className="section intel databaseUpsell">
        <span className="kicker">PRO BETA</span>
        <h2>Monitor the projects that matter to you.</h2>
        <p>The public feed shows verified changes across the database. Pro Beta adds a manually maintained watchlist, change digests, priority data requests, and CSV snapshots for the projects and companies you care about.</p>
        <div className="heroActions">
          <a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro Beta — $49/mo</a>
          <Link href="/database">Browse all projects →</Link>
        </div>
      </section>

      <footer><span>DataCenter.forum</span><span>Independent infrastructure intelligence.</span></footer>
    </main>
  );
}
