import Link from "next/link";
import { foundingPlans, vendorCategories } from "../../lib/monetization";

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const query = await searchParams;
  return (
    <main>
      <header className="topbar"><Link className="brand" href="/">DataCenter<span>.forum</span></Link><nav><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/advertise">Advertise</Link></nav></header>
      <section className="commerceHero">
        <span className="kicker">FOUNDING PARTNER PROGRAM</span>
        <h1>Buy access to attention, not influence.</h1>
        <p>Twenty launch partners get durable commercial visibility around a practitioner-first community. Sponsorship is always labeled and never buys favorable discussion, moderation, rankings, or member data.</p>
        <div className="heroActions"><a className="buttonLink" href="#apply">Apply for a founding slot</a><Link href="/vendors">See vendor marketplace →</Link></div>
      </section>
      <section className="section compactSection">
        <div className="metricStrip"><div><strong>20</strong><span>launch slots</span></div><div><strong>$1,500</strong><span>first 90 days</span></div><div><strong>1</strong><span>disclosed AMA / sponsored question</span></div><div><strong>0</strong><span>paid influence over member conversation</span></div></div>
      </section>
      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">COMMERCIAL TIERS</span><h2>Start small or own a launch position</h2></div></div>
        <div className="pricingGrid">{foundingPlans.map((plan) => <article className={`priceCard ${plan.name === "Founding Partner" ? "featuredPrice" : ""}`} key={plan.name}><span>{plan.name}</span><h3>{plan.price}</h3><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><a href="#apply">Choose {plan.name} →</a></article>)}</div>
      </section>
      <section id="apply" className="section commerceSplit">
        <div><span className="kicker">APPLICATION</span><h2>Claim a founding position</h2><p>Applications are reviewed for industry relevance before publication. A payment product can be connected after approval so we do not charge companies that are not a fit.</p>{query.applied === "1" && <p className="successNotice">Application received.</p>}</div>
        <form className="commerceForm" action="/api/vendor-applications" method="post">
          <input type="hidden" name="requested_plan" value="founding_partner" />
          <label>Company<input name="company_name" required maxLength={120} /></label>
          <label>Website<input name="website" type="url" placeholder="https://" /></label>
          <label>Your name<input name="contact_name" required maxLength={120} /></label>
          <label>Work email<input name="contact_email" type="email" required /></label>
          <label>Main category<select name="category" required defaultValue=""><option value="" disabled>Select one</option>{vendorCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Why are you a fit?<textarea name="notes" required minLength={10} maxLength={2000} /></label>
          <button type="submit">Apply for Founding Partner</button>
        </form>
      </section>
    </main>
  );
}
