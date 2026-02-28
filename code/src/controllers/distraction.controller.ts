import { Request, Response } from "express";
import { DistractionInterceptor } from "../services/distraction.service";

const distractionInterceptor = new DistractionInterceptor();

export const checkApp = async (req: Request, res: Response) => {
  try {
    const { userId, appName } = req.body;

    if (!userId || !appName) {
      return res.status(400).json({ error: "userId and appName are required" });
    }

    const result = await distractionInterceptor.interceptApp(userId, appName);

    res.json(result);
  } catch (error) {
    console.error("Error checking app:", error);
    res.status(500).json({ error: "Failed to check app" });
  }
};

export const logDistractionAttempt = async (req: Request, res: Response) => {
  try {
    const { userId, appName, allowed } = req.body;

    if (!userId || !appName || allowed === undefined) {
      return res
        .status(400)
        .json({ error: "userId, appName, and allowed are required" });
    }

    await distractionInterceptor.logDistractionAttempt(
      userId,
      appName,
      allowed
    );

    res.json({ message: "Distraction attempt logged" });
  } catch (error) {
    console.error("Error logging distraction attempt:", error);
    res.status(500).json({ error: "Failed to log distraction attempt" });
  }
};
