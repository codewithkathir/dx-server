import { createHash } from "crypto";
import type { Knex } from "knex";
import { db } from "../../database/knex";

interface RefreshTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  is_revoked: boolean;
}

class AuthRepository {
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async storeRefreshToken(
    userId: number,
    token: string,
    expiresAt: Date,
    trx?: Knex.Transaction
  ): Promise<void> {
    const query = trx ? trx("refresh_tokens") : db("refresh_tokens");
    await query.insert({
      user_id: userId,
      token_hash: this.hashToken(token),
      expires_at: expiresAt,
      is_revoked: false,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  }

  async findValidRefreshToken(token: string): Promise<RefreshTokenRow | undefined> {
    const hash = this.hashToken(token);
    return db("refresh_tokens")
      .where({ token_hash: hash, is_revoked: false })
      .whereNull("deleted_at")
      .where("expires_at", ">", new Date())
      .first() as Promise<RefreshTokenRow | undefined>;
  }

  async revokeRefreshToken(token: string, trx?: Knex.Transaction): Promise<void> {
    const hash = this.hashToken(token);
    const query = trx ? trx("refresh_tokens") : db("refresh_tokens");
    await query
      .where({ token_hash: hash })
      .update({
        is_revoked: true,
        updated_at: db.fn.now(),
      });
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await db("refresh_tokens")
      .where({ user_id: userId })
      .update({
        is_revoked: true,
        updated_at: db.fn.now(),
      });
  }
}

export const authRepository = new AuthRepository();
