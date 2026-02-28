import { Request, Response } from "express";
import { ContextEngine } from "../services/context.service";
import { UserContext } from "../types";

const contextEngine = new ContextEngine();

export const generateContextSuggestion = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, eventId, userContext } = req.body;

    if (!userId || !eventId || !userContext) {
      return res
        .status(400)
        .json({ error: "userId, eventId, and userContext are required" });
    }

    const suggestion = await contextEngine.generateContextSuggestion(
      userId,
      eventId,
      userContext as UserContext
    );

    res.json(suggestion);
  } catch (error) {
    console.error("Error generating context suggestion:", error);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
};

export const getSuggestionsForUser = async (req: Request, res: Response) => {
  try {
    const { userId, limit } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const suggestions = await contextEngine.getSuggestionsForUser(
      userId as string,
      limit ? parseInt(limit as string) : 5
    );

    res.json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
};
