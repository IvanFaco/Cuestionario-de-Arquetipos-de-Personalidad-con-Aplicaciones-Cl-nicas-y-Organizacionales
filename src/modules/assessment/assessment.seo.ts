export type SeoMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  ogType?: "website" | "article";
};

function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const normalizedSiteUrl = trimSlash(siteUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedSiteUrl}${normalizedPath}`;
}

export function buildSeoMeta(input: SeoMeta, siteUrl: string) {
  return {
    ...input,
    robots: input.robots ?? "index,follow",
    ogType: input.ogType ?? "website",
    canonicalUrl: absoluteUrl(siteUrl, input.canonicalPath)
  };
}
