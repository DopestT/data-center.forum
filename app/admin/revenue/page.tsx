import Link from "next/link";
import { requireRevenueAdmin } from "../../../lib/admin";
import {
  approveVendorApplication,
  createSponsoredPlacement,
  publishJobRequest,
  publishOpportunity,
  setVendorVerification,
  updateRevenueStatus,
} from "./actions";

type Row = Record<string, any>;

async function loadDashboard() {
  const { supabase, profile } = await requireRevenueAdmin();

  const [
    vendorApps, leads, sponsors, jobRequests, opportunityRequests, vendors, sponsored,
    vendorAppCount, leadCount, sponsorCount, jobCount, opportunityCount,
  ] = await Promise.all([
    supabase.from("vendor_applications").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("vendor_leads").select("*,vendors(name)").order("created_at", { ascending: false }).limit(12),
    supabase.from("sponsorship_inquiries").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("job_posting_requests").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("opportunity_submissions").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("vendors").select("id,name,slug,plan,status,is_verified,is_founding_partner,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("sponsored_content").select("*").order("created_at", { ascending: false }).limit(12),
    supabase.from("vendor_applications").select("id", { count: "exact", head: true }).in("status", ["new", "contacted"]),
    supabase.from("vendor_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("sponsorship_inquiries").select("id", { count: "exact", head: true }).in("status", ["new", "contacted", "proposal"]),
    supabase.from("job_posting_requests").select("id", { count: "exact", head: true }).in("status", ["new", "contacted", "approved"]),
    supabase.from("opportunity_submissions").select("id", { count: "exact", head: true }).in("status", ["new", "qualified"]),
  ]);

  return {
    profile,
    vendorApps: (vendorApps.data ?? []) as Row[],
    leads: (leads.data ?? []) as Row[],
    sponsors: (sponsors.data ?? []) as Row[],
    jobRequests: (jobRequests.data ?? []) as Row[],
    opportunityRequests: (opportunityRequests.data ?? []) as Row[],
    vendors: (vendors.data ?? []) as Row[],
    sponsored: (sponsored.data ?? []) as Row[],
    metrics: {
      vendorApps: vendorAppCount.count ?? 0,
      leads: leadCount.count ?? 0,
      sponsors: sponsorCount.count ?? 0,
      jobs: jobCount.count ?? 0,
      opportunities: opportunityCount.count ?? 0,
    },
  };
}

function StatusForm({ table, id, options }: { table: string; id: string; options: string[] }) {
  return <form action={updateRevenueStatus} className="inlineAdminForm">
    <input type="hidden" name="table" value={table} />
    <input type="hidden" name="id" value={id} />
    <select name="status" defaultValue={options[0]}>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
    <button type="submit" className="smallButton">Update</button>
  </form>;
}

export default async function RevenueAdminPage() {
  let dashboard;
  try { dashboard = await loadDashboard(); }
  catch {
    return <main className="adminShell"><section className="adminGate"><span className="kicker">REVENUE OPS</span><h1>Admin access required.</h1><p>Sign in with a moderator or admin account to operate vendor, jobs, sponsorship and lead workflows.</p><Link className="buttonLink" href="/">Back to DataCenter.forum</Link></section></main>;
  }

  const { profile, metrics, vendorApps, leads, sponsors, jobRequests, opportunityRequests, vendors, sponsored } = dashboard;

  return <main className="adminShell">
    <header className="topbar"><Link className="brand" href="/">DataCenter<span>.forum</span></Link><nav><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/opportunities">Opportunities</Link></nav></header>
    <section className="adminHero"><span className="kicker">REVENUE OPERATIONS</span><h1>Commercial control room.</h1><p>Signed in as {profile.display_name}. Private contact data stays here; public pages only show approved inventory.</p></section>

    <section className="adminMetrics">
      <article><strong>{metrics.vendorApps}</strong><span>vendor applications</span></article>
      <article><strong>{metrics.leads}</strong><span>new buyer leads</span></article>
      <article><strong>{metrics.sponsors}</strong><span>sponsor pipeline</span></article>
      <article><strong>{metrics.jobs}</strong><span>job requests</span></article>
      <article><strong>{metrics.opportunities}</strong><span>buyer opportunities</span></article>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">VENDOR PIPELINE</span><h2>Applications</h2></div></div>
      <div className="adminList">{vendorApps.length ? vendorApps.map(app => <article key={app.id} className="adminRow"><div><span className="statusChip">{app.status}</span><h3>{app.company_name}</h3><p>{app.contact_name} · {app.contact_email}</p><small>{app.requested_plan} · {(app.categories ?? []).join(", ") || "uncategorized"}</small></div><div className="adminActions"><form action={approveVendorApplication}><input type="hidden" name="id" value={app.id}/><button type="submit" className="smallButton">Approve + create vendor</button></form><StatusForm table="vendor_applications" id={app.id} options={["contacted","rejected","closed"]}/></div></article>) : <p className="mutedText">No applications yet.</p>}</div>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">VERIFICATION</span><h2>Approved vendors</h2></div></div>
      <div className="adminList">{vendors.length ? vendors.map(vendor => <article key={vendor.id} className="adminRow"><div><span className="statusChip">{vendor.is_verified ? "VERIFIED" : "UNVERIFIED"}</span><h3>{vendor.name}</h3><p>{vendor.plan} · {vendor.status}</p></div><form action={setVendorVerification} className="verificationForm"><input type="hidden" name="vendor_id" value={vendor.id}/><select name="check_type" defaultValue="website"><option value="website">website</option><option value="domain_email">domain email</option><option value="business_record">business record</option><option value="reference">reference</option><option value="manual">manual</option></select><select name="status" defaultValue="passed"><option value="passed">passed</option><option value="failed">failed</option><option value="pending">pending</option></select><input name="notes" placeholder="Private verification note"/><button type="submit" className="smallButton">Record check</button></form></article>) : <p className="mutedText">No approved vendors yet.</p>}</div>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">BUYER INTENT</span><h2>Vendor leads</h2></div></div>
      <div className="adminList">{leads.length ? leads.map(lead => <article key={lead.id} className="adminRow"><div><span className="statusChip">{lead.status}</span><h3>{lead.vendors?.name ?? "Vendor request"}</h3><p>{lead.requester_name}{lead.requester_company ? ` · ${lead.requester_company}` : ""} · {lead.requester_email}</p><small>{lead.need}</small></div><StatusForm table="vendor_leads" id={lead.id} options={["accepted","closed","spam"]}/></article>) : <p className="mutedText">No buyer introductions yet.</p>}</div>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">JOBS</span><h2>Posting requests</h2></div></div>
      <div className="adminList">{jobRequests.length ? jobRequests.map(job => <article key={job.id} className="adminRow"><div><span className="statusChip">{job.status}</span><h3>{job.title}</h3><p>{job.company_name} · {job.contact_email}</p><small>{job.requested_plan}{job.location ? ` · ${job.location}` : ""}{job.compensation ? ` · ${job.compensation}` : ""}</small></div><div className="adminActions">{job.apply_url && <form action={publishJobRequest}><input type="hidden" name="id" value={job.id}/><button type="submit" className="smallButton">Publish</button></form>}<StatusForm table="job_posting_requests" id={job.id} options={["contacted","approved","rejected","closed"]}/></div></article>) : <p className="mutedText">No job requests yet.</p>}</div>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">DCF OPPORTUNITIES</span><h2>Buyer submissions</h2></div></div>
      <div className="adminList">{opportunityRequests.length ? opportunityRequests.map(opp => <article key={opp.id} className="adminRow"><div><span className="statusChip">{opp.status}</span><h3>{opp.title}</h3><p>{opp.buyer_name}{opp.buyer_company ? ` · ${opp.buyer_company}` : ""} · {opp.buyer_email}</p><small>{opp.category}{opp.region ? ` · ${opp.region}` : ""} — {opp.need}</small></div><div className="adminActions"><form action={publishOpportunity} className="inlineAdminForm"><input type="hidden" name="id" value={opp.id}/><label className="checkLabel"><input type="checkbox" name="is_public" value="yes"/> Public</label><button type="submit" className="smallButton">Qualify</button></form><StatusForm table="opportunity_submissions" id={opp.id} options={["matched","rejected","closed"]}/></div></article>) : <p className="mutedText">No opportunities yet.</p>}</div>
    </section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">SPONSOR SALES</span><h2>Inquiries</h2></div></div>
      <div className="adminList">{sponsors.length ? sponsors.map(sponsor => <article key={sponsor.id} className="adminRow"><div><span className="statusChip">{sponsor.status}</span><h3>{sponsor.company_name}</h3><p>{sponsor.contact_name} · {sponsor.contact_email}</p><small>{sponsor.package || "Package not specified"}{sponsor.budget ? ` · ${sponsor.budget}` : ""}</small></div><StatusForm table="sponsorship_inquiries" id={sponsor.id} options={["contacted","proposal","won","lost","closed"]}/></article>) : <p className="mutedText">No sponsor inquiries yet.</p>}</div>
    </section>

    <section className="adminSection commerceSplit"><div><span className="kicker">DISCLOSURE CONTROL</span><h2>Create sponsored placement</h2><p>Every paid placement carries an explicit disclosure label. Commercial content never impersonates member or STAFF discussion.</p></div><form action={createSponsoredPlacement} className="commerceForm"><label>Sponsor<input name="sponsor_name" required/></label><label>Placement<input name="placement" placeholder="home-between-sections" required/></label><label>Headline<input name="headline" required/></label><label>Body<textarea name="body"/></label><label>Target URL<input name="target_url" type="url"/></label><label>Disclosure label<input name="disclosure_label" defaultValue="Sponsored" required/></label><button type="submit">Save as draft</button></form></section>

    <section className="adminSection"><div className="sectionHead"><div><span className="kicker">PAID INVENTORY</span><h2>Sponsored content</h2></div></div><div className="adminList">{sponsored.length ? sponsored.map(item => <article key={item.id} className="adminRow"><div><span className="statusChip">{item.disclosure_label} · {item.status}</span><h3>{item.headline}</h3><p>{item.sponsor_name} · {item.placement}</p></div><StatusForm table="sponsored_content" id={item.id} options={[item.status === "active" ? "paused" : "active","ended","draft"]}/></article>) : <p className="mutedText">No sponsored placements created.</p>}</div></section>
  </main>;
}
