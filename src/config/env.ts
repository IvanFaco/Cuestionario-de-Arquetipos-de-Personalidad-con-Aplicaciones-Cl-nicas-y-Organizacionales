const port = Number.parseInt(process.env.PORT ?? "3000", 10);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.isNaN(port) ? 3000 : port,
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me"
};
