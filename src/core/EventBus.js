import { v4 as uuidv4 } from "uuid";
import Event from "./Event.js";

/**
 * Optimized In-Memory Event Bus
 * - Continuous event processing (no batch blocking)
 * - Per-handler queues for isolation
 * - Fire-and-forget execution
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Register an event handler
   * Each handler gets its own queue so slow handlers don't block others
   */
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push({
      handler,
      id: uuidv4(),
      name: handler.name || "anonymous",
      queue: [],
      processing: false,
    });
  }

  /**
   * Remove an event handler
   */
  off(eventType, handler) {
    if (this.listeners.has(eventType)) {
      const handlers = this.listeners.get(eventType);
      const filtered = handlers.filter((h) => h.handler !== handler);
      this.listeners.set(eventType, filtered);
    }
  }

  /**
   * Emit an event (non-blocking)
   */
  emit(event) {
    if (!(event instanceof Event)) {
      throw new Error("EventBus.emit expects an Event instance");
    }

    // Add to history
    this.addToHistory(event);

    // Dispatch to all relevant handlers
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((handlerInfo) => {
      handlerInfo.queue.push(event);
      this.processHandlerQueue(handlerInfo);
    });
  }

  /**
   * Process a handler's queue sequentially
   * (ensures handler won't be overwhelmed but others still run independently)
   */
  async processHandlerQueue(handlerInfo) {
    if (handlerInfo.processing) return;
    handlerInfo.processing = true;

    while (handlerInfo.queue.length > 0) {
      const event = handlerInfo.queue.shift();
      await this.safeExecuteHandler(handlerInfo, event);
    }

    handlerInfo.processing = false;
  }

  /**
   * Safely execute a handler with error isolation
   */
  async safeExecuteHandler(handlerInfo, event) {
    const { handler, name } = handlerInfo;
    try {
      await Promise.resolve(handler(event));
    } catch (error) {
      console.error(
        `❌ EventBus: Handler '${name}' failed for '${event.type}':`,
        error.message
      );

      // Emit error event for monitoring (non-blocking)
      setImmediate(() => {
        const handlerErrorEvent = new Event({
          type: "handler.error",
          data: {
            originalEvent: event,
            handlerName: name,
            error: {
              message: error.message,
              stack: error.stack,
            },
          },
          correlationId: event.correlationId,
          source: "EventBus",
        });
        this.emit(handlerErrorEvent);
      });
    }
  }

  /**
   * Add event to history for debugging
   */
  addToHistory(event) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history for debugging
   */
  getHistory(eventType = null) {
    if (eventType) {
      return this.eventHistory.filter((event) => event.type === eventType);
    }
    return this.eventHistory;
  }

  /**
   * Get statistics about the event bus
   */
  getStats() {
    const listenerCount = Array.from(this.listeners.values()).reduce(
      (total, handlers) => total + handlers.length,
      0
    );

    return {
      totalListeners: listenerCount,
      eventTypes: this.listeners.size,
      historySize: this.eventHistory.length,
    };
  }

  /**
   * Clear all listeners and history (for testing)
   */
  clear() {
    this.listeners.clear();
    this.eventHistory.length = 0;
  }
}

export default EventBus;
