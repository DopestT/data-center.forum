import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { foundingPlans, vendorCategories } from "../../lib/monetization";

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
      .order("is_founding_partner", { ascending: false })
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
        <nav><Link href="/">Forums</Link><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/partners">Partners</Link></nav>
      </header>

      <section className="commerceHero">
        <span className="kicker">VENDOR MARKETPLACE</span>
        <h1>Find the companies that actually deliver.</h1>
        <p>Data-center-specific vendors organized around the work buyers need done. Listings are published only after review; paid placement never changes member discussion or moderation.</p>
        <div className="heroActions"><a className="buttonLink" href="#apply">List your company</a><Link href="/partners">Founding Partner program →</Link></div>
      </section>

      <section className="section compactSection">
        <div className="sectionHead"><div><span className="kicker">CATEGORIES</span><h2>Browse by need</h2></div></div>
        <div className="pillGrid">{vendorCategories.map((category) => <a key={category} href={`#${category.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}>{category}</a>)}</div>
      </section>

      <section className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">VERIFIED DIRECTORY</span><h2>Published vendors</h2></div><span className="mutedText">{vendors.length} approved</span></div>
        {vendors.length ? (
          <div className="vendorGrid">
            {vendors.map((vendor) => (
              <Link className="vendorCard" href={`/vendors/${vendor.slug}`} key={vendor.id}>
                <div className="vendorBadges">{vendor.is_verified && <span>VERIFIED</span>}{vendor.is_founding_partner && <span>FOUNDING PARTNER</span>}</div>
                <h3>{vendor.name}</h3>
                <p>{vendor.description}</p>
                <div className="chipRow">{vendor.categories.slice(0, 3).map((category) => <span key={category}>{category}</span>)}</div>
                <strong>View profile →</strong>
              </Link>
            ))}
          </div>
        ) : (
          <div className="emptyState"><span className="kicker">LAUNCH INVENTORY OPEN</span><h3>No vendor has been published yet.</h3><p>That is intentional. DataCenter.forum will not manufacture companies, reviews, or activity to make a new marketplace look populated.</p><a className="buttonLink" href="#apply">Apply for the directory</a></div>
        )}
      </section>

      <section id="apply" className="section commerceSplit">
        <div><span className="kicker">SELL TO THIS MARKET</span><h2>Apply for a vendor profile</h2><p>Tell us what you sell and where you operate. Approval is editorial; commercial plan selection controls placement and lead tools, not what members can say about your company.</p>{params.applied === "1" && <p className="successNotice">Application received.</p>}</div>
        <form className="commerceForm" action="/api/vendor-applications" method="post">
          <label>Company<input name="company_name" required maxLength={120} /></label>
          <label>Website<input name="website" type="url" placeholder="https://" /></label>
          <label>Your name<input name="contact_name" required maxLength={120} /></label>
          <label>Work email<input name="contact_email" type="email" required /></label>
          <label>Main category<select name="category" required defaultValue=""><option value="" disabled>Select one</option>{vendorCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Plan<select name="requested_plan" defaultValue="vendor">{foundingPlans.map((plan) => <option key={plan.name} value={plan.name === "Vendor" ? "vendor" : plan.name === "Featured Vendor" ? "featured" : "founding_partner"}>{plan.name} — {plan.price}</option>)}</select></label>
          <label>What do you sell?<textarea name="notes" required minLength={10} maxLength={2000} /></label>
          <button type="submit">Submit application</button>
        </form>
      </section>
    </main>
  );
}
