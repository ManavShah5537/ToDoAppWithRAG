import { Request, Response } from "express";
import { PriorityEngine } from "../services/priority.service";
import { EventService } from "../services/event.service";

const priorityEngine = new PriorityEngine();
const eventService = new EventService();

export const calculatePriority = async (req: Request, res: Response) => {
  try {
    const { userId, eventId, context } = req.body;

    if (!userId || !eventId) {
      return res
        .status(400)
        .json({ error: "userId and eventId are required" });
    }

    const event = await eventService.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const priority = await priorityEngine.computePriority(
      userId,
      event,
      context
    );

    res.json(priority);
  } catch (error) {
    console.error("Error calculating priority:", error);
    res.status(500).json({ error: "Failed to calculate priority" });
  }
};

export const getPrioritiesForUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const events = await eventService.getEventsByUserId(userId as string);
    const priorities = [];

    for (const event of events) {
      const priority = await priorityEngine.computePriority(userId as string, event);
      priorities.push({
        eventId: event.id,
        eventTitle: event.title,
        ...priority,
      });
    }

    // Sort by priority score descending
    priorities.sort((a, b) => b.priority_score - a.priority_score);

    res.json(priorities);
  } catch (error) {
    console.error("Error fetching priorities:", error);
    res.status(500).json({ error: "Failed to fetch priorities" });
  }
};