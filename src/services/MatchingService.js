import { v4 as uuidv4 } from "uuid";
import Event from "../core/Event.js";

/**
 * Matching Service - Handles communication with the external Matching Engine
 * Provides clean API for agents to request task assignments
 */
class MatchingService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.pendingRequests = new Map(); // Track pending requests
    this.requestTimeout = 20000; // 30 seconds timeout
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for matching responses
   */
  setupEventListeners() {
    this.eventBus.on(
      "matching.response",
      this.handleMatchingResponse.bind(this)
    );
    this.eventBus.on(
      "matching.request.failed",
      this.handleRequestFailed.bind(this)
    );
  }

  /**
   * Request task assignment from matching engine
   * @param {object} formData - Form data to process
   * @returns {Promise} Assignment result
   */
  requestTaskAssignment(event) {
    const correlationId = event.correlationId;

    const timeoutId = setTimeout(() => {
      const pending = this.pendingRequests.get(correlationId);
      if (!pending) return;

      this.pendingRequests.delete(correlationId);

      const failedEvent = new Event({
        type: "assignment.failed",
        data: {
          data: event.data,
          reason: "Timeout",
          error: `Matching request timeout for correlation: ${correlationId}`,
          failedAt: new Date().toISOString(),
        },
        correlationId,
        source: "MatchingService",
      });

      this.eventBus.emit(failedEvent);
    }, this.requestTimeout);

    this.pendingRequests.set(correlationId, {
      timeoutId,
      data: event.data,
      timestamp: Date.now(),
    });

    const matchingRequestEvent = new Event({
      type: "matching.request",
      data: event.data,
      correlationId,
      source: "MatchingService",
    });

    this.eventBus.emit(matchingRequestEvent);
  }

  async requestTaskReassignment(event) {
    const correlationId = event.correlationId;

    const timeoutId = setTimeout(() => {
      const pending = this.pendingRequests.get(correlationId);
      if (!pending) return;

      this.pendingRequests.delete(correlationId);

      const failedEvent = new Event({
        type: "assignment.failed",
        data: {
          data: event.data,
          reason: "Timeout",
          error: `Matching request timeout for correlation: ${correlationId}`,
          failedAt: new Date().toISOString(),
        },
        correlationId,
        source: "MatchingService",
      });

      this.eventBus.emit(failedEvent);
    }, this.requestTimeout);

    this.pendingRequests.set(correlationId, {
      timeoutId,
      data: event.data,
      timestamp: Date.now(),
    });

    const matchingRequestEvent = new Event({
      type: "matching.request",
      data: event.data,
      correlationId,
      source: "MatchingService",
    });

    this.eventBus.emit(matchingRequestEvent);

    console.log(
      `🔄 MatchingService: Sent reassignment request for task ${event.data}`
    );
  }

  async requestTaskRecovery(event) {
    const correlationId = event.correlationId;

    const timeoutId = setTimeout(() => {
      const pending = this.pendingRequests.get(correlationId);
      if (!pending) return;

      this.pendingRequests.delete(correlationId);

      const failedEvent = new Event({
        type: "assignment.failed",
        data: {
          data: event.data,
          reason: "Timeout",
          error: `Matching request timeout for correlation: ${correlationId}`,
          failedAt: new Date().toISOString(),
        },
        correlationId,
        source: "MatchingService",
      });

      this.eventBus.emit(failedEvent);
    }, this.requestTimeout);

    this.pendingRequests.set(correlationId, {
      timeoutId,
      data: event.data,
      timestamp: Date.now(),
    });

    const matchingRequestEvent = new Event({
      type: "matching.request",
      data: event.data,
      correlationId,
      source: "MatchingService",
    });

    this.eventBus.emit(matchingRequestEvent);

    console.log(
      `🚨 MatchingService: Sent recovery request for task ${event.data}`
    );
  }

  //   async checkUserAvailability(userId, requirements) {
  //     const correlationId = uuidv4();

  //     const requestData = {
  //       type: "USER_AVAILABILITY_CHECK",
  //       userId,
  //       requirements,
  //     const correlationId = uuidv4();

  //     const requestData = {
  //       type: "USER_AVAILABILITY_CHECK",
  //       userId,
  //       requirements,
  //       timestamp: Date.now(),
  //       correlationId,
  //     };

  //     // Create promise for response
  //     const responsePromise = new Promise((resolve, reject) => {
  //       const timeoutId = setTimeout(() => {
  //         this.pendingRequests.delete(correlationId);
  //         reject(
  //           new Error(
  //             `Availability check timeout for correlation: ${correlationId}`
  //           )
  //         );
  //       }, this.requestTimeout);

  //       this.pendingRequests.set(correlationId, {
  //         resolve,
  //         reject,
  //         timeoutId,
  //         requestData,
  //         timestamp: Date.now(),
  //       });
  //     });

  //     // Emit request event
  //     await this.eventBus.emit(
  //       "matching.request",
  //       {
  //         correlationId,
  //         data: requestData,
  //       },
  //       {
  //         correlationId,
  //         source: "MatchingService",
  //       }
  //     );

  //     console.log(
  //       `👤 MatchingService: Sent availability check for user ${userId}`
  //     );

  //     return responsePromise;
  //   }

  handleMatchingResponse(event) {
    const responseData = event.data;
    const correlationId = event.correlationId;

    if (!correlationId) {
      console.error("❌ MatchingService: Response without correlation ID");
      return;
    }

    const pendingRequest = this.pendingRequests.get(correlationId);

    if (!pendingRequest) {
      console.warn(
        `⚠️ MatchingService: No pending request found for: ${correlationId}`
      );
      return;
    }

    clearTimeout(pendingRequest.timeoutId);
    this.pendingRequests.delete(correlationId);

    const taskAssignedEvent = new Event({
      type: "task.assigned",
      data: responseData,
      correlationId,
      source: "MatchingService",
    });

    this.eventBus.emit(taskAssignedEvent);
  }

  handleRequestFailed(event) {
    const { correlationId, error } = event.data;
    const pending = this.pendingRequests.get(correlationId);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(correlationId);

    const assignmentFailedEvent = new Event({
      type: "assignment.failed",
      data: {
        data: pending.data,
        reason: "Matching request failed",
        error,
        failedAt: new Date().toISOString(),
      },
      correlationId,
      source: "MatchingService",
    });

    this.eventBus.emit(assignmentFailedEvent);
  }

  /**
   * Get service statistics
   * @returns {object} Statistics
   */
  getStats() {
    const pendingCount = this.pendingRequests.size;
    const oldestPending =
      pendingCount > 0
        ? Math.min(
            ...Array.from(this.pendingRequests.values()).map((r) => r.timestamp)
          )
        : null;

    return {
      pendingRequests: pendingCount,
      oldestPendingAge: oldestPending ? Date.now() - oldestPending : null,
      requestTimeout: this.requestTimeout,
    };
  }

  /**
   * Get pending requests (for monitoring)
   * @returns {array} Pending requests
   */
  getPendingRequests() {
    const pending = [];

    for (const [correlationId, request] of this.pendingRequests) {
      pending.push({
        correlationId,
        requestType: request.requestData.type,
        age: Date.now() - request.timestamp,
        formId: request.requestData.formId,
        taskId: request.requestData.taskId,
      });
    }

    return pending;
  }

  /**
   * Clean up expired requests (maintenance)
   */
  cleanupExpiredRequests() {
    const now = Date.now();
    const expiredRequests = [];

    for (const [correlationId, request] of this.pendingRequests) {
      if (now - request.timestamp > this.requestTimeout) {
        expiredRequests.push(correlationId);
        clearTimeout(request.timeoutId);
        request.reject(new Error(`Request expired: ${correlationId}`));
      }
    }

    // Remove expired requests
    for (const correlationId of expiredRequests) {
      this.pendingRequests.delete(correlationId);
    }

    if (expiredRequests.length > 0) {
      console.log(
        `🧹 MatchingService: Cleaned up ${expiredRequests.length} expired requests`
      );
    }
  }

  /**
   * Start cleanup interval (call this when service starts)
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 60000); // Clean up every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Health check
   * @returns {object} Health status
   */
  async healthCheck() {
    const stats = this.getStats();

    return {
      service: "MatchingService",
      status: "healthy",
      pendingRequests: stats.pendingRequests,
      oldestPendingAge: stats.oldestPendingAge,
      timestamp: new Date().toISOString(),
    };
  }
}

export default MatchingService;
