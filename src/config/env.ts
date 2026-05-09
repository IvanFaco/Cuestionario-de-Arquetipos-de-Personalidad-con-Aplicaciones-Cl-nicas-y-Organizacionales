import fs from "node:fs";
import path from "node:path";

type EnvFileValues = Record<string, string>;

const packageJsonPath = path.join(process.cwd(), "package.json");
const envFilePath = path.join(process.cwd(), ".env");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
  version?: string;
};
const fileEnv = readEnvFile();
const getEnv = (key: string, fallback = "") => process.env[key] ?? fileEnv[key] ?? fallback;
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const nodeEnv = getEnv("NODE_ENV", "development");
const appVersion = getEnv("APP_VERSION", packageJson.version ?? "0.0.0");
const assetVersion =
  process.env.ASSET_VERSION ??
  process.env.SOURCE_COMMIT ??
  process.env.COOLIFY_RESOURCE_UUID ??
  (nodeEnv === "production" ? `${Date.now()}` : "dev");
const normalizedPort = Number.isNaN(port) ? 3000 : port;
const premiumAmountInCents = Number.parseInt(getEnv("WOMPI_PREMIUM_AMOUNT_CENTS", "4900000"), 10);

function isLocalSiteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveWompiEnvironment(input: { requestedEnvironment: string; nodeEnvironment: string; siteUrl: string }) {
  const requested = input.requestedEnvironment.trim().toLowerCase() || "sandbox";
  const wantsProduction = requested.includes("prod");
  const isLocalRuntime = input.nodeEnvironment !== "production" || isLocalSiteUrl(input.siteUrl);
  const forcedSandbox = wantsProduction && isLocalRuntime;

  return {
    requestedEnvironment: requested,
    environment: forcedSandbox ? "sandbox" : requested,
    forcedSandbox
  };
}

const requestedWompiEnvironment = getEnv("WOMPI_ENV", "sandbox");
const resolvedWompiEnvironment = resolveWompiEnvironment({
  requestedEnvironment: requestedWompiEnvironment,
  nodeEnvironment: nodeEnv,
  siteUrl: getEnv("SITE_URL", `http://localhost:${normalizedPort}`)
});

export const env = {
  nodeEnv,
  port: normalizedPort,
  sessionSecret: getEnv("SESSION_SECRET", "dev-session-secret-change-me"),
  appVersion,
  assetVersion,
  siteUrl: getEnv("SITE_URL", `http://localhost:${normalizedPort}`),
  databaseProvider: getEnv("DATABASE_PROVIDER", "sqlite"),
  sqlitePath: getEnv("SQLITE_PATH", "data/mirealyo.sqlite"),
  wompi: {
    publicKey: getEnv("WOMPI_PUBLIC_KEY"),
    integritySecret: getEnv("WOMPI_INTEGRITY_SECRET"),
    eventsSecret: getEnv("WOMPI_EVENTS_SECRET"),
    requestedEnvironment: resolvedWompiEnvironment.requestedEnvironment,
    environment: resolvedWompiEnvironment.environment,
    forcedSandbox: resolvedWompiEnvironment.forcedSandbox,
    premiumAmountInCents: Number.isNaN(premiumAmountInCents) ? 4900000 : premiumAmountInCents,
    currency: getEnv("WOMPI_CURRENCY", "COP")
  }
};

export const editableEnvVariables = [
  { name: "APP_VERSION", secret: false, restartRequired: false },
  { name: "SITE_URL", secret: false, restartRequired: false },
  { name: "WOMPI_ENV", secret: false, restartRequired: false },
  { name: "WOMPI_PUBLIC_KEY", secret: true, restartRequired: false },
  { name: "WOMPI_INTEGRITY_SECRET", secret: true, restartRequired: false },
  { name: "WOMPI_EVENTS_SECRET", secret: true, restartRequired: false },
  { name: "WOMPI_PREMIUM_AMOUNT_CENTS", secret: false, restartRequired: false },
  { name: "WOMPI_CURRENCY", secret: false, restartRequired: false },
  { name: "NODE_ENV", secret: false, restartRequired: true },
  { name: "SESSION_SECRET", secret: true, restartRequired: true }
] as const;

export function getEditableEnvSnapshot() {
  const latestFileEnv = readEnvFile();

  return editableEnvVariables.map((item) => ({
    ...item,
    current: process.env[item.name] ?? latestFileEnv[item.name] ?? "",
    source: process.env[item.name] !== undefined ? "runtime" : latestFileEnv[item.name] !== undefined ? ".env" : "default"
  }));
}

export function updateEditableEnv(values: EnvFileValues) {
  const allowedNames = new Set<string>(editableEnvVariables.map((item) => item.name));
  const sanitizedValues = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => allowedNames.has(key))
      .map(([key, value]) => [key, value.trim()])
  );

  updateEnvFile(sanitizedValues);
  applyRuntimeEnv(sanitizedValues);
}

function readEnvFile(): EnvFileValues {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  return parseEnvContent(fs.readFileSync(envFilePath, "utf8"));
}

function parseEnvContent(content: string): EnvFileValues {
  const values: EnvFileValues = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#") || !trimmedLine.includes("=")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    values[key] = unquoteEnvValue(rawValue);
  }

  return values;
}

function updateEnvFile(values: EnvFileValues) {
  const existingContent = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8") : "";
  const pendingKeys = new Set(Object.keys(values));
  const lines = existingContent
    ? existingContent.split(/\r?\n/).map((line) => {
        const key = line.includes("=") ? line.slice(0, line.indexOf("=")).trim() : "";

        if (!pendingKeys.has(key)) {
          return line;
        }

        pendingKeys.delete(key);
        return `${key}=${quoteEnvValue(values[key])}`;
      })
    : [];

  for (const key of pendingKeys) {
    lines.push(`${key}=${quoteEnvValue(values[key])}`);
  }

  fs.writeFileSync(envFilePath, `${lines.filter((line, index) => line || index < lines.length - 1).join("\n")}\n`, "utf8");
}

function applyRuntimeEnv(values: EnvFileValues) {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  if (values.APP_VERSION !== undefined) env.appVersion = values.APP_VERSION;
  if (values.SITE_URL !== undefined) env.siteUrl = values.SITE_URL;
  if (values.WOMPI_PUBLIC_KEY !== undefined) env.wompi.publicKey = values.WOMPI_PUBLIC_KEY;
  if (values.WOMPI_INTEGRITY_SECRET !== undefined) env.wompi.integritySecret = values.WOMPI_INTEGRITY_SECRET;
  if (values.WOMPI_EVENTS_SECRET !== undefined) env.wompi.eventsSecret = values.WOMPI_EVENTS_SECRET;
  if (values.WOMPI_PREMIUM_AMOUNT_CENTS !== undefined) {
    const amount = Number.parseInt(values.WOMPI_PREMIUM_AMOUNT_CENTS, 10);
    if (!Number.isNaN(amount)) env.wompi.premiumAmountInCents = amount;
  }
  if (values.WOMPI_CURRENCY !== undefined) env.wompi.currency = values.WOMPI_CURRENCY;
  if (values.NODE_ENV !== undefined) env.nodeEnv = values.NODE_ENV;
  if (values.SESSION_SECRET !== undefined) env.sessionSecret = values.SESSION_SECRET;

  const resolved = resolveWompiEnvironment({
    requestedEnvironment:
      values.WOMPI_ENV !== undefined ? values.WOMPI_ENV : env.wompi.requestedEnvironment,
    nodeEnvironment: env.nodeEnv,
    siteUrl: env.siteUrl
  });
  env.wompi.requestedEnvironment = resolved.requestedEnvironment;
  env.wompi.environment = resolved.environment;
  env.wompi.forcedSandbox = resolved.forcedSandbox;
}

function quoteEnvValue(value: string) {
  return /[\s#"'\\]/.test(value) ? JSON.stringify(value) : value;
}

function unquoteEnvValue(value: string) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
