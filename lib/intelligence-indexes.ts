import projects from "../data/projects.json";
import type { IntelProject } from "./intelligence";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
] as const;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function primaryCompany(company: string) {
  return company.split("/")[0].trim();
}

export function projectState(region: string) {
  return US_STATES.find((state) => region.toLowerCase().includes(state.toLowerCase())) ?? null;
}

export const canonicalProjects = projects as IntelProject[];

export const operatorPages = Array.from(
  new Map(
    canonicalProjects.map((project) => {
      const name = primaryCompany(project.company);
      return [slugify(name), { slug: slugify(name), name }];
    })
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

export const marketPages = US_STATES
  .filter((state) => canonicalProjects.some((project) => projectState(project.region) === state))
  .map((state) => ({ slug: slugify(state), name: state }));

export function projectsForOperator(slug: string) {
  return canonicalProjects.filter((project) => slugify(primaryCompany(project.company)) === slug);
}

export function projectsForMarket(slug: string) {
  return canonicalProjects.filter((project) => {
    const state = projectState(project.region);
    return state ? slugify(state) === slug : false;
  });
}

export function knownCapacity(projects: IntelProject[]) {
  return projects.reduce((sum, project) => sum + (project.announced_capacity_mw ?? 0), 0);
}
