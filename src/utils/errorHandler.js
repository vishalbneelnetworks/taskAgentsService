import { ApiError } from "./ApiError.js";
import { safeLogger } from "../config/logger.js";

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    console.error(`API Error: ${err.message}`);
    if (err.errors && err.errors.length > 0) {
      console.error("Validation Errors:", err.errors);
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }

  safeLogger.error("Global Error", {
    message: err.message,
    statusCode: err.statusCode,
    details: err.details,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId || "unknown",
    user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
  });

  return res.status(500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
}

export { errorHandler };
