import Link from "next/link";
import { SponsoredSlot } from "../components/SponsoredSlot";
import { formatCapacity, getProjects } from "../lib/intelligence";
import { checkoutLinks } from "../lib/monetization";

export default async function Home() {
  const projects = await getProjects();
  const preview = projects.slice(0, 3);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav>
          <Link href="/database">Database</Link>
          <Link href="/vendors">Companies</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/opportunities">Opportunities</Link>
        </nav>
      </header>

      <section className="hero databaseFrontHero">
        <div className="eyebrow">DATA CENTER PROJECT & POWER DATABASE</div>
        <h1>Know what is being built.</h1>
        <p>Search source-linked data-center projects by company, market, status, capacity, and investment. Public research stays free. Monitoring is the paid layer.</p>
        <div className="heroActions">
          <Link className="buttonLink" href="/database">Search the database</Link>
          <a href={checkoutLinks.pro} target="_blank" rel="noreferrer">Get Pro — $49/mo →</a>
        </div>
        <div className="signals">
          <span>Source-linked</span>
          <span>Last-verified dates</span>
          <span>No pay-to-rank project data</span>
        </div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead">
          <div><span className="kicker">LIVE RECORDS</span><h2>Projects worth watching</h2></div>
          <Link href="/database">Open database →</Link>
        </div>
        <div className="projectPreviewGrid">
          {preview.map((project) => (
            <Link className="projectPreviewCard" href={`/database/${project.slug}`} key={project.slug}>
              <div className="vendorBadges"><span>{project.stage}</span></div>
              <h3>{project.name}</h3>
              <p>{project.company} · {project.region}</p>
              <div className="previewFact"><span>Announced capacity</span><strong>{formatCapacity(project.announced_capacity_mw)}</strong></div>
              <strong className="previewLink">Open record →</strong>
            </Link>
          ))}
        </div>
      </section>

      <SponsoredSlot placement="home-between-sections" />

      <section className="section databaseValue">
        <div className="sectionHead"><div><span className="kicker">THE PRODUCT</span><h2>The database is the front door now.</h2></div></div>
        <div className="valueGrid">
          <article><span>01</span><h3>Projects</h3><p>Capacity, investment, stage, company, location, and source trail.</p></article>
          <article><span>02</span><h3>Companies</h3><p>Operators, developers, vendors, contractors, and the work they are attached to.</p></article>
          <article><span>03</span><h3>Power</h3><p>Utility, grid, and power-development context as the intelligence layer expands.</p></article>
          <article><span>04</span><h3>Permits</h3><p>Source-backed development signals before a project becomes obvious to the whole market.</p></article>
        </div>
      </section>

      <section className="section intel databaseUpsell">
        <span className="kicker">MONETIZATION</span>
        <h2>Two reasons to pay.</h2>
        <p><strong>Pro — $49/month:</strong> track projects, get change alerts, use advanced filters, and export. <strong>Featured Company — $99/month:</strong> stronger company discovery and clearly labeled priority placement.</p>
        <div className="heroActions">
          <a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro — $49/mo</a>
          <a href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Feature a company — $99/mo →</a>
        </div>
      </section>

      <section className="section compactSection forumSecondary">
        <span className="kicker">COMMUNITY LAYER</span>
        <h2>The forum supports the database, not the other way around.</h2>
        <p>Practitioner discussion, jobs, vendor discovery, and buyer opportunities remain useful acquisition and verification surfaces while the project-and-power database becomes the core product.</p>
        <div className="heroActions"><Link href="/vendors">Browse companies →</Link><Link href="/jobs">Data-center jobs →</Link></div>
      </section>

      <footer><span>DataCenter.forum</span><span>Independent infrastructure intelligence.</span></footer>
    </main>
  );
}
