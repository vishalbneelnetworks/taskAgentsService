import rabbitMQConnection from "../events/connection.js";
import { safeLogger } from "../config/logger.js";

/**
 * Simple Dummy Matching Engine - Basic testing only
 * Will be replaced with real logic later
 */
class DummyMatchingEngine {
  constructor() {
    this.requestQueue = "matching.request.queue";
    this.replyQueue = "assign.agent.reply.queue";
    this.isRunning = false;
    this.connection = rabbitMQConnection;
  }

  async start() {
    if (this.isRunning) return;

    try {
      await this.connection.consume(
        "dummy-matching-engine-channel",
        this.requestQueue,
        this.handleRequest.bind(this),
        { prefetch: 5 }
      );

      this.isRunning = true;
      safeLogger.info("🤖 Dummy Matching Engine started");
    } catch (error) {
      safeLogger.error("❌ Dummy Matching Engine failed:", error);
      throw error;
    }
  }

  async handleRequest(message, msg, channel) {
    console.log("🤖 Dummy Matching Engine received request:", message);
    try {
      const requestData =
        typeof message === "string" ? JSON.parse(message) : message;
      const correlationId = msg.properties.correlationId;

      // Simple logic: get message and append ##<message>
      const testMessage = requestData.testData || "test";

      const processedMessage = `${testMessage}##${testMessage}`;

      // Simple response
      const response = {
        success: true,
        processedMessage,
        correlationId,
        timestamp: new Date().toISOString(),
      };

      // Send response
      await this.connection.publish(
        "dummy-matching-engine-channel",
        "",
        this.replyQueue,
        response,
        { correlationId }
      );

      safeLogger.info(
        `✅ Dummy response sent: "${testMessage}" -> "${processedMessage}"`
      );
    } catch (error) {
      console.log("🤖 Dummy Matching Engine error:", error);
      // safeLogger.error("❌ Dummy engine error:", error);
    }
  }

  stop() {
    this.isRunning = false;
    safeLogger.info("🛑 Dummy Matching Engine stopped");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      requestQueue: this.requestQueue,
      replyQueue: this.replyQueue,
    };
  }
}

export const dummyMatchingEngine = new DummyMatchingEngine();
