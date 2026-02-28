import pool from "../config/database";
import { Event, EventType } from "../types";

type Queryable = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class EventService {
  async createEvent(
  userId: string,
  title: string,
  description: string,
  type: EventType,
  deadline: Date,
  source: "gmail" | "classroom" | "custom" | "calendar",
  sourceId?: string,
  metadata?: { difficulty?: number; enjoyment?: number },
  db: Queryable = pool
): Promise<Event> {
    try {
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const result = await db.query(
        `INSERT INTO events 
        (user_id, title, description, type, deadline, days_until_deadline, source, source_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
        userId,
        title,
        description,
        type,
        deadline,
        Math.max(0, daysUntilDeadline),
        source,
        sourceId || null,
        metadata || null,
      ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        type: row.type,
        deadline: row.deadline,
        daysUntilDeadline: row.days_until_deadline,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isEmbedded: row.is_embedded,
      };
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }

  async getEventsByUserId(userId: string): Promise<Event[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM events 
         WHERE user_id = $1 
         ORDER BY deadline ASC`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        type: row.type,
        deadline: row.deadline,
        daysUntilDeadline: row.days_until_deadline,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isEmbedded: row.is_embedded,
      }));
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  async getUpcomingEvents(userId: string, days: number = 7): Promise<Event[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM events 
         WHERE user_id = $1 
         AND deadline <= NOW() + INTERVAL '${days} days'
         AND deadline >= NOW()
         ORDER BY deadline ASC`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        type: row.type,
        deadline: row.deadline,
        daysUntilDeadline: row.days_until_deadline,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isEmbedded: row.is_embedded,
      }));
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      throw error;
    }
  }

  async updateEventDaysUntilDeadline(eventId: string): Promise<void> {
    try {
      const result = await pool.query(
        "SELECT deadline FROM events WHERE id = $1",
        [eventId]
      );

      if (result.rows.length === 0) return;

      const deadline = new Date(result.rows[0].deadline);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await pool.query(
        "UPDATE events SET days_until_deadline = $1 WHERE id = $2",
        [Math.max(0, daysUntilDeadline), eventId]
      );
    } catch (error) {
      console.error("Error updating event days until deadline:", error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await pool.query("DELETE FROM events WHERE id = $1", [eventId]);
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const result = await pool.query(
        "SELECT * FROM events WHERE id = $1",
        [eventId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        type: row.type,
        deadline: row.deadline,
        daysUntilDeadline: row.days_until_deadline,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isEmbedded: row.is_embedded,
      };
    } catch (error) {
      console.error("Error fetching event:", error);
      throw error;
    }
  }
}
