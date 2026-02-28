import { Router } from "express";
import {
  generateFocusSchedule,
  getFocusSessionsForEvent,
  updateSessionStatus,
} from "../controllers/timebox.controller";

const router = Router();

router.post("/schedule", generateFocusSchedule);
router.get("/:eventId", getFocusSessionsForEvent);
router.put("/:sessionId/status", updateSessionStatus);

export default router;
