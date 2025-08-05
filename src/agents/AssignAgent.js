import Agent from "../core/Agent.js";

/**
 * Assign Agent - Handles new form submissions and assigns them to users
 * Simple, event-driven implementation in a single file
 */
class AssignAgent extends Agent {
  constructor(eventBus, matchingService) {
    super(eventBus, "AssignAgent");
    this.matchingService = matchingService;
  }

  /**
   * Setup the agent - register event handlers
   */
  async setup() {
    this.on("form.submitted", this.handleFormSubmission.bind(this));
    this.on("task.assigned", this.handleTaskAssigned.bind(this));
    this.on("assignment.failed", this.handleAssignmentFailed.bind(this));
    this.log("info", "AssignAgent setup complete");
  }

  /**
   * Handle form submission event
   * @param {object} event - Form submission event
   */
  async handleFormSubmission(event) {
    const testData = event.data;

    this.log("info", "Processing form submission", testData);

    this.matchingService.requestTaskAssignment(event);
  }

  async handleTaskAssigned(event) {
    const testData = event.data;
    const correlationId = event.correlationId;

    this.log("info", "Task assigned successfully", testData);
  }

  async handleAssignmentFailed(event) {
    const { testData, reason, error, failedAt } = event.data;
    const correlationId = event.correlationId;
    this.log("error", "Task assignment failed", {
      testData,
      reason,
      error,
      failedAt,
      correlationId,
    });
  }

  /**
   * Get agent-specific status
   * @returns {object} Agent status
   */
  async getAgentStatus() {
    const baseStatus = this.getStatus();
    const matchingStats = this.matchingService.getStats();

    return {
      ...baseStatus,
      matchingService: {
        pendingRequests: matchingStats.pendingRequests,
        oldestPendingAge: matchingStats.oldestPendingAge,
      },
      capabilities: [
        "form.submitted → task.assigned",
        "error handling → assignment.failed",
      ],
    };
  }

  /**
   * Health check for the agent
   * @returns {object} Health status
   */
  async healthCheck() {
    const baseHealth = await super.healthCheck();
    const matchingHealth = await this.matchingService.healthCheck();

    return {
      ...baseHealth,
      dependencies: [matchingHealth],
      lastProcessed: this.lastProcessedFormId || null,
    };
  }
}

export default AssignAgent;
