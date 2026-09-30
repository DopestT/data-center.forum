import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projects = JSON.parse(fs.readFileSync(path.join(here, "../data/projects.json"), "utf8"));
const graph = JSON.parse(fs.readFileSync(path.join(here, "../data/project-graph.json"), "utf8"));

function csv(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function flattenParticipants(slug) {
  return (graph[slug]?.participants ?? []).map((item) => `${item.name} [${item.role}]`).join("; ");
}

function flattenFacts(slug, category) {
  return (graph[slug]?.facts ?? [])
    .filter((item) => !category || item.category.toLowerCase() === category.toLowerCase())
    .map((item) => `${item.label}: ${item.value}`)
    .join("; ");
}

function latestEvent(slug) {
  const events = [...(graph[slug]?.events ?? [])].sort((a,b) => String(b.date).localeCompare(String(a.date)));
  return events[0] ?? null;
}

const headers = [
  "slug","name","company","market","region","country","stage","announced_capacity_mw","investment_label","investment_usd","investment_basis","investment_scope",
  "summary","source_name","source_url","source_published_at","last_verified_at","participant_count","participants",
  "power_signals","cooling_signals","event_count","latest_event_date","latest_event_type","latest_event_headline"
];

const rows = projects.map((project) => {
  const projectGraph = graph[project.slug] ?? { participants: [], facts: [], events: [] };
  const event = latestEvent(project.slug);
  return [
    project.slug,project.name,project.company,project.market,project.region,project.country,project.stage,
    project.announced_capacity_mw,project.investment_label,project.investment_usd,project.investment_basis,project.investment_scope,project.summary,project.source_name,project.source_url,
    project.source_published_at,project.last_verified_at,projectGraph.participants.length,flattenParticipants(project.slug),
    flattenFacts(project.slug,"Power"),flattenFacts(project.slug,"Cooling"),projectGraph.events.length,
    event?.date ?? "",event?.type ?? "",event?.headline ?? ""
  ];
});

const output = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n") + "\n";
const target = process.argv[2];

if (target) {
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, output);
  console.error(`Exported ${projects.length} projects to ${target}`);
} else {
  process.stdout.write(output);
}
