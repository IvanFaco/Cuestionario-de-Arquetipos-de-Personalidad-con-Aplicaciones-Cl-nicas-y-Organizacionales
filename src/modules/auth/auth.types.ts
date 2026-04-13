export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): UserRecord | null;
  findUserById(id: string): UserRecord | null;
  createUser(input: CreateUserInput): UserRecord;
  updatePassword(userId: string, passwordHash: string): void;
}
