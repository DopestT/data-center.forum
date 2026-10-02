import locationEvidence from "../data/project-location-evidence.json";

type LocationEvidence = {
  precision: string;
  areas: string[];
  source_url: string;
  note: string;
  exact_site_verified: boolean;
};

// Apply evidence only while the serving record uses the reviewed source.
export function getLocationEvidence(slug: string, sourceUrl: string): LocationEvidence | null {
  const evidence = (locationEvidence as Record<string, LocationEvidence>)[slug];
  return evidence?.source_url === sourceUrl ? evidence : null;
}
