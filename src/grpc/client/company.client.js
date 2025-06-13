import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../../config/env.js";
import { safeLogger } from "../../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "../proto/company.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const CompanyPackage = grpcObject.company;

const client = new CompanyPackage.CompanyService(
  `${env.GRPC_COMPANY_SERVICE_HOST}:${env.GRPC_COMPANY_SERVICE_PORT}`,
  grpc.credentials.createInsecure(),
  {
    "grpc.keepalive_time_ms": 30000,
    "grpc.keepalive_timeout_ms": 10000,
    "grpc.http2.min_time_between_pings_ms": 10000,
    "grpc.keepalive_permit_without_calls": 1,
    "grpc.max_receive_message_length": -1,
    "grpc.max_send_message_length": -1,
  }
);

const DEADLINE_MS = 10000;

export const findSalesPerson = () => {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + DEADLINE_MS;

    safeLogger.info("Sending request to find sales person");

    client.FindSalesPerson({ deadline }, (err, response) => {
      if (err) {
        safeLogger.error("gRPC error:", err);
        if (err.code === grpc.status.UNAVAILABLE) {
          return reject(new Error("Company service is currently unavailable"));
        }
        if (err.code === grpc.status.DEADLINE_EXCEEDED) {
          return reject(new Error("Request timed out"));
        }
        return reject(new Error(err.message));
      }

      if (!response || !response.success) {
        return reject(new Error("Failed to get sales person data"));
      }

      resolve(response);
    });
  });
};

export default client;
