import pool from "../config/database";

export class DistractionLogsCleanup {
  static async createTable(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS distraction_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          app_name VARCHAR(255) NOT NULL,
          allowed BOOLEAN DEFAULT FALSE,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_distraction_logs_user_id ON distraction_logs(user_id)`
      );

      console.log("✅ Distraction logs table created");
    } catch (error) {
      console.error("Error creating distraction logs table:", error);
    }
  }

  static async cleanup(): Promise<void> {
    try {
      // Delete logs older than 30 days
      await pool.query(`
        DELETE FROM distraction_logs 
        WHERE timestamp < NOW() - INTERVAL '30 days'
      `);

      console.log("✅ Old distraction logs cleaned up");
    } catch (error) {
      console.error("Error cleaning up distraction logs:", error);
    }
  }
}

// Run cleanup job every 7 days
setInterval(() => {
  DistractionLogsCleanup.cleanup();
}, 7 * 24 * 60 * 60 * 1000);

// Initial setup
DistractionLogsCleanup.createTable();
