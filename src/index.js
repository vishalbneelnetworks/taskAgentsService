import { safeLogger } from "./config/logger.js";
import { env } from "./config/env.js";
import Application from "./Application.js";
import app from "./app.js";

// Create application instance
const eventDrivenApp = new Application();

async function startServices() {
  try {
    safeLogger.info("🚀 Starting Task Agent Service...");

    // Setup graceful shutdown handlers
    eventDrivenApp.setupShutdownHandlers();

    // Start the Event-Driven Agent System
    await eventDrivenApp.start();

    // Start Express API server (for testing and monitoring)
    const PORT = env.PORT || 3001;

    // Add system routes to Express app
    app.get("/health", async (req, res) => {
      try {
        const health = await eventDrivenApp.getSystemHealth();
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/stats", async (req, res) => {
      try {
        const stats = eventDrivenApp.getSystemStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/test/form-submission", async (req, res) => {
      try {
        const result = await eventDrivenApp.testFormSubmission();

        res.json({
          success: true,
          message: "Form submission test initiated",
          ...result,
        });
      } catch (error) {
        safeLogger.error("Test form submission error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    app.listen(PORT, () => {
      safeLogger.info(`⚙️ Express API Server running on port ${PORT}`);
    });
  } catch (error) {
    safeLogger.error("Failed to start services:", error);
    process.exit(1);
  }
}

// Start the services
startServices().catch((error) => {
  safeLogger.error("Unhandled error during startup:", error);
  process.exit(1);
});
