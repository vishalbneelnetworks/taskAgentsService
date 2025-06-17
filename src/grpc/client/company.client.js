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
  grpc.credentials.createInsecure()
);

const DEADLINE_MS = 10000;

export const findSalesPerson = () => {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + DEADLINE_MS;

    safeLogger.info("Sending request to find sales person");

    client.FindSalesPerson({ deadline }, (err, response) => {
      if (err) {
        safeLogger.error("gRPC error:", err);

        const friendlyError = {
          message: err.message,
          code: err.code,
          status: grpc.status[err.code] || "UNKNOWN",
        };

        return reject(friendlyError);
      }

      if (!response || !response.success) {
        return reject(new Error("Failed to get sales person data"));
      }

      resolve(response);
    });
  });
};

export default client;
