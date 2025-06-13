//src/config/logger.js
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { getCorrelationId } from "./requestContext.js";

const logFormat = winston.format.printf(
  ({ level, message, timestamp, stack, ...meta }) => {
    const correlationId = getCorrelationId();
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(stack && { stack }),
      correlationId,
      ...meta,
    });
  }
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "5m",
      maxFiles: "14d",
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "5m",
      maxFiles: "14d",
      zippedArchive: true,
    }),
  ],
});

const sanitize = (data) => {
  const sensitive = ["password", "token", "secret", "apiKey"];
  const cloned = { ...data };
  for (const key of sensitive) {
    if (cloned[key]) cloned[key] = "[REDACTED]";
  }
  return cloned;
};

const safeLogger = {
  error: (msg, meta = {}) => logger.error(msg, sanitize(meta)),
  warn: (msg, meta = {}) => logger.warn(msg, sanitize(meta)),
  info: (msg, meta = {}) => logger.info(msg, sanitize(meta)),
  debug: (msg, meta = {}) => logger.debug(msg, sanitize(meta)),
};

export { logger, safeLogger };
