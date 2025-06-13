import app from "./app.js";
import { env } from "./config/env.js";
import { sequelize } from "./db/connect.js";
import { safeLogger } from "./config/logger.js";
import { initializeRabbitMQ } from "./events/index.js";
import { initializeGrpcServices } from "./grpc/index.js";

async function startServer() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    safeLogger.info("✔️ Database connected and tables synchronized");

    await initializeGrpcServices();

    // await initRedis();
    // safeLogger.info("✔️ Redis connection successful");

    // await initializeRabbitMQ();
    // safeLogger.info("✔️ RabbitMQ connection initialized");

    const server = app.listen(env.PORT, () => {
      safeLogger.info(`⚙️ Server is running on port ${env.PORT}`);
    });

    const gracefulShutdown = async () => {
      safeLogger.info("🔻 Graceful shutdown initiated");
      await sequelize.close();
      server.close(() => {
        safeLogger.info("🧹 Express server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    safeLogger.error("❌ Startup failed", {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

startServer();
