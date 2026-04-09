const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const nodeEnv = process.env.NODE_ENV ?? "development";
const assetVersion =
  process.env.ASSET_VERSION ??
  process.env.SOURCE_COMMIT ??
  process.env.COOLIFY_RESOURCE_UUID ??
  (nodeEnv === "production" ? `${Date.now()}` : "dev");

export const env = {
  nodeEnv,
  port: Number.isNaN(port) ? 3000 : port,
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  assetVersion
};
