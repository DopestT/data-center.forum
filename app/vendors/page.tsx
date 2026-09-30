import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { checkoutLinks, vendorCategories } from "../../lib/monetization";

type Vendor = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categories: string[];
  regions: string[];
  plan: string;
  is_verified: boolean;
  is_founding_partner: boolean;
};

async function getVendors(): Promise<Vendor[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("vendors")
      .select("id,slug,name,description,categories,regions,plan,is_verified,is_founding_partner")
      .eq("status", "approved")
      .order("plan", { ascending: false })
      .order("name");
    return (data ?? []) as Vendor[];
  } catch {
    return [];
  }
}

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const [vendors, params] = await Promise.all([getVendors(), searchParams]);

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><Link href="/database">Database</Link><Link href="/vendors">Companies</Link><Link href="/pricing">Pricing</Link><Link href="/jobs">Jobs</Link></nav>
      </header>

      <section className="commerceHero">
        <span className="kicker">COMPANY DATABASE</span>
        <h1>Find the companies behind the buildout.</h1>
        <p>Operators, contractors, consultants, equipment suppliers, and other data-center specialists. A basic reviewed listing is free. Featured Company is $99/month for clearly labeled priority discovery.</p>
        <div className="heroActions">
          <a className="buttonLink" href="#apply">List your company free</a>
          <a href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Feature your company — $99/mo →</a>
        </div>
      </section>

      <section className="section compactSection">
        <div className="sectionHead"><div><span className="kicker">CATEGORIES</span><h2>Browse by need</h2></div></div>
        <div className="pillGrid">{vendorCategories.map((category) => <span key={category}>{category}</span>)}</div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">REVIEWED DIRECTORY</span><h2>Published companies</h2></div><span className="mutedText">{vendors.length} approved</span></div>
        {vendors.length ? (
          <div className="vendorGrid">
            {vendors.map((vendor) => (
              <Link className="vendorCard" href={`/vendors/${vendor.slug}`} key={vendor.id}>
                <div className="vendorBadges">
                  {vendor.is_verified && <span>VERIFIED</span>}
                  {vendor.plan === "featured" && <span>FEATURED</span>}
                </div>
                <h3>{vendor.name}</h3>
                <p>{vendor.description}</p>
                <div className="chipRow">{vendor.categories.slice(0, 3).map((category) => <span key={category}>{category}</span>)}</div>
                <strong>View company →</strong>
              </Link>
            ))}
          </div>
        ) : (
          <div className="emptyState"><span className="kicker">DIRECTORY OPEN</span><h3>Be among the first companies listed.</h3><p>Listings are reviewed before publication. DataCenter.forum does not manufacture companies, reviews, or activity to make the database look populated.</p><a className="buttonLink" href="#apply">Apply free</a></div>
        )}
      </section>

      <section className="section compactSection">
        <div className="pricingGrid">
          <article className="priceCard">
            <span>DIRECTORY</span><h3>Free</h3>
            <p>A reviewed public company profile.</p>
            <ul><li>Company profile</li><li>Category placement</li><li>Website link</li><li>Eligible for verification</li></ul>
            <a href="#apply">Apply free →</a>
          </article>
          <article className="priceCard featuredPrice">
            <span>FEATURED COMPANY</span><h3>$99/mo</h3>
            <p>For companies that want stronger discovery across the database.</p>
            <ul><li>Everything in Directory</li><li>Priority discovery placement</li><li>Featured badge</li><li>Buyer-facing visibility</li></ul>
            <a className="buttonLink" href={checkoutLinks.featuredCompany} target="_blank" rel="noreferrer">Subscribe</a>
          </article>
        </div>
      </section>

      <section id="apply" className="section commerceSplit">
        <div>
          <span className="kicker">FREE LISTING</span>
          <h2>Add your company</h2>
          <p>Tell us what you do and where you operate. Review controls whether a company is published; paying for Featured never changes factual data, verification, or editorial treatment.</p>
          {params.applied === "1" && <p className="successNotice">Application received.</p>}
        </div>
        <form className="commerceForm" action="/api/vendor-applications" method="post">
          <input type="hidden" name="requested_plan" value="vendor" />
          <label>Company<input name="company_name" required maxLength={120} /></label>
          <label>Website<input name="website" type="url" placeholder="https://" /></label>
          <label>Your name<input name="contact_name" required maxLength={120} /></label>
          <label>Work email<input name="contact_email" type="email" required /></label>
          <label>Main category<select name="category" required defaultValue=""><option value="" disabled>Select one</option>{vendorCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>What do you sell or operate?<textarea name="notes" required minLength={10} maxLength={2000} /></label>
          <button type="submit">Submit free listing</button>
        </form>
      </section>
    </main>
  );
}
