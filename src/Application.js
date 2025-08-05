// Core modules
import EventBus from "./core/EventBus.js";
import EventStore from "./core/EventStore.js";
import MessageBroker from "./core/MessageBroker.js";
import Event from "./core/Event.js";

// Services
import MatchingService from "./services/MatchingService.js";
import AuditService from "./services/AuditService.js";

// Agents
import AssignAgent from "./agents/AssignAgent.js";
import ReassignAgent from "./agents/ReassignAgent.js";
import MonitorAgent from "./agents/MonitorAgent.js";
import RecoveryAgent from "./agents/RecoveryAgent.js";

// connection
import rabbitMQConnection from "./events/connection.js";

// Dummy matching engine (will be replaced with real service later)
import { dummyMatchingEngine } from "./utils/dummyMatchingEngine.js";

/**
 * Main Application Class - Bootstraps the entire Event-Driven system
 * This is the single entry point that starts everything
 */
class Application {
  constructor() {
    this.isRunning = false;
    this.components = {};
    this.agents = {};
  }

  /**
   * Initialize and start the entire system
   */
  async start() {
    try {
      console.log("🚀 Starting Event-Driven Agent System...");

      await rabbitMQConnection.init();

      await this.initializeCoreModules();

      await this.initializeServices();

      await this.initializeAgents();

      await this.startExternalIntegrations();

      await this.startAllComponents();

      this.isRunning = true;
      console.log("✅ Event-Driven Agent System started successfully!");
    } catch (error) {
      console.error("❌ Failed to start system:", error.message);
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Initialize core modules
   */
  async initializeCoreModules() {
    this.components.eventBus = new EventBus();

    this.components.eventStore = new EventStore();

    this.components.messageBroker = new MessageBroker(this.components.eventBus);
    await this.components.messageBroker.initialize();

    this.components.eventBus.on("*", async (event) => {
      await this.components.eventStore.store(event);
    });

    console.log("✅ Core modules initialized");
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    this.components.matchingService = new MatchingService(
      this.components.eventBus
    );
    this.components.matchingService.startCleanupInterval();

    this.components.auditService = new AuditService(this.components.eventBus);
    this.components.auditService.start();

    console.log("✅ Services initialized");
  }

  /**
   * Initialize agents
   */
  async initializeAgents() {
    this.agents.assignAgent = new AssignAgent(
      this.components.eventBus,
      this.components.matchingService
    );

    this.agents.reassignAgent = new ReassignAgent(
      this.components.eventBus,
      this.components.matchingService
    );

    this.agents.monitorAgent = new MonitorAgent(this.components.eventBus);

    this.agents.recoveryAgent = new RecoveryAgent(
      this.components.eventBus,
      this.components.matchingService
    );

    console.log("✅ Agents initialized");
  }

  /**
   * Start external integrations
   */
  async startExternalIntegrations() {
    await dummyMatchingEngine.start();

    await this.components.messageBroker.startConsuming();

    console.log("✅ External integrations started");
  }

  /**
   * Start all components
   */
  async startAllComponents() {
    let arrayOfAgents = [];

    for (const [_, agent] of Object.entries(this.agents)) {
      arrayOfAgents.push(agent.start());
    }

    await Promise.all(arrayOfAgents);
    console.log("✅ All agents started");
  }

  /**
   * Display system status
   */
  displaySystemStatus() {
    console.log("\n📊 System Status:");
    console.log("================");

    const eventBusStats = this.components.eventBus.getStats();
    console.log(
      `🔥 EventBus: ${eventBusStats.totalListeners} listeners, ${eventBusStats.eventTypes} event types`
    );

    // Agent status
    for (const [name, agent] of Object.entries(this.agents)) {
      const status = agent.getStatus();
      console.log(
        `🤖 ${status.name}: ${status.isActive ? "Active" : "Inactive"} (${
          status.eventHandlerCount
        } handlers)`
      );
    }

    // Service status
    const matchingStats = this.components.matchingService.getStats();
    console.log(
      `🎯 MatchingService: ${matchingStats.pendingRequests} pending requests`
    );

    const auditStats = this.components.auditService.getStatistics();
    console.log(`📋 AuditService: ${auditStats.totalLogs} total logs`);

    console.log("================\n");
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth() {
    const health = {
      system: {
        status: this.isRunning ? "running" : "stopped",
        uptime: this.isRunning ? Date.now() - this.startTime : 0,
        timestamp: new Date().toISOString(),
      },
      components: {},
      agents: {},
      statistics: {},
    };

    try {
      // Component health
      health.components.eventBus = this.components.eventBus.getStats();
      health.components.eventStore = this.components.eventStore.getStatistics();
      health.components.messageBroker =
        await this.components.messageBroker.healthCheck();
      health.components.matchingService =
        await this.components.matchingService.healthCheck();
      health.components.auditService =
        await this.components.auditService.healthCheck();

      // Agent health
      for (const [name, agent] of Object.entries(this.agents)) {
        health.agents[name] = await agent.healthCheck();
      }

      // System statistics
      health.statistics.recentActivity =
        this.components.auditService.getRecentActivity(10);
    } catch (error) {
      health.error = error.message;
    }

    return health;
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      eventBus: this.components.eventBus.getStats(),
      eventStore: this.components.eventStore.getStatistics(),
      matchingService: this.components.matchingService.getStats(),
      auditService: this.components.auditService.getStatistics(),
      agents: Object.fromEntries(
        Object.entries(this.agents).map(([name, agent]) => [
          name,
          agent.getStatus(),
        ])
      ),
    };
  }

  /**
   * Test the system with a sample form submission
   */
  async testFormSubmission() {
    const testData = "test";

    console.log("🧪 Testing system with form submission:", testData);

    const event = new Event({
      type: "form.submitted",
      data: { testData },
      source: "test",
    });

    // Emit form submission event
    this.components.eventBus.emit(event);

    return {
      eventId: event.id,
      testData,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gracefully shutdown the system
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log("🔻 Shutting down Event-Driven Agent System...");

    try {
      // Stop agents
      for (const [name, agent] of Object.entries(this.agents)) {
        await agent.stop();
        console.log(`🛑 ${name} stopped`);
      }

      // Stop services
      this.components.matchingService?.stopCleanupInterval();
      this.components.auditService?.stop();

      // Stop external integrations
      dummyMatchingEngine.stop();
      await this.components.messageBroker?.stop();

      // Clear event bus
      this.components.eventBus?.clear();

      this.isRunning = false;
      console.log("✅ System shutdown complete");
    } catch (error) {
      console.error("❌ Error during shutdown:", error.message);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n📞 Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  }
}

export default Application;
