import { safeLogger } from "../config/logger.js";
import { initializeCompanyHealth } from "./client/companyHealth.js";

export const initializeGrpcServices = async () => {
  try {
    initializeCompanyHealth();
  } catch (error) {
    safeLogger.error(error.message);
  }
};
