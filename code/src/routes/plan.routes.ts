import { Router } from "express";
import {
  generateDailyPlan,
  generateWeeklyPlan,
  analyzeAndSuggest,
} from "../controllers/plan.controller";

const router = Router();

router.post("/daily", generateDailyPlan);
router.post("/weekly", generateWeeklyPlan);
router.post("/analyze", analyzeAndSuggest);

export default router;
