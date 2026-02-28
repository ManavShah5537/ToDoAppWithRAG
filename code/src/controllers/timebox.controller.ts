import { Request, Response } from "express";
import { TimeBoxingService } from "../services/timebox.service";

const timeBoxingService = new TimeBoxingService();

export const generateFocusSchedule = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      eventId,
      taskTitle,
      daysUntilDeadline,
      recommendedSessions,
    } = req.body;

    if (
      !userId ||
      !eventId ||
      !taskTitle ||
      !recommendedSessions
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const focusSessions = await timeBoxingService.generateFocusSchedule(
      userId,
      eventId,
      taskTitle,
      daysUntilDeadline || 7,
      recommendedSessions
    );

    res.json({
      sessionCount: focusSessions.length,
      sessions: focusSessions,
    });
  } catch (error) {
    console.error("Error generating focus schedule:", error);
    res.status(500).json({ error: "Failed to generate focus schedule" });
  }
};

export const getFocusSessionsForEvent = async (
  req: Request,
  res: Response
) => {
  try {
    const eventId = req.params.eventId as string;

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const sessions =
      await timeBoxingService.getFocusSessionsByEvent(eventId);

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching focus sessions:", error);
    res.status(500).json({ error: "Failed to fetch focus sessions" });
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { status } = req.body;

    if (!sessionId || !status) {
      return res
        .status(400)
        .json({ error: "sessionId and status are required" });
    }

    await timeBoxingService.updateSessionStatus(
      sessionId,
      status as "scheduled" | "active" | "completed" | "skipped"
    );

    res.json({ message: "Session status updated" });
  } catch (error) {
    console.error("Error updating session status:", error);
    res.status(500).json({ error: "Failed to update session status" });
  }
};
