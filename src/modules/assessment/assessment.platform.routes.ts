import { Router } from "express";

import { env } from "../../config/env.js";
import { absoluteUrl } from "./assessment.seo.js";

export const assessmentPlatformRouter = Router();

assessmentPlatformRouter.get("/robots.txt", (_req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: ${absoluteUrl(env.siteUrl, "/sitemap.xml")}
`);
});

assessmentPlatformRouter.get("/sitemap.xml", (_req, res) => {
  const urls = [
    {
      loc: absoluteUrl(env.siteUrl, "/"),
      changefreq: "weekly",
      priority: "1.0"
    },
    {
      loc: absoluteUrl(env.siteUrl, "/onboarding"),
      changefreq: "weekly",
      priority: "0.8"
    }
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.type("application/xml");
  res.send(body);
});
