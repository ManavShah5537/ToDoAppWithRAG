import pool from "../config/database";
import { FocusSession } from "../types";

export class TimeBoxingService {
  async createFocusSession(
    userId: string,
    eventId: string,
    taskName: string,
    microTasks: string[],
    startTime: Date,
    endTime: Date
  ): Promise<FocusSession> {
    try {
      const duration = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      const result = await pool.query(
        `INSERT INTO focus_sessions
        (user_id, event_id, task_name, micro_tasks, start_time, end_time, duration, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
        RETURNING *`,
        [userId, eventId, taskName, JSON.stringify(microTasks), startTime, endTime, duration]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        taskName: row.task_name,
        microTasks: row.micro_tasks,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        status: row.status,
        calendarEventId: row.calendar_event_id,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error("Error creating focus session:", error);
      throw error;
    }
  }

  async generateFocusSchedule(
    userId: string,
    eventId: string,
    taskTitle: string,
    daysUntilDeadline: number,
    recommendedSessions: number
  ): Promise<FocusSession[]> {
    try {
      const now = new Date();
      const deadline = new Date(now.getTime() + daysUntilDeadline * 24 * 60 * 60 * 1000);
      
      // Break task into micro-tasks
      const microTasks = this.breakDownTask(taskTitle, recommendedSessions);

      const focusSessions: FocusSession[] = [];
      const sessionDuration = 90; // 90-minute focus sessions

      // Distribute sessions evenly across available days
      const sessionsPerDay = Math.ceil(recommendedSessions / Math.max(1, daysUntilDeadline));

      for (let i = 0; i < recommendedSessions; i++) {
        const dayOffset = Math.floor(i / sessionsPerDay);
        const sessionOfDay = i % sessionsPerDay;

        // Morning, Afternoon, Evening sessions
        const startHours = [8, 13, 18];
        const startHour = startHours[sessionOfDay % startHours.length];

        const sessionStart = new Date(now);
        sessionStart.setDate(sessionStart.getDate() + dayOffset);
        sessionStart.setHours(startHour, 0, 0, 0);

        const sessionEnd = new Date(sessionStart);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + sessionDuration);

        const session = await this.createFocusSession(
          userId,
          eventId,
          `${taskTitle} - Session ${i + 1}`,
          [microTasks[i % microTasks.length]],
          sessionStart,
          sessionEnd
        );

        focusSessions.push(session);
      }

      return focusSessions;
    } catch (error) {
      console.error("Error generating focus schedule:", error);
      throw error;
    }
  }

  private breakDownTask(taskTitle: string, sessionCount: number): string[] {
    const microTasks: string[] = [];

    const taskTypes: Record<string, string[]> = {
      quiz: [
        "Review key concepts",
        "Practice practice problems",
        "Take mock quiz",
        "Review weak areas",
      ],
      assignment: [
        "Understand requirements",
        "Create outline",
        "Draft solution",
        "Review and refine",
      ],
      event: ["Prepare materials", "Practice presentation", "Finalize"],
    };

    // Determine task type from title
    let taskType = "event";
    const lowerTitle = taskTitle.toLowerCase();
    if (lowerTitle.includes("quiz")) taskType = "quiz";
    else if (lowerTitle.includes("assignment")) taskType = "assignment";

    const templates = taskTypes[taskType] || taskTypes["event"];

    for (let i = 0; i < sessionCount; i++) {
      microTasks.push(templates[i % templates.length]);
    }

    return microTasks;
  }

  async getFocusSessionsByEvent(eventId: string): Promise<FocusSession[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM focus_sessions 
         WHERE event_id = $1 
         ORDER BY start_time ASC`,
        [eventId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        taskName: row.task_name,
        microTasks: row.micro_tasks,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        status: row.status,
        calendarEventId: row.calendar_event_id,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error("Error fetching focus sessions:", error);
      throw error;
    }
  }

  async updateSessionStatus(
    sessionId: string,
    status: "scheduled" | "active" | "completed" | "skipped"
  ): Promise<void> {
    try {
      await pool.query(
        "UPDATE focus_sessions SET status = $1 WHERE id = $2",
        [status, sessionId]
      );
    } catch (error) {
      console.error("Error updating session status:", error);
      throw error;
    }
  }
}
