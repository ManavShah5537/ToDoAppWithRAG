import pool from "../config/database";
import { DailyPlan, FocusSession, Event } from "../types";
import { EventService } from "./event.service";
import { PriorityEngine } from "./priority.service";

export class PlanGenerationService {
  private eventService: EventService;
  private priorityEngine: PriorityEngine;

  constructor() {
    this.eventService = new EventService();
    this.priorityEngine = new PriorityEngine();
  }

  async generateDailyPlan(userId: string, planDate: Date): Promise<DailyPlan> {
    try {
      // Check if plan already exists
      const existingPlan = await pool.query(
        "SELECT id FROM daily_plans WHERE user_id = $1 AND plan_date = $2",
        [userId, planDate.toISOString().split("T")[0]]
      );

      if (existingPlan.rows.length > 0) {
        return this.getDailyPlan(userId, planDate);
      }

      // Get events for the day
      const startOfDay = new Date(planDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(planDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get upcoming events within next 14 days
      const upcomingEvents = await this.eventService.getUpcomingEvents(
        userId,
        14
      );

      // Prioritize events
      const prioritizedEvents: Array<Event & { priority: number }> = [];

      for (const event of upcomingEvents) {
        const priority = await this.priorityEngine.computePriority(
          userId,
          event
        );
        prioritizedEvents.push({
          ...event,
          priority: priority.priority_score,
        });
      }

      // Sort by priority
      prioritizedEvents.sort((a, b) => b.priority - a.priority);

      // Create plan
      const result = await pool.query(
        `INSERT INTO daily_plans (user_id, plan_date, notes)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [
          userId,
          planDate.toISOString().split("T")[0],
          `Generated plan for ${prioritizedEvents.length} events`,
        ]
      );

      return {
        id: result.rows[0].id,
        userId,
        planDate,
        focusSessions: [],
        prioritizedEvents: prioritizedEvents.slice(0, 5), // Top 5 events
        notes: `Generated plan for ${prioritizedEvents.length} events`,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating daily plan:", error);
      throw error;
    }
  }

  async generateWeeklyPlan(userId: string, startDate: Date): Promise<DailyPlan[]> {
    try {
      const plans: DailyPlan[] = [];

      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        const plan = await this.generateDailyPlan(userId, dayDate);
        plans.push(plan);
      }

      return plans;
    } catch (error) {
      console.error("Error generating weekly plan:", error);
      throw error;
    }
  }

  private async getDailyPlan(userId: string, planDate: Date): Promise<DailyPlan> {
    const result = await pool.query(
      "SELECT * FROM daily_plans WHERE user_id = $1 AND plan_date = $2",
      [userId, planDate.toISOString().split("T")[0]]
    );

    if (result.rows.length === 0) {
      throw new Error("Plan not found");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      planDate: new Date(row.plan_date),
      focusSessions: [],
      prioritizedEvents: [],
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  async analyzePlanAndSuggestBalance(userId: string, planDate: Date): Promise<string[]> {
    try {
      const plan = await this.getDailyPlan(userId, planDate);

      const suggestions: string[] = [];

      if (!plan.prioritizedEvents || plan.prioritizedEvents.length === 0) {
        suggestions.push(
          "No events scheduled for today. Consider adding important study sessions."
        );
      }

      let quizzes = 0,
        assignments = 0;
      for (const event of plan.prioritizedEvents || []) {
        if (event.type === "Quiz") quizzes++;
        else if (event.type === "Assignment") assignments++;
      }

      if (quizzes > 2) {
        suggestions.push(
          "Heavy quiz load detected. Consider spacing study sessions throughout the day."
        );
      }

      if (assignments > 2) {
        suggestions.push(
          "Multiple assignments due. Break them into smaller tasks to avoid overwhelm."
        );
      }

      return suggestions;
    } catch (error) {
      console.error("Error analyzing plan:", error);
      return [];
    }
  }
}
