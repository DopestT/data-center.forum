import Link from "next/link";
import { checkoutLinks } from "../../lib/monetization";

const plans = [
  {
    name: "Public",
    price: "$0",
    detail: "Use the database without a sales conversation.",
    features: ["Search public project records", "Source trail on each record", "Project status and capacity", "Public company/vendor discovery"],
    href: "/database",
    cta: "Browse free"
  },
  {
    name: "Pro Beta",
    price: "$49/mo",
    detail: "Manual monitoring service while the self-serve dashboard is completed.",
    features: ["Everything public", "Project watchlist", "Change digests", "Priority data requests", "CSV snapshots on request"],
    href: checkoutLinks.pro,
    cta: "Start Pro Beta"
  },
  {
    name: "Featured Company",
    price: "$99/mo",
    detail: "For vendors and operators that want stronger discovery.",
    features: ["Enhanced company profile", "Priority placement", "Website + capability links", "Buyer discovery surfaces", "Paid placement clearly labeled"],
    href: checkoutLinks.featuredCompany,
    cta: "Feature company"
  }
];

export default function PricingPage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/intelligence">Data</Link><Link href="/vendors">Companies</Link><Link href="/pricing">Pricing</Link></nav>
      </header>

      <section className="commerceHero">
        <span className="kicker">SIMPLE PRICING</span>
        <h1>Search free. Pay when the data needs to work for you.</h1>
        <p>The first paid version is deliberately small: $49/month for manually fulfilled Pro Beta monitoring, or $99/month to make a company more discoverable. Pro Beta does not yet include a self-serve tracking dashboard.</p>
      </section>

      <section className="section darkSection">
        <div className="pricingGrid">
          {plans.map((plan) => (
            <article className={`priceCard ${plan.name === "Pro Beta" ? "featuredPrice" : ""}`} key={plan.name}>
              <span>{plan.name}</span>
              <h3>{plan.price}</h3>
              <p>{plan.detail}</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              {plan.href.startsWith("http") ? (
                <a className="buttonLink" href={plan.href} target="_blank" rel="noreferrer">{plan.cta}</a>
              ) : (
                <Link className="buttonLink" href={plan.href}>{plan.cta}</Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="section compactSection">
        <div className="sectionHead">
          <div><span className="kicker">STRUCTURED DATA</span><h2>Need more than monitoring?</h2></div>
          <Link href="/intelligence">See the data product →</Link>
        </div>
        <p className="mutedText">Custom data and research access can be scoped around markets, companies, relationships, power signals, or structured exports. The public sample shows the baseline format; full enriched exports remain part of paid delivery.</p>
      </section>

      <section className="section intel">
        <span className="kicker">COMMERCIAL RULE</span>
        <h2>Payment buys tools or visibility. Not favorable data.</h2>
        <p>Featured companies can buy clearly disclosed placement. They cannot buy a better project status, a verification flag, favorable discussion, or suppression of public evidence.</p>
      </section>
    </main>
  );
}
