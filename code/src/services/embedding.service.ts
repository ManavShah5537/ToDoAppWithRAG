import { HfInference } from "@huggingface/inference";
import pool from "../config/database";
import { RAGMemoryEntry } from "../types";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export class EmbeddingService {
  async embedContent(content: string): Promise<number[]> {
    try {
      const embedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: content,
      });

      // Ensure we return a 1D array
      if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        return embedding[0] as number[];
      }
      return embedding as number[];
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  async storeRAGMemory(
    userId: string,
    content: string,
    type: "event" | "syllabus" | "study_summary" | "reflection",
    eventId?: string,
    metadata?: Record<string, any>
  ): Promise<RAGMemoryEntry> {
    try {
      // Check if similar content already exists (prevent duplicates)
      const embedding = await this.embedContent(content);

      // Store in database
      const result = await pool.query(
        `INSERT INTO rag_memory 
        (user_id, event_id, content, type, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at`,
        [userId, eventId || null, content, type, JSON.stringify(embedding), metadata || null]
      );

      return {
        id: result.rows[0].id,
        userId,
        eventId,
        content,
        type,
        embedding,
        metadata,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      console.error("Error storing RAG memory:", error);
      throw error;
    }
  }

  async retrieveSimilarMemories(
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<RAGMemoryEntry[]> {
    try {
      const queryEmbedding = await this.embedContent(query);

      const result = await pool.query(
        `SELECT id, user_id, event_id, content, type, embedding, metadata, created_at
         FROM rag_memory
         WHERE user_id = $1
         ORDER BY embedding <-> $2::vector
         LIMIT $3`,
        [userId, JSON.stringify(queryEmbedding), topK]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        content: row.content,
        type: row.type,
        embedding: row.embedding,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("Error retrieving similar memories:", error);
      throw error;
    }
  }

  async embedEvent(userId: string, eventId: string, title: string, description: string): Promise<void> {
    try {
      const content = `${title}\n${description}`;
      await this.storeRAGMemory(userId, content, "event", eventId, {
        eventId,
      });

      // Mark event as embedded
      await pool.query(
        "UPDATE events SET is_embedded = TRUE WHERE id = $1",
        [eventId]
      );
    } catch (error) {
      console.error("Error embedding event:", error);
      throw error;
    }
  }

  async getUserMemorySize(userId: string): Promise<number> {
    try {
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM rag_memory WHERE user_id = $1",
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting memory size:", error);
      return 0;
    }
  }
}
