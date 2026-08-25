export const vendorCategories = [
  "Commissioning",
  "Electrical Contractors",
  "Mechanical Contractors",
  "Generators & Backup Power",
  "UPS & Batteries",
  "Liquid Cooling",
  "Transformers & Switchgear",
  "Fiber & Connectivity",
  "DCIM & BMS",
  "Engineering & Design",
  "Site Selection",
  "Recruiting & Staffing",
  "Security",
  "Maintenance & Service",
  "Brokerage & Advisory"
] as const;

export const foundingPlans = [
  {
    name: "Vendor",
    price: "$99/mo",
    description: "Verified directory presence for companies serving the data-center market.",
    features: ["Verified vendor profile", "Category placement", "Website link", "Lead request inbox"]
  },
  {
    name: "Featured Vendor",
    price: "$299/mo",
    description: "Higher visibility for vendors actively building pipeline.",
    features: ["Everything in Vendor", "Featured placement", "Priority category position", "Lead analytics"]
  },
  {
    name: "Founding Partner",
    price: "$1,500 / 90 days",
    description: "Limited launch package for the first 20 commercial partners.",
    features: ["Founding Partner badge", "Homepage rotation", "One disclosed AMA or sponsored question", "Newsletter inclusion", "Early buyer-intent access", "Preferred renewal rate"]
  }
] as const;

export const jobPlans = [
  { name: "Standard job", price: "$149", detail: "30-day listing" },
  { name: "Featured job", price: "$299", detail: "30-day featured listing" },
  { name: "Recruiter Unlimited", price: "$499/mo", detail: "Unlimited active listings" }
] as const;

export const sponsorshipPlans = [
  { name: "Category Sponsor", price: "$1,000–$2,500/mo" },
  { name: "Sponsored Briefing", price: "$1,500–$5,000" },
  { name: "Research / Data Partner", price: "Custom" }
] as const;
