import path from "node:path";

import { env } from "../../config/env.js";

export function getDatabasePath(): string {
  if (path.isAbsolute(env.sqlitePath)) {
    return env.sqlitePath;
  }

  return path.join(process.cwd(), env.sqlitePath);
}
