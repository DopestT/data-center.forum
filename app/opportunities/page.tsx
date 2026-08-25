import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { vendorCategories } from "../../lib/monetization";

type Opportunity = { id:string; title:string; category:string; region:string|null; timeline:string|null; need:string; is_verified:boolean; created_at:string };
async function getOpportunities(): Promise<Opportunity[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("opportunities").select("id,title,category,region,timeline,need,is_verified,created_at").eq("is_public",true).eq("status","open").order("created_at",{ascending:false});
    return (data ?? []) as Opportunity[];
  } catch { return []; }
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const [opportunities, query] = await Promise.all([getOpportunities(), searchParams]);
  return <main>
    <header className="topbar"><Link className="brand" href="/">DataCenter<span>.forum</span></Link><nav><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/partners">Partners</Link></nav></header>
    <section className="commerceHero"><span className="kicker">DCF OPPORTUNITIES</span><h1>Turn specific industry needs into qualified introductions.</h1><p>Buyers describe the requirement. DataCenter.forum verifies and routes it. Contact information remains private until the buyer explicitly consents to an introduction.</p><div className="heroActions"><a className="buttonLink" href="#submit">Submit a need</a><Link href="/vendors">Browse vendors →</Link></div></section>
    <section className="section compactSection"><div className="metricStrip"><div><strong>Buyer controlled</strong><span>identity sharing</span></div><div><strong>Verified</strong><span>before paid routing</span></div><div><strong>Specific</strong><span>category + region + timeline</span></div><div><strong>No resale</strong><span>of private member data</span></div></div></section>
    <section className="section darkSection"><div className="sectionHead"><div><span className="kicker">OPEN NEEDS</span><h2>Verified opportunities</h2></div><span className="mutedText">{opportunities.length} public</span></div>{opportunities.length ? <div className="opportunityGrid">{opportunities.map(item => <article className="opportunityCard" key={item.id}><div className="vendorBadges">{item.is_verified && <span>VERIFIED</span>}<span>{item.category}</span></div><h3>{item.title}</h3><p>{item.need}</p><div className="opportunityMeta"><span>{item.region || "Region withheld"}</span><span>{item.timeline || "Timeline withheld"}</span></div></article>)}</div> : <div className="emptyState"><span className="kicker">BUYER INTAKE OPEN</span><h3>No opportunity has been published yet.</h3><p>Submitted needs stay private until reviewed and explicitly approved for publication. Qualified matching can still happen privately.</p><a className="buttonLink" href="#submit">Submit a requirement</a></div>}</section>
    <section id="submit" className="section commerceSplit"><div><span className="kicker">BUYER REQUEST</span><h2>What do you need?</h2><p>Use this for real requirements: commissioning, transformers, cooling, fiber, staffing, engineering, site selection, maintenance, or other data-center work.</p>{query.submitted === "1" && <p className="successNotice">Requirement received for review.</p>}</div><form className="commerceForm" action="/api/opportunity-submissions" method="post"><label>Your name<input name="buyer_name" required /></label><label>Work email<input name="buyer_email" type="email" required /></label><label>Company<input name="buyer_company" /></label><label>Short title<input name="title" required maxLength={180} /></label><label>Category<select name="category" required defaultValue=""><option value="" disabled>Select one</option>{vendorCategories.map(category => <option key={category}>{category}</option>)}</select></label><label>Region<input name="region" placeholder="Northern Virginia" /></label><label>Timeline<input name="timeline" placeholder="Q2 2027" /></label><label>Requirement<textarea name="need" minLength={20} maxLength={10000} required /></label><label className="checkLabel"><input name="consent_to_matching" type="checkbox" value="yes" required /> I want DataCenter.forum to review this request and contact me about qualified matches.</label><button type="submit">Submit requirement</button></form></section>
  </main>;
}
