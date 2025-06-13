import companyClient from "./client/company.client.js";
import { safeLogger } from "../config/logger.js";

export const waitUntilGrpcServerIsReady = async (serviceName) => {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    companyClient.waitForReady(deadline, (err) => {
      if (err) {
        return reject(
          new Error(`Failed to connect to gRPC server: ${err.message}`)
        );
      }

      safeLogger.info(`${serviceName} gRPC server is ready`);
      resolve();
    });
  });
};

export const initializeGrpcServices = async () => {
  try {
    await waitUntilGrpcServerIsReady("Company");
  } catch (error) {
    safeLogger.error(error.message);
  }
};
