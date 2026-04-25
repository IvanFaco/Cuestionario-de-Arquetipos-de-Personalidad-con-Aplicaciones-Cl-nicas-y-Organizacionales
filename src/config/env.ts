const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const nodeEnv = process.env.NODE_ENV ?? "development";
const assetVersion =
  process.env.ASSET_VERSION ??
  process.env.SOURCE_COMMIT ??
  process.env.COOLIFY_RESOURCE_UUID ??
  (nodeEnv === "production" ? `${Date.now()}` : "dev");
const normalizedPort = Number.isNaN(port) ? 3000 : port;
const premiumAmountInCents = Number.parseInt(process.env.WOMPI_PREMIUM_AMOUNT_CENTS ?? "4900000", 10);

export const env = {
  nodeEnv,
  port: normalizedPort,
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  assetVersion,
  siteUrl: process.env.SITE_URL ?? `http://localhost:${normalizedPort}`,
  databaseProvider: process.env.DATABASE_PROVIDER ?? "sqlite",
  sqlitePath: process.env.SQLITE_PATH ?? "data/mirealyo.sqlite",
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY ?? "",
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET ?? "",
    eventsSecret: process.env.WOMPI_EVENTS_SECRET ?? "",
    environment: process.env.WOMPI_ENV ?? "sandbox",
    premiumAmountInCents: Number.isNaN(premiumAmountInCents) ? 4900000 : premiumAmountInCents,
    currency: process.env.WOMPI_CURRENCY ?? "COP"
  }
};
