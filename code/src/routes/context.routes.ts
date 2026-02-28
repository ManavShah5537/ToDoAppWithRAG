import { Router } from "express";
import {
  generateContextSuggestion,
  getSuggestionsForUser,
} from "../controllers/context.controller";

const router = Router();

router.post("/suggestion", generateContextSuggestion);
router.get("/suggestions", getSuggestionsForUser);

export default router;
