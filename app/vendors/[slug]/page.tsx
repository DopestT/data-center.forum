import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type Vendor = {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  description: string;
  categories: string[];
  regions: string[];
  plan: string;
  is_verified: boolean;
  is_founding_partner: boolean;
};

async function getVendor(slug: string): Promise<Vendor | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("vendors").select("id,slug,name,website,description,categories,regions,plan,is_verified,is_founding_partner").eq("slug", slug).eq("status", "approved").maybeSingle();
    return data as Vendor | null;
  } catch {
    return null;
  }
}

export default async function VendorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const vendor = await getVendor(slug);
  if (!vendor) notFound();

  return (
    <main>
      <header className="topbar"><Link className="brand" href="/">DataCenter<span>.forum</span></Link><nav><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/partners">Partners</Link></nav></header>
      <section className="commerceHero vendorProfileHero">
        <div className="vendorBadges">{vendor.is_verified && <span>VERIFIED</span>}{vendor.is_founding_partner && <span>FOUNDING PARTNER</span>}</div>
        <h1>{vendor.name}</h1>
        <p>{vendor.description}</p>
        <div className="chipRow">{vendor.categories.map((category) => <span key={category}>{category}</span>)}</div>
        {vendor.website && <a href={vendor.website} rel="noreferrer" target="_blank">Visit company website ↗</a>}
      </section>
      <section className="section commerceSplit">
        <div><span className="kicker">BUYER INTRODUCTION</span><h2>Request contact</h2><p>Your contact information is not sold or exposed publicly. Submit a specific need and DataCenter.forum can route the introduction to this vendor.</p>{query.sent === "1" && <p className="successNotice">Request sent.</p>}</div>
        <form className="commerceForm" action="/api/vendor-leads" method="post">
          <input type="hidden" name="vendor_id" value={vendor.id} /><input type="hidden" name="vendor_slug" value={vendor.slug} />
          <label>Your name<input name="requester_name" required maxLength={120} /></label>
          <label>Work email<input name="requester_email" type="email" required /></label>
          <label>Company<input name="requester_company" maxLength={160} /></label>
          <label>What do you need?<textarea name="need" required minLength={10} maxLength={5000} /></label>
          <label className="checkLabel"><input name="consent_to_intro" type="checkbox" value="yes" required /> I want DataCenter.forum to share this request with {vendor.name}.</label>
          <button type="submit">Request introduction</button>
        </form>
      </section>
    </main>
  );
}
