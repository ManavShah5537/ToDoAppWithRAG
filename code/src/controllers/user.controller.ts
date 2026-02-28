import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { EmailService } from "../services/email.service";
import { ClassroomService } from "../services/classroom.service";
import { LLMService } from "../services/llm.service";
import { EventService } from "../services/event.service";
import { EmbeddingService } from "../services/embedding.service";
import { ExtractionInput } from "../types";
import { getEnergyLevel } from "../utils/energy";

const userService = new UserService();
const emailService = new EmailService();
const classroomService = new ClassroomService();
const llmService = new LLMService();
const eventService = new EventService();
const embeddingService = new EmbeddingService();

export const authenticateUser = async (req: Request, res: Response) => {
  try {
    const { googleId, email, name, refreshToken } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: "googleId and email are required" });
    }

    const user = await userService.findOrCreateUser(
      googleId,
      email,
      name || email.split("@")[0],
      refreshToken || ""
    );

    res.json(user);
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

export const syncEmailsAndClassroom = async (req: Request, res: Response) => {
  try {
    const { userId, refreshToken } = req.body;

    if (!userId || !refreshToken) {
      return res
        .status(400)
        .json({ error: "userId and refreshToken are required" });
    }

    // Check if user can call LLM
    const canCall = await userService.canCallLLM(userId);
    if (!canCall) {
      return res.status(429).json({
        error: "LLM call limit reached. Please try again in 1 hour.",
      });
    }

    // Fetch emails and classroom announcements
    let emails = await emailService.fetchGmailEmails(userId, refreshToken);
    const announcements =
      await classroomService.fetchClassroomAnnouncements(refreshToken);

    // Get existing events to avoid duplicates
    const existingEvents = await eventService.getEventsByUserId(userId);

    // Extract events using LLM
    const extractionInput: ExtractionInput = {
      emails,
      classroomAnnouncements: announcements,
      existingEvents,
    };

    const extractedEvents = await llmService.extractEventsFromEmails(
      extractionInput
    );

    // Create events and embed them
    const createdEvents = [];
    for (const extracted of extractedEvents) {
      const event = await eventService.createEvent(
        userId,
        extracted.title || "Untitled",
        extracted.description || "",
        extracted.type || "Custom",
        extracted.deadline || new Date(),
        extracted.source || "gmail"
      );

      // Embed the event
      await embeddingService.embedEvent(
        userId,
        event.id,
        event.title,
        event.description
      );

      createdEvents.push(event);
    }

    // Mark emails as processed
    await emailService.markEmailsAsProcessed(emails.map((e) => e.id));

    // Update user's sync times
    await userService.updateLastEmailSync(userId);
    await userService.updateLastLLMCall(userId);
    await userService.updateLastEmbedding(userId);

    res.json({
      emailsProcessed: emails.length,
      announcementsProcessed: announcements.length,
      eventsExtracted: createdEvents.length,
      events: createdEvents,
    });
  } catch (error) {
    console.error("Error syncing emails and classroom:", error);
    res.status(500).json({ error: "Sync failed" });
  }
};

export const getWidgetData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get the next upcoming event
    const energy = getEnergyLevel();
    const upcomingEvents = await eventService.getUpcomingEvents(userId as string, 7);

    if (upcomingEvents.length === 0) {
      return res.json({
        nextEvent: null,
        message: "No upcoming events",
      });
    }

    const memoryQuery = upcomingEvents
      .map((event) => `${event.title} ${event.description || ""}`)
      .join("\n");

    const memories = await embeddingService.retrieveSimilarMemories(
      userId as string,
      memoryQuery,
      5
    );

    const ranked = upcomingEvents
      .map(event => {
        const difficulty = event.metadata?.difficulty ?? 3;
        const enjoyment = event.metadata?.enjoyment ?? 3;

        let score = 0;

        // urgency boost
        score += Math.max(0, 10 - event.daysUntilDeadline);

        // energy adjustment
        if (energy === "very_low") {
          score -= difficulty * 2.5;
          score += enjoyment * 2;
        } else if (energy === "low") {
          score -= difficulty * 1.5;
          score += enjoyment * 1.25;
        }

        return { event, score };
      })
      .sort((a, b) => b.score - a.score);

    const candidateEvents = ranked.slice(0, Math.min(3, ranked.length)).map((r) => r.event);

    let nextEvent = ranked[0].event;

    if (candidateEvents.length > 1) {
      const chosenId = await llmService.chooseBestEvent(
        candidateEvents,
        memories.map((m) => m.content),
        energy
      );

      const chosen = candidateEvents.find((event) => event.id === chosenId);
      nextEvent = chosen || ranked[0].event;
    }

    res.json({
      oneThing: `Focus on: ${nextEvent.title}`,
      nextEvent: {
        id: nextEvent.id,
        title: nextEvent.title,
        deadline: nextEvent.deadline,
        type: nextEvent.type,
        daysUntilDeadline: nextEvent.daysUntilDeadline,
      },
    });
  } catch (error) {
    console.error("Error fetching widget data:", error);
    res.status(500).json({ error: "Failed to fetch widget data" });
  }
};
