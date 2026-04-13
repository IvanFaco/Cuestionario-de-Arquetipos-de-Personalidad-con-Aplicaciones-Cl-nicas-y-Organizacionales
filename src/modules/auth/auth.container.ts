import { getDatabaseClient } from "../../shared/database/database.factory.js";
import { SqliteAuthRepository } from "./auth.repository.sqlite.js";
import { AuthService } from "./auth.service.js";

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  authService ??= new AuthService(new SqliteAuthRepository(getDatabaseClient()));
  return authService;
}
