import rabbitMQConnection from "./connection.js";
import { safeLogger } from "../config/logger.js";
// import { startUserVerifiedConsumer } from "./consumers/userVerifiedConsumer.js";
import { ApiError } from "../utils/ApiError.js";

export async function initializeRabbitMQ() {
  try {
    await rabbitMQConnection.init();

    // Start consumers
    // await startUserVerifiedConsumer();
    // safeLogger.info("All consumers started");
  } catch (error) {
    safeLogger.error("Failed to initialize events", {
      message: error.message,
      stack: error.stack,
    });
    throw new ApiError(500, "Failed to initialize events", [error.message]);
  }
}
