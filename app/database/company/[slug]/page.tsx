import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IntelligenceProjectList } from "../../../../components/IntelligenceProjectList";
import { formatCapacity } from "../../../../lib/intelligence";
import { knownCapacity, operatorPages, projectsForOperator } from "../../../../lib/intelligence-indexes";

export function generateStaticParams() {
  return operatorPages.map((operator) => ({ slug: operator.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const operator = operatorPages.find((row) => row.slug === slug);
  if (!operator) return {};
  return {
    title: `${operator.name} Data Center Projects`,
    description: `Source-linked ${operator.name} data-center projects, markets, development stages, capacity and investment signals.`,
    alternates: { canonical: `/database/company/${slug}` }
  };
}

export default async function OperatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const operator = operatorPages.find((row) => row.slug === slug);
  if (!operator) notFound();
  const projects = projectsForOperator(slug);
  const capacity = knownCapacity(projects);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/database/companies">Operators</Link><Link href="/database/markets">Markets</Link><Link href="/intelligence">Data</Link></nav>
      </header>
      <section className="commerceHero">
        <span className="kicker">OPERATOR INTELLIGENCE</span>
        <h1>{operator.name} data-center projects.</h1>
        <p>{projects.length} source-linked project record{projects.length === 1 ? "" : "s"} currently in the canonical dataset, with {formatCapacity(capacity)} of published capacity represented where operators have disclosed a figure.</p>
        <div className="heroActions"><Link className="buttonLink" href="/database">Search all projects</Link><Link href="/database/companies">All operators →</Link></div>
      </section>
      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">PROJECTS</span><h2>{operator.name} buildout</h2></div></div>
        <IntelligenceProjectList projects={projects} />
      </section>
    </main>
  );
}
