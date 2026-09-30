import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntelligenceProjectList } from "../../../../components/IntelligenceProjectList";
import { formatCapacity } from "../../../../lib/intelligence";
import { knownCapacity, marketPages, projectsForMarket } from "../../../../lib/intelligence-indexes";

export function generateStaticParams() {
  return marketPages.map((market) => ({ slug: market.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const market = marketPages.find((row) => row.slug === slug);
  if (!market) return {};
  return {
    title: `${market.name} Data Center Projects`,
    description: `Source-linked data-center projects in ${market.name}, including operators, stage, capacity, investment signals and source trails.`,
    alternates: { canonical: `/database/market/${slug}` }
  };
}

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = marketPages.find((row) => row.slug === slug);
  if (!market) notFound();
  const projects = projectsForMarket(slug);
  const capacity = knownCapacity(projects);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/database/companies">Operators</Link><Link href="/database/markets">Markets</Link><Link href="/intelligence">Data</Link></nav>
      </header>
      <section className="commerceHero">
        <span className="kicker">MARKET INTELLIGENCE</span>
        <h1>{market.name} data-center projects.</h1>
        <p>{projects.length} source-linked project record{projects.length === 1 ? "" : "s"} currently in the canonical dataset, with {formatCapacity(capacity)} of published capacity represented where a project-level figure is available.</p>
        <div className="heroActions"><Link className="buttonLink" href="/database">Search all projects</Link><Link href="/database/markets">All markets →</Link></div>
      </section>
      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">PROJECTS</span><h2>{market.name} buildout</h2></div></div>
        <IntelligenceProjectList projects={projects} />
      </section>
    </main>
  );
}
