import { Router } from "express";
import {
  createEvent,
  getEvents,
  getUpcomingEvents,
  deleteEvent,
} from "../controllers/event.controller";

const router = Router();

router.post("/", createEvent);
router.get("/", getEvents);
router.get("/upcoming", getUpcomingEvents);
router.delete("/:eventId", deleteEvent);

export default router;
