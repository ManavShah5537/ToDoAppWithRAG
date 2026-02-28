import { Request, Response } from "express";
import { EventService } from "../services/event.service";
import { EventType } from "../types";

const eventService = new EventService();

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { userId, title, description, type, deadline, source, sourceId } =
      req.body;

    if (!userId || !title || !type || !deadline) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await eventService.createEvent(
      userId,
      title,
      description || "",
      type as EventType,
      new Date(deadline),
      source || "custom",
      sourceId
    );

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const events = await eventService.getEventsByUserId(userId as string);

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const { userId, days } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const upcomingEvents = await eventService.getUpcomingEvents(
      userId as string,
      days ? parseInt(days as string) : 7
    );

    res.json(upcomingEvents);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId as string;

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    await eventService.deleteEvent(eventId);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};
