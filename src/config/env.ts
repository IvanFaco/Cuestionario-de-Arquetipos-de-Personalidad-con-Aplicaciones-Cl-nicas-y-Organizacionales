const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const nodeEnv = process.env.NODE_ENV ?? "development";
const assetVersion =
  process.env.ASSET_VERSION ??
  process.env.SOURCE_COMMIT ??
  process.env.COOLIFY_RESOURCE_UUID ??
  (nodeEnv === "production" ? `${Date.now()}` : "dev");
const normalizedPort = Number.isNaN(port) ? 3000 : port;

export const env = {
  nodeEnv,
  port: normalizedPort,
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  assetVersion,
  siteUrl: process.env.SITE_URL ?? `http://localhost:${normalizedPort}`
};
