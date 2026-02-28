import { Request, Response } from "express";
import { PlanGenerationService } from "../services/plan.service";

const planService = new PlanGenerationService();

export const generateDailyPlan = async (req: Request, res: Response) => {
  try {
    const { userId, planDate } = req.body;

    if (!userId || !planDate) {
      return res.status(400).json({ error: "userId and planDate are required" });
    }

    const plan = await planService.generateDailyPlan(
      userId,
      new Date(planDate)
    );

    res.json(plan);
  } catch (error) {
    console.error("Error generating daily plan:", error);
    res.status(500).json({ error: "Failed to generate daily plan" });
  }
};

export const generateWeeklyPlan = async (req: Request, res: Response) => {
  try {
    const { userId, startDate } = req.body;

    if (!userId || !startDate) {
      return res.status(400).json({ error: "userId and startDate are required" });
    }

    const plans = await planService.generateWeeklyPlan(
      userId,
      new Date(startDate)
    );

    res.json({
      planCount: plans.length,
      plans,
    });
  } catch (error) {
    console.error("Error generating weekly plan:", error);
    res.status(500).json({ error: "Failed to generate weekly plan" });
  }
};

export const analyzeAndSuggest = async (req: Request, res: Response) => {
  try {
    const { userId, planDate } = req.body;

    if (!userId || !planDate) {
      return res.status(400).json({ error: "userId and planDate are required" });
    }

    const suggestions = await planService.analyzePlanAndSuggestBalance(
      userId,
      new Date(planDate)
    );

    res.json({
      suggestions,
    });
  } catch (error) {
    console.error("Error analyzing plan:", error);
    res.status(500).json({ error: "Failed to analyze plan" });
  }
};
