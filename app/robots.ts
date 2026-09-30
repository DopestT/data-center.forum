import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"]
    },
    sitemap: "https://datacenter.forum/sitemap.xml",
    host: "https://datacenter.forum"
  };
}
