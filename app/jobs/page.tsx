import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { jobPlans } from "../../lib/monetization";

type Job = { id:string; slug:string; company_name:string; title:string; location:string|null; compensation:string|null; employer_type:string|null; description:string; apply_url:string; plan:string; published_at:string|null };

async function getJobs(): Promise<Job[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("jobs").select("id,slug,company_name,title,location,compensation,employer_type,description,apply_url,plan,published_at").eq("status","published").order("plan",{ascending:true}).order("published_at",{ascending:false});
    return (data ?? []) as Job[];
  } catch { return []; }
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const [jobs, query] = await Promise.all([getJobs(), searchParams]);
  return <main>
    <header className="topbar"><Link className="brand" href="/">DataCenter<span>.forum</span></Link><nav><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/partners">Partners</Link></nav></header>
    <section className="commerceHero"><span className="kicker">DATA CENTER CAREERS</span><h1>Jobs for people who keep critical infrastructure running.</h1><p>Operators, technicians, commissioning, controls, power, cooling, networking, construction and commercial roles. No generic tech-job flood.</p><div className="heroActions"><a className="buttonLink" href="#post">Post a job</a><a href="#openings">Browse openings →</a></div></section>
    <section className="section compactSection"><div className="pricingGrid">{jobPlans.map(plan => <article className="priceCard" key={plan.name}><span>{plan.name}</span><h3>{plan.price}</h3><p>{plan.detail}</p></article>)}</div></section>
    <section id="openings" className="section darkSection"><div className="sectionHead"><div><span className="kicker">OPEN ROLES</span><h2>Current listings</h2></div><span className="mutedText">{jobs.length} live</span></div>{jobs.length ? <div className="jobList">{jobs.map(job => <article className={`jobCard ${job.plan === "featured" ? "featuredJob" : ""}`} key={job.id}><div><div className="vendorBadges">{job.plan === "featured" && <span>FEATURED</span>}{job.employer_type && <span>{job.employer_type}</span>}</div><h3>{job.title}</h3><p>{job.company_name}{job.location ? ` · ${job.location}` : ""}</p>{job.compensation && <strong>{job.compensation}</strong>}</div><a className="buttonLink secondaryButton" href={job.apply_url} target="_blank" rel="noreferrer">Apply ↗</a></article>)}</div> : <div className="emptyState"><span className="kicker">EMPLOYER INVENTORY OPEN</span><h3>No job has been published yet.</h3><p>The first listings will be real paid or approved openings only.</p><a className="buttonLink" href="#post">Post the first job</a></div>}</section>
    <section id="post" className="section commerceSplit"><div><span className="kicker">EMPLOYERS & RECRUITERS</span><h2>Post a data-center role</h2><p>Submit the actual role first. We review it before billing or publishing so the jobs section stays specific to the industry.</p>{query.submitted === "1" && <p className="successNotice">Job submitted for review.</p>}</div><form className="commerceForm" action="/api/job-postings" method="post"><label>Company<input name="company_name" required /></label><label>Your name<input name="contact_name" required /></label><label>Work email<input name="contact_email" type="email" required /></label><label>Job title<input name="title" required /></label><label>Location<input name="location" /></label><label>Compensation<input name="compensation" placeholder="$90k–$120k + bonus" /></label><label>Apply URL<input name="apply_url" type="url" /></label><label>Plan<select name="requested_plan" defaultValue="standard">{jobPlans.map((plan,i)=><option key={plan.name} value={i===0?"standard":i===1?"featured":"unlimited"}>{plan.name} — {plan.price}</option>)}</select></label><label>Role description<textarea name="description" minLength={20} maxLength={10000} required /></label><button type="submit">Submit role</button></form></section>
  </main>;
}
