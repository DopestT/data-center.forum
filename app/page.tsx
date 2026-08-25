import Link from "next/link";

const categories = [
  ["Power & Electrical", "Utility feed to the rack PDU. UPS, generators, switchgear, distribution and testing."],
  ["Cooling & Thermal", "Air, water, refrigerant, and everything moving heat off a chip."],
  ["Network & Cabling", "Structured cabling, optics, cross-connects, and interconnection between sites."],
  ["Construction & Commissioning", "Design, build, Cx levels, integrated systems testing and turnover."],
  ["Operations & Incidents", "Procedures, change control, postmortems, staffing and capacity."],
  ["Siting, Permitting & Community", "Land, power, water, zoning, hearings, and the people who live next door."],
  ["Careers & Pay", "Getting in, moving up, what it pays, and what it costs you."],
  ["Vendors & Procurement", "Lead times, contracts, lock-in, spares, and dealing with sales."],
  ["The Floor", "Introductions, forum business, and everything that does not fit above."]
];

const threads = [
  ["Power & Electrical", "Lithium versus VRLA, five years on: has the maintenance story actually played out?"],
  ["Cooling & Thermal", "Direct-to-chip liquid: what changed on your floor that the vendor slides did not mention?"],
  ["Construction & Commissioning", "When the schedule slips, which commissioning level gets compressed first?"],
  ["Operations & Incidents", "Human error is not a root cause. So why does it keep showing up as one?"],
  ["Careers & Pay", "The pay thread: post your role, region, years, and total comp"],
  ["Vendors & Procurement", "Current lead times: transformers, switchgear, gensets, chillers. What are you quoting today?"]
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/">DataCenter<span>.forum</span></Link>
        <nav><a href="#forums">Forums</a><Link href="/vendors">Vendors</Link><Link href="/jobs">Jobs</Link><Link href="/opportunities">Opportunities</Link><Link href="/partners">Partners</Link></nav>
      </header>
      <section className="hero">
        <div className="eyebrow">INDEPENDENT DATA CENTER INTELLIGENCE</div>
        <h1>The industry talks here.</h1>
        <p>Power. Cooling. Network. Construction. Operations. Siting. Careers. Procurement. One focused network for the people building and running physical digital infrastructure.</p>
        <div className="heroActions"><a className="buttonLink" href="#latest">Browse discussions</a><Link href="/vendors">Find a vendor →</Link></div>
        <div className="signals"><span>STAFF seed posts are labeled</span><span>Source-linked</span><span>No fabricated members</span></div>
      </section>
      <section id="forums" className="section">
        <div className="sectionHead"><div><span className="kicker">FORUMS</span><h2>Where the market gets specific</h2></div></div>
        <div className="categoryGrid">{categories.map(([name,description]) => <article className="card" key={name}><h3>{name}</h3><p>{description}</p><span>Open forum →</span></article>)}</div>
      </section>
      <section id="latest" className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">STAFF-OPENED DISCUSSIONS</span><h2>Questions for practitioners</h2></div></div>
        <div className="threadList">{threads.map(([category,title]) => <article className="thread" key={title}><div><span className="tag">{category}</span><h3>{title}</h3><p>Opened by DCF Desk · STAFF / Editorial</p></div><span className="activity">Members answer</span></article>)}</div>
      </section>
      <section className="section intel">
        <span className="kicker">COMMERCIAL LAYER</span><h2>Useful conversation creates useful markets.</h2>
        <p>Vendors can earn verified visibility, employers can reach specialist talent, sponsors can buy clearly disclosed industry inventory, and buyers can request qualified introductions without DataCenter.forum selling private member data.</p>
        <div className="heroActions"><Link className="buttonLink" href="/vendors">Vendor marketplace</Link><Link href="/advertise">Commercial programs →</Link></div>
      </section>
      <footer><span>DataCenter.forum</span><span>Independent infrastructure intelligence.</span></footer>
    </main>
  );
}
