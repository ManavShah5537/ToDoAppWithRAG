import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "vector"');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        refresh_token TEXT,
        last_email_sync TIMESTAMP,
        last_llm_call TIMESTAMP,
        last_embedding TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        deadline TIMESTAMP NOT NULL,
        days_until_deadline INTEGER,
        source VARCHAR(50),
        source_id VARCHAR(255),
        metadata JSONB,
        is_embedded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, source_id)
      )
    `);

    // Create RAG memory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rag_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        embedding vector(384),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create focus sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        task_name VARCHAR(255) NOT NULL,
        micro_tasks JSONB,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration INTEGER,
        status VARCHAR(50) DEFAULT 'scheduled',
        calendar_event_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create daily plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, plan_date)
      )
    `);

    // Create context suggestions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS context_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        context VARCHAR(255),
        suggestion TEXT NOT NULL,
        task_category VARCHAR(100),
        recommended_time_of_day VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create email messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_message_id VARCHAR(255) UNIQUE NOT NULL,
        "from" VARCHAR(255),
        subject TEXT,
        body TEXT,
        received_at TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_deadline ON events(deadline)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rag_memory_user_id ON rag_memory(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id)`);

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  } finally {
    client.release();
  }
}
