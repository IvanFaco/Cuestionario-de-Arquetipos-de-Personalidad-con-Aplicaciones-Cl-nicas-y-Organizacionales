import { hashPassword, verifyPassword } from "./auth.password.js";
import type { AuthRepository, UserRecord } from "./auth.types.js";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS"
  ) {
    super(message);
  }
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(email: string, password: string): Promise<UserRecord> {
    const existingUser = this.authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new AuthError("Ya existe una cuenta con este correo.", "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(password);
    return this.authRepository.createUser({ email, passwordHash });
  }

  async authenticate(email: string, password: string): Promise<UserRecord> {
    const user = this.authRepository.findUserByEmail(email);

    if (!user) {
      throw new AuthError("Credenciales inválidas.", "INVALID_CREDENTIALS");
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      throw new AuthError("Credenciales inválidas.", "INVALID_CREDENTIALS");
    }

    return user;
  }
}
