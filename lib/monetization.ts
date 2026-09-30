export const checkoutLinks = {
  pro: "https://buy.stripe.com/3cI7sL7Rp4jyad08e1dZ60a",
  featuredCompany: "https://buy.stripe.com/14A4gz1t12bqdpc79XdZ60b"
} as const;

export const companyPlans = [
  {
    name: "Directory",
    price: "Free",
    description: "A reviewed public company profile.",
    features: ["Company profile", "Category placement", "Website link", "Eligible for verification"]
  },
  {
    name: "Featured Company",
    price: "$99/mo",
    description: "Clearly labeled priority discovery for companies serving the data-center market.",
    features: ["Everything in Directory", "Priority discovery placement", "Featured badge", "Buyer-facing visibility"]
  }
] as const;

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
