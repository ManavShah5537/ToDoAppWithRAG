import { Router } from "express";
import {
  authenticateUser,
  syncEmailsAndClassroom,
  getWidgetData,
} from "../controllers/user.controller";

const router = Router();

router.post("/auth", authenticateUser);
router.post("/sync", syncEmailsAndClassroom);
router.get("/widget", getWidgetData);

export default router;
