import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const env = {
  PORT: process.env.PORT || "3001",
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "0000",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_NAME: process.env.DB_NAME || "auth_service",
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "",
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://localhost",
  GRPC_COMPANY_SERVICE_HOST:
    process.env.GRPC_COMPANY_SERVICE_HOST || "localhost",
  GRPC_COMPANY_SERVICE_PORT: process.env.GRPC_COMPANY_SERVICE_PORT || "50051",
};
