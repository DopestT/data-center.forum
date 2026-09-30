import type { MetadataRoute } from "next";
import { fallbackProjects } from "../lib/intelligence";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://datacenter.forum";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/database`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/intelligence`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vendors`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/jobs`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/opportunities`, lastModified: now, changeFrequency: "weekly", priority: 0.6 }
  ];

  const projectRoutes: MetadataRoute.Sitemap = fallbackProjects.map((project) => ({
    url: `${base}/database/${project.slug}`,
    lastModified: new Date(project.last_verified_at),
    changeFrequency: "weekly",
    priority: 0.8
  }));

  return [...staticRoutes, ...projectRoutes];
}
