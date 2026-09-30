import Link from "next/link";
import { checkoutLinks } from "../../lib/monetization";

export default function PartnersPage() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/vendors">Companies</Link><Link href="/pricing">Pricing</Link></nav>
      </header>

      <section className="commerceHero">
        <span className="kicker">COMPANY VISIBILITY</span>
        <h1>One paid company plan.</h1>
        <p>Featured Company costs $99/month. It adds clearly labeled priority discovery to a reviewed company profile. There is no launch package, negotiation, or sales call required.</p>
        <div className="heroActions">
          <a className="buttonLink" href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Feature company — $99/mo</a>
          <Link href="/vendors#apply">List company free →</Link>
        </div>
      </section>

      <section className="section darkSection">
        <div className="pricingGrid">
          <article className="priceCard">
            <span>PUBLIC DIRECTORY</span><h3>Free</h3><p>Reviewed company profile in the industry database.</p>
            <ul><li>Public profile</li><li>Categories</li><li>Website link</li><li>Source-backed verification when available</li></ul>
            <Link href="/vendors#apply">Apply free →</Link>
          </article>
          <article className="priceCard featuredPrice">
            <span>FEATURED COMPANY</span><h3>$99/mo</h3><p>Priority discovery without buying influence over facts.</p>
            <ul><li>Everything in the free listing</li><li>Priority company placement</li><li>Featured label</li><li>Buyer-facing visibility</li></ul>
            <a className="buttonLink" href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Subscribe</a>
          </article>
        </div>
      </section>

      <section className="section intel">
        <span className="kicker">BOUNDARY</span>
        <h2>Visibility can be purchased. Data cannot.</h2>
        <p>A subscription does not change project facts, source trails, verification status, community moderation, or editorial treatment.</p>
      </section>
    </main>
  );
}
