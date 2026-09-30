import Link from "next/link";
import projects from "../../data/projects.json";
import graph from "../../data/project-graph.json";
import registry from "../../data/source-registry.json";
import { checkoutLinks } from "../../lib/monetization";

const knownCapacityMw = projects.reduce((sum, project) => sum + (project.announced_capacity_mw ?? 0), 0);
const enrichedProjects = Object.keys(graph).length;

export default function IntelligencePage() {
  const capacityLabel = knownCapacityMw >= 1000 ? `${(knownCapacityMw / 1000).toFixed(1)} GW` : `${knownCapacityMw} MW`;
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav>
          <Link href="/database">Database</Link>
          <Link href="/intelligence">Data</Link>
          <Link href="/vendors">Companies</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </header>

      <section className="commerceHero intelligenceOfferHero">
        <span className="kicker">DATACENTER INTELLIGENCE</span>
        <h1>The database is becoming the product.</h1>
        <p>Source-linked project intelligence built for people who sell into, finance, build, operate, or track data-center infrastructure. Public records show the evidence. Paid products turn that evidence into monitoring, structured exports, and custom data cuts.</p>
        <div className="heroActions">
          <a className="buttonLink" href="/api/intelligence-sample">Download sample CSV</a>
          <a href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro Beta — $49/mo →</a>
        </div>
      </section>

      <section className="section compactSection">
        <div className="databaseMetrics intelligenceMetrics">
          <div><strong>{projects.length}</strong><span>canonical project records</span></div>
          <div><strong>{registry.length}</strong><span>official-source watches</span></div>
          <div><strong>{enrichedProjects}</strong><span>relationship-enriched projects</span></div>
          <div><strong>{capacityLabel}</strong><span>known announced capacity</span></div>
        </div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead">
          <div><span className="kicker">DATA MODEL</span><h2>More than a project list</h2></div>
          <Link href="/database">Browse public records →</Link>
        </div>
        <div className="valueGrid intelligenceValueGrid">
          <article><span>01</span><h3>Project facts</h3><p>Company, location, market, stage, announced capacity, investment, source, and verification date.</p></article>
          <article><span>02</span><h3>Relationships</h3><p>Utilities, contractors, developers, technology partners, investors, and other organizations attached to projects.</p></article>
          <article><span>03</span><h3>Infrastructure signals</h3><p>Power generation, storage, grid work, cooling systems, contracting activity, and other structured facts when sourced.</p></article>
          <article><span>04</span><h3>Change history</h3><p>Dated material events and source fingerprints designed to answer what changed, when it changed, and where the evidence came from.</p></article>
        </div>
      </section>

      <section className="section intelligenceTiers">
        <div className="sectionHead"><div><span className="kicker">ACCESS</span><h2>Three ways to use it</h2></div></div>
        <div className="pricingGrid">
          <article className="priceCard">
            <span>PUBLIC</span><h3>Free</h3>
            <p>Research individual projects and inspect their source trails.</p>
            <ul><li>Search public records</li><li>Source links</li><li>Verification dates</li><li>Selected relationship data</li></ul>
            <Link href="/database">Browse database →</Link>
          </article>
          <article className="priceCard featuredPrice">
            <span>PRO BETA</span><h3>$49/mo</h3>
            <p>Manual intelligence monitoring while the self-serve product is completed.</p>
            <ul><li>Project watchlist</li><li>Change digests</li><li>Priority data requests</li><li>Full CSV snapshots on request</li></ul>
            <a className="buttonLink" href={checkoutLinks.pro} target="_blank" rel="noreferrer">Start Pro Beta</a>
          </article>
          <article className="priceCard">
            <span>DATA PARTNER</span><h3>Custom</h3>
            <p>Structured exports and research cuts shaped around an industry workflow.</p>
            <ul><li>Market or company cuts</li><li>Selected fields</li><li>Relationship data</li><li>Custom delivery scope</li></ul>
            <a href={checkoutLinks.dataPartnerInquiry} target="_blank" rel="noreferrer">Request data access — no charge →</a>
          </article>
        </div>
      </section>

      <section className="section intel">
        <span className="kicker">DATA RULE</span>
        <h2>Every valuable field should retain its provenance.</h2>
        <p>The goal is not to resell a pile of copied webpages. DataCenter.forum normalizes public-source intelligence into records, relationships, signals, and changes while retaining the source trail and verification state behind the facts.</p>
        <div className="heroActions">
          <a className="buttonLink" href="/api/intelligence-sample">Download the sample</a>
          <Link href="/pricing">See pricing →</Link>
        </div>
      </section>
    </main>
  );
}
