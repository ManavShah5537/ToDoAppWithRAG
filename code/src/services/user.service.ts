import pool from "../config/database";
import { User } from "../types";

export class UserService {
  async findOrCreateUser(
    googleId: string,
    email: string,
    name: string,
    refreshToken: string
  ): Promise<User> {
    try {
      // Check if user exists
      const existing = await pool.query(
        "SELECT * FROM users WHERE google_id = $1",
        [googleId]
      );

      if (existing.rows.length > 0) {
        // Update refresh token if provided
        if (refreshToken) {
          await pool.query(
            "UPDATE users SET refresh_token = $1, updated_at = NOW() WHERE id = $2",
            [refreshToken, existing.rows[0].id]
          );
        }

        return this.rowToUser(existing.rows[0]);
      }

      // Create new user
      const result = await pool.query(
        `INSERT INTO users (google_id, email, name, refresh_token)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [googleId, email, name, refreshToken]
      );

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      console.error("Error in user service:", error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);

      if (result.rows.length === 0) return null;

      return this.rowToUser(result.rows[0]);
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async updateLastEmailSync(userId: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE users SET last_email_sync = NOW() WHERE id = $1",
        [userId]
      );
    } catch (error) {
      console.error("Error updating last email sync:", error);
      throw error;
    }
  }

  async updateLastLLMCall(userId: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE users SET last_llm_call = NOW() WHERE id = $1",
        [userId]
      );
    } catch (error) {
      console.error("Error updating last LLM call:", error);
      throw error;
    }
  }

  async updateLastEmbedding(userId: string): Promise<void> {
    try {
      await pool.query(
        "UPDATE users SET last_embedding = NOW() WHERE id = $1",
        [userId]
      );
    } catch (error) {
      console.error("Error updating last embedding:", error);
      throw error;
    }
  }

  async canCallLLM(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        "SELECT last_llm_call FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) return true;

      const lastCall = result.rows[0].last_llm_call;
      if (!lastCall) return true;

      const now = new Date();
      const lastCallTime = new Date(lastCall);
      const diffMinutes =
        (now.getTime() - lastCallTime.getTime()) / (1000 * 60);

      return diffMinutes >= 60; // Can call once per hour
    } catch (error) {
      console.error("Error checking LLM eligibility:", error);
      return false;
    }
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      googleId: row.google_id,
      name: row.name,
      refreshToken: row.refresh_token,
      lastEmailSync: row.last_email_sync,
      lastLlmCall: row.last_llm_call,
      lastEmbedding: row.last_embedding,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
