import Link from "next/link";
import { operatorPages, projectsForOperator, knownCapacity } from "../../../lib/intelligence-indexes";
import { formatCapacity } from "../../../lib/intelligence";

export default function OperatorIndexPage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/database/companies">Operators</Link><Link href="/database/markets">Markets</Link><Link href="/intelligence">Data</Link></nav>
      </header>
      <section className="commerceHero">
        <span className="kicker">OPERATOR INTELLIGENCE</span>
        <h1>Data-center projects by company.</h1>
        <p>Browse the canonical project database by primary operator. Each page rolls source-linked project records into one company view without hiding the underlying evidence.</p>
      </section>
      <section className="section darkSection">
        <div className="directoryIndexGrid">
          {operatorPages.map((operator) => {
            const rows = projectsForOperator(operator.slug);
            return (
              <Link className="directoryIndexCard" href={`/database/company/${operator.slug}`} key={operator.slug}>
                <span>{rows.length} project{rows.length === 1 ? "" : "s"}</span>
                <h2>{operator.name}</h2>
                <p>{formatCapacity(knownCapacity(rows))} known announced capacity</p>
                <strong>Open operator intelligence →</strong>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
