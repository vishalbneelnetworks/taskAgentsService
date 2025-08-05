/**
 * Base Agent Class - Template for all agents
 * Provides common functionality and event handling
 */
import Event from "./Event.js";
class Agent {
  constructor(eventBus, name = null) {
    this.eventBus = eventBus;
    this.name = name || this.constructor.name;
    this.isActive = false;
    this.eventHandlers = new Map();

    console.log(`🤖 ${this.name}: Agent created`);
  }

  /**
   * Start the agent - register event handlers
   */
  async start() {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    await this.setup();
    console.log(`🚀 ${this.name}: Agent started successfully`);
  }

  /**
   * Stop the agent - cleanup resources
   */
  async stop() {
    if (!this.isActive) {
      return;
    }

    for (const [eventType, handler] of this.eventHandlers) {
      this.eventBus.off(eventType, handler);
    }
    this.eventHandlers.clear();

    await this.cleanup();

    this.isActive = false;
    console.log(`🛑 ${this.name}: Agent stopped`);
  }

  /**
   * Register an event handler
   * @param {string} eventType - Event type to listen for
   * @param {function} handler - Handler function
   */
  on(eventType, handler) {
    if (!this.isActive) {
      return;
    }

    const wrappedHandler = async (event) => {
      try {
        await handler.call(this, event);
        console.log(`✅ ${this.name}: Completed processing '${eventType}'`);
      } catch (error) {
        console.error(
          `❌ ${this.name}: Error processing '${eventType}':`,
          error.message
        );
        const agentErrorEvent = new Event({
          type: "agent.error",
          data: {
            agentName: this.name,
            eventType,
            error: error.message,
            originalEvent: event,
          },
          correlationId: event.correlationId,
          source: this.name,
        });
        this.emit(agentErrorEvent);
      }
    };

    this.eventBus.on(eventType, wrappedHandler);
    this.eventHandlers.set(eventType, wrappedHandler);
  }

  /**
   * Emit an event
   * @param {object} event - Event object
   */
  emit(event) {
    this.eventBus.emit(event);
  }

  /**
   * Log a message with agent context
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Message to log
   * @param {object} data - Additional data
   */
  log(level, message, data = {}) {
    const logMessage = `[${this.name}] ${message}`;

    switch (level) {
      case "warn":
        console.warn(`⚠️ ${logMessage}`, data);
        break;
      case "error":
        console.error(`❌ ${logMessage}`, data);
        break;
      default:
        console.log(`ℹ️ ${logMessage}`, data);
    }
  }

  /**
   * Get agent status
   * @returns {object} Agent status
   */
  getStatus() {
    return {
      name: this.name,
      isActive: this.isActive,
      eventHandlerCount: this.eventHandlers.size,
      registeredEvents: Array.from(this.eventHandlers.keys()),
    };
  }

  /**
   * Setup method - Override in child classes
   * Called when agent starts
   */
  async setup() {}

  /**
   * Cleanup method - Override in child classes
   * Called when agent stops
   */
  async cleanup() {}

  /**
   * Health check method - Override in child classes
   * @returns {object} Health status
   */
  async healthCheck() {
    return {
      agent: this.name,
      status: this.isActive ? "healthy" : "inactive",
      timestamp: new Date().toISOString(),
    };
  }
}

export default Agent;
