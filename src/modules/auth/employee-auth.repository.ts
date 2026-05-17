import { createHash } from "crypto";
import { BaseRepository } from "../../shared/repositories/base.repository";
import type { EmployeeAuthRow } from "./employee-auth.types";

class EmployeeAuthRepository extends BaseRepository<EmployeeAuthRow> {
  constructor() {
    super("employees");
  }

  hashValue(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  async findByEmail(email: string): Promise<EmployeeAuthRow | undefined> {
    return this.baseQuery()
      .where("email", email.toLowerCase())
      .first() as Promise<EmployeeAuthRow | undefined>;
  }

  async findActiveById(id: number): Promise<EmployeeAuthRow | undefined> {
    return this.baseQuery().where({ id }).first() as Promise<
      EmployeeAuthRow | undefined
    >;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        last_login_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  async updateProfilePhoto(id: number, profilePhoto: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        profile_photo: profilePhoto,
        updated_at: this.db.fn.now(),
      });
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        password_hash: passwordHash,
        updated_at: this.db.fn.now(),
      });
  }

  async saveResetToken(
    id: number,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        reset_token_hash: tokenHash,
        reset_token_expiry: expiresAt,
        updated_at: this.db.fn.now(),
      });
  }

  async clearResetToken(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        reset_token_hash: null,
        reset_token_expiry: null,
        updated_at: this.db.fn.now(),
      });
  }

  async findByResetTokenHash(
    tokenHash: string
  ): Promise<EmployeeAuthRow | undefined> {
    return this.baseQuery()
      .where({ reset_token_hash: tokenHash })
      .where("reset_token_expiry", ">", new Date())
      .first() as Promise<EmployeeAuthRow | undefined>;
  }

  async saveRefreshToken(
    id: number,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at")
      .update({
        refresh_token_hash: tokenHash,
        refresh_token_expiry: expiresAt,
        updated_at: this.db.fn.now(),
      });
  }

  async clearRefreshToken(id: number): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        refresh_token_hash: null,
        refresh_token_expiry: null,
        updated_at: this.db.fn.now(),
      });
  }

  async findByRefreshTokenHash(
    tokenHash: string
  ): Promise<EmployeeAuthRow | undefined> {
    return this.baseQuery()
      .where({ refresh_token_hash: tokenHash })
      .where("refresh_token_expiry", ">", new Date())
      .first() as Promise<EmployeeAuthRow | undefined>;
  }
}

export const employeeAuthRepository = new EmployeeAuthRepository();
