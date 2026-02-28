import axios from "axios";
import pool from "../config/database";
import { RAGMemoryEntry } from "../types";

type Queryable = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class EmbeddingService {
  private embeddingApiUrl = "http://localhost:8001/embed";

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(",")}]`;
  }

  async embedContent(content: string): Promise<number[]> {
    try {
      const response = await axios.post(this.embeddingApiUrl, {
        text: content,
      });

      return response.data.embedding;
    } catch (error) {
      console.error("Error calling local embedding service:", error);
      throw error;
    }
  }

  async storeRAGMemory(
    userId: string,
    content: string,
    type: "event" | "syllabus" | "study_summary" | "reflection",
    eventId?: string,
    metadata?: Record<string, any>,
    db: Queryable = pool
  ): Promise<RAGMemoryEntry> {
    try {
      const embedding = await this.embedContent(content);
      const vectorLiteral = this.toVectorLiteral(embedding);

      const result = await db.query(
        `INSERT INTO rag_memory 
        (user_id, event_id, content, type, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5::vector, $6)
        RETURNING id, created_at`,
        [userId, eventId || null, content, type, vectorLiteral, metadata || null]
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
      const queryVectorLiteral = this.toVectorLiteral(queryEmbedding);

      const result = await pool.query(
        `SELECT id, user_id, event_id, content, type, embedding, metadata, created_at
         FROM rag_memory
         WHERE user_id = $1
         ORDER BY embedding <-> $2::vector
         LIMIT $3`,
        [userId, queryVectorLiteral, topK]
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

  async embedEvent(
    userId: string,
    eventId: string,
    title: string,
    description: string,
    db: Queryable = pool
  ): Promise<void> {
    try {
      const content = `${title}\n${description}`;

      await this.storeRAGMemory(
        userId,
        content,
        "event",
        eventId,
        {
          eventId,
        },
        db
      );

      await db.query(
        "UPDATE events SET is_embedded = TRUE WHERE id = $1",
        [eventId]
      );
    } catch (error) {
      console.error("Error embedding event:", error);
      throw error;
    }
  }
}