export type ProjectParticipant = {
  name: string;
  role: string;
  note: string;
  sourceName: string;
  sourceUrl: string;
};

export type ProjectFact = {
  category: string;
  label: string;
  value: string;
  sourceName: string;
  sourceUrl: string;
};

export type ProjectEvent = {
  date: string;
  type: string;
  headline: string;
  summary: string;
  materiality: "low" | "medium" | "high";
  sourceName: string;
  sourceUrl: string;
};

export type ProjectGraph = {
  participants: ProjectParticipant[];
  facts: ProjectFact[];
  events: ProjectEvent[];
};

export const fallbackGraph: Record<string, ProjectGraph> = {
  "meta-hyperion-richland-parish": {
    participants: [
      { name: "Entergy Louisiana", role: "Utility / power partner", note: "Meta says its Entergy agreement funds major generation, storage and grid resources.", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" },
      { name: "Turner Construction", role: "General contractor", note: "Named by Meta as a general contracting partner in Richland Parish.", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" },
      { name: "DPR Construction", role: "General contractor", note: "Named by Meta as a general contracting partner in Richland Parish.", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" }
    ],
    facts: [
      { category: "Power", label: "Generation plan", value: "Seven new natural-gas generating plants plus nuclear uprates and purchased power", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" },
      { category: "Power", label: "Grid batteries", value: "3 grid-scale batteries", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" },
      { category: "Power", label: "Clean-energy support", value: "Up to 2.5 GW of clean and renewable generation support", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" },
      { category: "Commercial", label: "Louisiana contracting", value: "$1.6B+ contracted with Louisiana businesses", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" }
    ],
    events: [
      { date: "2026-07-13", type: "Capacity expansion", headline: "Meta expands Richland Parish to 5 GW", summary: "Meta said the campus will expand to 5 GW of compute capacity with investment exceeding $50B.", materiality: "high", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/" }
    ]
  },
  "meta-el-paso-1gw": {
    participants: [
      { name: "JE Dunn Construction", role: "General contractor", note: "Meta directs construction information and opportunities to JE Dunn.", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/" },
      { name: "Hensel Phelps", role: "General contractor", note: "Meta directs construction information and opportunities to Hensel Phelps.", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/" }
    ],
    facts: [],
    events: [
      { date: "2026-03-26", type: "Capacity expansion", headline: "Meta confirms El Paso will grow to 1 GW", summary: "Meta increased planned investment to more than $10B and confirmed the 1 GW buildout.", materiality: "high", sourceName: "Meta Data Centers", sourceUrl: "https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/" }
    ]
  },
  "openai-the-barn-saline-michigan": {
    participants: [
      { name: "Oracle", role: "Technology partner", note: "Named by OpenAI as a project partner.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-michigan-data-center/" },
      { name: "Related Digital", role: "Developer", note: "Named by OpenAI as a project partner and developer.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-michigan-data-center/" },
      { name: "Walbridge", role: "Construction partner", note: "Named by OpenAI at the project groundbreaking.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-michigan-data-center/" },
      { name: "DTE Energy", role: "Utility", note: "OpenAI says DTE Energy will supply the project using existing resources augmented by project-financed battery storage.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-community/" }
    ],
    facts: [
      { category: "Power", label: "Supply plan", value: "Existing DTE resources plus new project-financed battery storage", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-community/" },
      { category: "Cooling", label: "Cooling system", value: "Closed-loop cooling system", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-michigan-data-center/" }
    ],
    events: [
      { date: "2026-06-01", type: "Construction", headline: "The Barn breaks ground", summary: "OpenAI and partners broke ground on the 1 GW Saline, Michigan campus.", materiality: "high", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-michigan-data-center/" }
    ]
  },
  "openai-stargate-milam-county-1-2gw": {
    participants: [
      { name: "SB Energy", role: "Developer / operator", note: "Selected by OpenAI to build and operate the 1.2 GW site.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-sb-energy-partnership/" },
      { name: "SoftBank Group", role: "Investor", note: "SoftBank Group and OpenAI each announced a $500M investment into SB Energy.", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-sb-energy-partnership/" }
    ],
    facts: [
      { category: "Power", label: "Supply plan", value: "SB Energy plans new generation and storage to supply the majority of campus power", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-community/" }
    ],
    events: [
      { date: "2026-01-09", type: "Partner", headline: "SB Energy selected to build and operate Milam County", summary: "OpenAI said SB Energy will build and operate the 1.2 GW Milam County Stargate site.", materiality: "high", sourceName: "OpenAI", sourceUrl: "https://openai.com/index/stargate-sb-energy-partnership/" }
    ]
  }
};

export function getFallbackProjectGraph(slug: string): ProjectGraph {
  return fallbackGraph[slug] ?? { participants: [], facts: [], events: [] };
}
