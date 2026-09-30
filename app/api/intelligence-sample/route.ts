import projects from "../../../data/projects.json";

const SAMPLE_SLUGS = [
  "meta-hyperion-richland-parish",
  "openai-the-barn-saline-michigan",
  "meta-el-paso-1gw",
  "microsoft-fairwater-mount-pleasant",
  "aws-pennsylvania-ai-campuses"
];

function csv(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
  const headers = [
    "name",
    "company",
    "market",
    "region",
    "stage",
    "announced_capacity_mw",
    "investment_label",
    "source_name",
    "source_url",
    "last_verified_at"
  ];

  const sample = SAMPLE_SLUGS
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter(Boolean);

  const rows = sample.map((project) => [
    project!.name,
    project!.company,
    project!.market,
    project!.region,
    project!.stage,
    project!.announced_capacity_mw,
    project!.investment_label,
    project!.source_name,
    project!.source_url,
    project!.last_verified_at
  ]);

  const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n") + "\n";

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="datacenter-forum-intelligence-sample.csv"',
      "cache-control": "public, max-age=3600"
    }
  });
}
