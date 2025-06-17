import { safeLogger } from "../../config/logger.js";
import client from "./company.client.js";
import grpc from "@grpc/grpc-js";

class CompanyHealthMonitor {
  constructor() {
    this.isServiceAvailable = false;
    this.channel = null;
    this.isMonitoring = false;
    this.lastKnownState = null;
  }

  initialize() {
    try {
      this.channel = client.getChannel();
      this.startMonitoringLoop();
    } catch (error) {
      safeLogger.error("Failed to initialize company health monitor:", error);
    }
  }

  startMonitoringLoop() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    const monitor = async () => {
      while (this.isMonitoring) {
        try {
          const currentState = this.channel.getConnectivityState(true);
          this.handleStateChange(currentState);

          await new Promise((resolve) => {
            this.channel.watchConnectivityState(
              currentState,
              Date.now() + 30000,
              (error) => {
                if (error) {
                  safeLogger.info("state not changed continue monitoring");
                }
                resolve();
              }
            );
          });
        } catch (err) {
          safeLogger.error("Error in monitoring loop:", err);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    };

    monitor();
  }

  handleStateChange(state) {
    if (state === this.lastKnownState) return;

    this.lastKnownState = state;

    switch (state) {
      case grpc.connectivityState.READY:
        this.isServiceAvailable = true;
        safeLogger.info("✅ Company service is connected and ready");
        break;
      case grpc.connectivityState.CONNECTING:
        this.isServiceAvailable = false;
        safeLogger.info("🔄 Connecting to company service...");
        break;
      case grpc.connectivityState.TRANSIENT_FAILURE:
        this.isServiceAvailable = false;
        safeLogger.error(
          "❌ Company service is unavailable (will retry automatically)"
        );
        break;
      case grpc.connectivityState.IDLE:
        this.isServiceAvailable = false;
        safeLogger.info("⏸️ Company service connection is idle");
        break;
      case grpc.connectivityState.SHUTDOWN:
        this.isServiceAvailable = false;
        safeLogger.error("🔴 Company service connection is shut down");
        break;
      default:
        this.isServiceAvailable = false;
        safeLogger.warn(`❓ Unknown state: ${this.getStateString(state)}`);
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    safeLogger.info("⛔ Monitoring loop stopped.");
  }

  getStateString(state) {
    const stateMap = {
      [grpc.connectivityState.IDLE]: "IDLE",
      [grpc.connectivityState.CONNECTING]: "CONNECTING",
      [grpc.connectivityState.READY]: "READY",
      [grpc.connectivityState.TRANSIENT_FAILURE]: "TRANSIENT_FAILURE",
      [grpc.connectivityState.SHUTDOWN]: "SHUTDOWN",
    };
    return stateMap[state] || `UNKNOWN(${state})`;
  }

  isHealthy() {
    return this.isServiceAvailable;
  }
}

const companyHealthMonitor = new CompanyHealthMonitor();

function initializeCompanyHealth() {
  companyHealthMonitor.initialize();
}

function stopMonitoring() {
  companyHealthMonitor.stopMonitoring();
}

export { initializeCompanyHealth, stopMonitoring };
