import Link from "next/link";
import { marketPages, projectsForMarket, knownCapacity } from "../../../lib/intelligence-indexes";
import { formatCapacity } from "../../../lib/intelligence";

export default function MarketIndexPage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/database/companies">Operators</Link><Link href="/database/markets">Markets</Link><Link href="/intelligence">Data</Link></nav>
      </header>
      <section className="commerceHero">
        <span className="kicker">MARKET INTELLIGENCE</span>
        <h1>Data-center projects by state.</h1>
        <p>Browse the current canonical project set by U.S. state to see operators, development status, published capacity, investment signals, and the source trail behind each record.</p>
      </section>
      <section className="section darkSection">
        <div className="directoryIndexGrid">
          {marketPages.map((market) => {
            const rows = projectsForMarket(market.slug);
            return (
              <Link className="directoryIndexCard" href={`/database/market/${market.slug}`} key={market.slug}>
                <span>{rows.length} project{rows.length === 1 ? "" : "s"}</span>
                <h2>{market.name}</h2>
                <p>{formatCapacity(knownCapacity(rows))} known announced capacity</p>
                <strong>Open market intelligence →</strong>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
