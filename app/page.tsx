const categories = [
  ["Power & Grid", "Interconnection queues, PPAs, nuclear, gas, storage and utility strategy."],
  ["Development", "Site selection, entitlement, land, zoning, incentives and project pipelines."],
  ["Construction", "EPC, equipment lead times, commissioning, cooling and delivery risk."],
  ["Operations", "Reliability, staffing, maintenance, energy efficiency and incident lessons."],
  ["AI Infrastructure", "GPU clusters, high-density racks, liquid cooling and next-gen capacity."],
  ["Deals & Finance", "M&A, capital markets, valuations, leases and hyperscale economics."],
  ["Policy & Communities", "Regulation, taxes, water, local politics and community impact."],
  ["Jobs & Vendors", "Hiring, careers, contractors, suppliers, products and services."]
];

const threads = [
  ["Power & Grid", "What is actually moving interconnection timelines in 2026?", "GridWatcher"],
  ["AI Infrastructure", "120 kW racks: what is ready today versus still a roadmap?", "ThermalOps"],
  ["Development", "Virginia, Texas, Ohio: where are land assumptions breaking first?", "SiteStack"],
  ["Deals & Finance", "Are powered-shell valuations still disconnected from delivery risk?", "CapRateDC"],
  ["Construction", "Transformer lead times: what are buyers seeing this quarter?", "BuildCritical"],
  ["Policy & Communities", "How should developers answer the 'who pays for the grid' question?", "CivicInfra"]
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">DataCenter<span>.forum</span></a>
        <nav>
          <a href="#forums">Forums</a>
          <a href="#latest">Latest</a>
          <a href="#intel">Intel</a>
          <button>Join the forum</button>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">INDEPENDENT DATA CENTER INTELLIGENCE</div>
        <h1>The industry talks here.</h1>
        <p>Power. Projects. Capital. Construction. Operations. Policy. One focused network for the people building the physical infrastructure behind AI and the cloud.</p>
        <div className="heroActions"><button>Browse discussions</button><a href="#forums">Explore sectors →</a></div>
        <div className="signals"><span>Operator-led</span><span>Source-linked</span><span>No generic tech noise</span></div>
      </section>

      <section id="forums" className="section">
        <div className="sectionHead"><div><span className="kicker">FORUMS</span><h2>Where the market gets specific</h2></div><a href="#">View all forums →</a></div>
        <div className="categoryGrid">
          {categories.map(([name, description]) => <article className="card" key={name}><h3>{name}</h3><p>{description}</p><span>Open forum →</span></article>)}
        </div>
      </section>

      <section id="latest" className="section darkSection">
        <div className="sectionHead"><div><span className="kicker">LIVE DISCUSSIONS</span><h2>What the industry is debating</h2></div></div>
        <div className="threadList">
          {threads.map(([category, title, author]) => <article className="thread" key={title}><div><span className="tag">{category}</span><h3>{title}</h3><p>Started by {author}</p></div><span className="activity">Active now</span></article>)}
        </div>
      </section>

      <section id="intel" className="section intel">
        <span className="kicker">BUILT TO MONETIZE WITHOUT RUINING THE FORUM</span>
        <h2>Community first. Commercial intelligence second.</h2>
        <p>The product foundation supports premium industry research, verified vendor profiles, sponsored intelligence, recruiting, qualified project leads and eventually structured facility/project data—without turning every thread into an ad.</p>
      </section>

      <footer><span>DataCenter.forum</span><span>Independent infrastructure intelligence.</span></footer>
    </main>
  );
}
