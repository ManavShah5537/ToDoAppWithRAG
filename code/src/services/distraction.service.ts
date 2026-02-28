import pool from "../config/database";
import { Event } from "../types";
import { EventService } from "./event.service";

export class DistractionInterceptor {
  private eventService: EventService;
  private restrict_apps = [
    "instagram",
    "tiktok",
    "facebook",
    "twitter",
    "youtube",
    "reddit",
    "games",
  ];

  constructor() {
    this.eventService = new EventService();
  }

  async interceptApp(userId: string, appName: string): Promise<{
    isRestricted: boolean;
    message?: string;
    nextEvent?: Event;
  }> {
    try {
      const appLower = appName.toLowerCase();

      // Check if app is restricted
      if (
        !this.restrict_apps.some((restrictedApp) =>
          appLower.includes(restrictedApp)
        )
      ) {
        return { isRestricted: false };
      }

      // Get nearest upcoming event
      const upcomingEvents = await this.eventService.getUpcomingEvents(
        userId,
        1
      );

      if (upcomingEvents.length === 0) {
        return { isRestricted: false };
      }

      const nextEvent = upcomingEvents[0];
      const message = `⚠️ You have a ${nextEvent.type.toLowerCase()} tomorrow: "${nextEvent.title}". 
Do 15 minutes of focused study first or continue? 
Deadline: ${nextEvent.deadline.toDateString()}`;

      return {
        isRestricted: true,
        message,
        nextEvent,
      };
    } catch (error) {
      console.error("Error in distraction interceptor:", error);
      return { isRestricted: false };
    }
  }

  async logDistractionAttempt(
    userId: string,
    appName: string,
    allowed: boolean
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO distraction_logs (user_id, app_name, allowed, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [userId, appName, allowed]
      );
    } catch (error) {
      console.error("Error logging distraction attempt:", error);
    }
  }
}
