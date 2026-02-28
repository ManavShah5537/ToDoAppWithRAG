import express from "express";
import dotenv from "dotenv";
import { initializeDatabase } from "./config/database";
import priorityRoutes from "./routes/priority.routes";
import eventRoutes from "./routes/event.routes";
import timeboxRoutes from "./routes/timebox.routes";
import planRoutes from "./routes/plan.routes";
import contextRoutes from "./routes/context.routes";
import distractionRoutes from "./routes/distraction.routes";
import userRoutes from "./routes/user.routes";
// Import scheduler for background jobs
import "./utils/scheduler";
import "./utils/cleanup";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Attention-Aware Academic Planner Backend",
    version: "1.0.0",
    status: "running 🚀",
  });
});

// API Routes
app.use("/api/priority", priorityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/focus-sessions", timeboxRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/context", contextRoutes);
app.use("/api/distraction", distractionRoutes);
app.use("/api/users", userRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log("✅ Database initialized");

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation:`);
      console.log(`   POST /api/users/auth - Authenticate user`);
      console.log(`   POST /api/users/sync - Sync Gmail & Classroom`);
      console.log(`   GET /api/users/widget - Get widget data`);
      console.log(`   POST /api/events - Create event`);
      console.log(`   GET /api/events - Get all events`);
      console.log(`   POST /api/priority - Calculate priority`);
      console.log(`   POST /api/focus-sessions/schedule - Generate focus schedule`);
      console.log(`   POST /api/plans/daily - Generate daily plan`);
      console.log(`   POST /api/context/suggestion - Get context suggestion`);
      console.log(`   POST /api/distraction/check - Check app restriction`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();