import { Router } from "express";
import {
  calculatePriority,
  getPrioritiesForUser,
} from "../controllers/priority.controller";

const router = Router();

router.post("/", calculatePriority);
router.get("/", getPrioritiesForUser);

export default router;