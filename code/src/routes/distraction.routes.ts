import { Router } from "express";
import {
  checkApp,
  logDistractionAttempt,
} from "../controllers/distraction.controller";

const router = Router();

router.post("/check", checkApp);
router.post("/log", logDistractionAttempt);

export default router;
