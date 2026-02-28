import pool from "../config/database";
import { UserService } from "../services/user.service";
import { EmailService } from "../services/email.service";
import { ClassroomService } from "../services/classroom.service";
import { LLMService } from "../services/llm.service";
import { EventService } from "../services/event.service";
import { EmbeddingService } from "../services/embedding.service";
import { ExtractionInput } from "../types";

const userService = new UserService();
const emailService = new EmailService();
const classroomService = new ClassroomService();
const llmService = new LLMService();
const eventService = new EventService();
const embeddingService = new EmbeddingService();

/**
 * Scheduled job to sync emails and classroom for all users
 * Runs once per hour per user (respecting rate limit)
 */
export async function runEmailAndClassroomSync(): Promise<void> {
  try {
    console.log("🔄 Starting email and classroom sync...");

    // Get all users
    const result = await pool.query(` 
      SELECT id, refresh_token, last_llm_call 
      FROM users 
      WHERE refresh_token IS NOT NULL
    `);

    const users = result.rows;

    if (users.length === 0) {
      console.log("ℹ️  No users to sync");
      return;
    }

    for (const user of users) {
      try {
        // Check if user can call LLM (once per hour)
        const canCall = await userService.canCallLLM(user.id);

        if (!canCall) {
          console.log(`⏳ Skipping user ${user.id} - LLM limit reached`);
          continue;
        }

        console.log(`📬 Syncing emails and classroom for user ${user.id}`);

        // Fetch emails and classroom announcements
        const emails = await emailService.fetchGmailEmails(
          user.id,
          user.refresh_token
        );
        const announcements =
          await classroomService.fetchClassroomAnnouncements(
            user.refresh_token
          );

        if (emails.length === 0 && announcements.length === 0) {
          console.log(`   ℹ️  No new emails or announcements`);
          continue;
        }

        // Get existing events
        const existingEvents = await eventService.getEventsByUserId(user.id);

        // Extract events using LLM
        const extractionInput: ExtractionInput = {
          emails,
          classroomAnnouncements: announcements,
          existingEvents,
        };

        const extractedEvents = await llmService.extractEventsFromEmails(
          extractionInput
        );

        // Create and embed events
        for (const extracted of extractedEvents) {
          const event = await eventService.createEvent(
            user.id,
            extracted.title || "Untitled",
            extracted.description || "",
            extracted.type || "Custom",
            extracted.deadline || new Date(),
            extracted.source || "gmail"
          );

          // Embed the event
          await embeddingService.embedEvent(
            user.id,
            event.id,
            event.title,
            event.description
          );
        }

        // Mark emails as processed
        await emailService.markEmailsAsProcessed(emails.map((e) => e.id));

        // Update sync timestamps
        await userService.updateLastEmailSync(user.id);
        await userService.updateLastLLMCall(user.id);
        await userService.updateLastEmbedding(user.id);

        console.log(
          `   ✅ Processed ${extractedEvents.length} events from ${emails.length} emails and ${announcements.length} announcements`
        );
      } catch (userError) {
        console.error(`❌ Error syncing user ${user.id}:`, userError);
        // Continue with other users
      }
    }

    console.log("✅ Email and classroom sync completed");
  } catch (error) {
    console.error("❌ Error in email sync job:", error);
  }
}

// Schedule sync job to run every hour
setInterval(runEmailAndClassroomSync, 60 * 60 * 1000);

// Also run on startup (delayed by 10 seconds to ensure DB is ready)
setTimeout(runEmailAndClassroomSync, 10000);
