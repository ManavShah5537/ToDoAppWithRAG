import pool from "../config/database";
import { ContextSuggestion, UserContext } from "../types";

export class ContextEngine {
  async generateContextSuggestion(
    userId: string,
    eventId: string,
    userContext: UserContext
  ): Promise<ContextSuggestion> {
    try {
      let suggestion = "";
      let taskCategory = "general";
      const timeOfDay = this.getTimeOfDay(userContext.currentTime);

      // Get event details
      const eventResult = await pool.query(
        "SELECT type, title FROM events WHERE id = $1",
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found");
      }

      const event = eventResult.rows[0];
      taskCategory = event.type.toLowerCase();

      // Generate context-aware suggestion
      if (
        timeOfDay === "night" &&
        event.type !== "Quiz"
      ) {
        suggestion = `Consider a lighter task for now. Save "${event.title}" for tomorrow morning when you're more alert.`;
      } else if (userContext.location === "library" && event.type === "Quiz") {
        suggestion = `Perfect environment for focused study. Start with practice problems for "${event.title}".`;
      } else if (userContext.currentTask === "break" && event.type === "Assignment") {
        suggestion = `Good time to tackle a complex task. Start working on "${event.title}".`;
      } else {
        suggestion = `Consider starting "${event.title}" to maintain progress.`;
      }

      // Log suggestion
      const result = await pool.query(
        `INSERT INTO context_suggestions 
        (user_id, event_id, context, suggestion, task_category, recommended_time_of_day)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          eventId,
          this.serializeContext(userContext),
          suggestion,
          taskCategory,
          this.getOptimalTimeOfDay(event.type),
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        context: row.context,
        suggestion: row.suggestion,
        taskCategory: row.task_category,
        recommendedTimeOfDay: row.recommended_time_of_day,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error("Error generating context suggestion:", error);
      throw error;
    }
  }

  private getTimeOfDay(
    time: Date
  ): "morning" | "afternoon" | "evening" | "night" {
    const hour = time.getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  }

  private getOptimalTimeOfDay(
    eventType: string
  ): "morning" | "afternoon" | "evening" {
    const map: Record<string, "morning" | "afternoon" | "evening"> = {
      Quiz: "morning",
      Assignment: "afternoon",
      Event: "evening",
      Custom: "afternoon",
    };
    return map[eventType] || "afternoon";
  }

  private serializeContext(context: UserContext): string {
    return JSON.stringify({
      time: context.currentTime.toISOString(),
      location: context.location,
      currentTask: context.currentTask,
      calendarBusy: context.calendarBusy,
      workloadLevel: context.workloadLevel,
    });
  }

  async getSuggestionsForUser(userId: string, limit: number = 5): Promise<ContextSuggestion[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM context_suggestions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        context: row.context,
        suggestion: row.suggestion,
        taskCategory: row.task_category,
        recommendedTimeOfDay: row.recommended_time_of_day,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  }
}
