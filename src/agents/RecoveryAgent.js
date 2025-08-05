import Agent from "../core/Agent.js";
import Event from "../core/Event.js";

/**
 * Recovery Agent - Handles tasks that failed after max retries
 * Simple placeholder implementation (can be extended later)
 */
class RecoveryAgent extends Agent {
  constructor(eventBus, matchingService) {
    super(eventBus, "RecoveryAgent");
    this.matchingService = matchingService;
    this.maxRecoveryAttempts = 3;
    this.recoveryAttempts = new Map(); // taskId → attempt count
  }

  /**
   * Setup the agent - register event handlers
   */
  async setup() {
    // Listen for task timeouts from MonitorAgent
    this.on("task.timeout", this.handleTaskTimeout);

    // Listen for assignment failures that need recovery
    this.on("assignment.failed", this.handleAssignmentFailure);

    // Listen for reassignment failures
    this.on("reassignment.failed", this.handleReassignmentFailure);

    // Listen for recovery requests
    this.on("task.recovery.requested", this.handleRecoveryRequest);

    this.log("info", "RecoveryAgent setup complete");
  }

  /**
   * Handle task timeout from MonitorAgent
   * @param {object} event - Task timeout event
   */
  async handleTaskTimeout(event) {
    const { taskId, assignee, timeoutReason } = event.data;

    this.log("warn", "Task timeout detected", {
      taskId,
      assignee,
      timeoutReason,
    });

    // Trigger recovery process
    await this.initiateRecovery(taskId, {
      reason: "timeout",
      originalAssignee: assignee,
      timeoutReason,
      recoveryType: "timeout_recovery",
    });
  }

  /**
   * Handle assignment failure that needs recovery
   * @param {object} event - Assignment failure event
   */
  async handleAssignmentFailure(event) {
    const { formId, reason, error } = event.data;

    this.log("warn", "Assignment failure detected", {
      formId,
      reason,
      error,
    });

    // Check if this failure needs recovery
    if (this.shouldAttemptRecovery(formId, reason)) {
      await this.initiateRecovery(formId, {
        reason: "assignment_failure",
        error,
        recoveryType: "assignment_recovery",
      });
    } else {
      // Too many attempts, escalate
      await this.escalateTask(formId, "max_recovery_attempts_exceeded");
    }
  }

  /**
   * Handle reassignment failure
   * @param {object} event - Reassignment failure event
   */
  async handleReassignmentFailure(event) {
    const { taskId, reason } = event.data;

    this.log("warn", "Reassignment failure detected", {
      taskId,
      reason,
    });

    // Try recovery
    await this.initiateRecovery(taskId, {
      reason: "reassignment_failure",
      originalReason: reason,
      recoveryType: "reassignment_recovery",
    });
  }

  /**
   * Handle manual recovery request
   * @param {object} event - Recovery request event
   */
  async handleRecoveryRequest(event) {
    const { taskId, recoveryReason, requestedBy } = event.data;

    this.log("info", "Manual recovery requested", {
      taskId,
      recoveryReason,
      requestedBy,
    });

    await this.initiateRecovery(taskId, {
      reason: "manual_request",
      recoveryReason,
      requestedBy,
      recoveryType: "manual_recovery",
    });
  }

  /**
   * Initiate recovery process for a task
   * @param {string} taskId - Task ID to recover
   * @param {object} recoveryInfo - Recovery information
   */
  async initiateRecovery(taskId, recoveryInfo) {
    const attemptCount = this.getRecoveryAttemptCount(taskId);

    if (attemptCount >= this.maxRecoveryAttempts) {
      this.log("error", "Max recovery attempts exceeded", {
        taskId,
        attemptCount,
        maxAttempts: this.maxRecoveryAttempts,
      });

      await this.escalateTask(taskId, "max_recovery_attempts_exceeded");
      return;
    }

    this.incrementRecoveryAttempt(taskId);

    this.log("info", "Starting recovery process", {
      taskId,
      attemptCount: attemptCount + 1,
      recoveryType: recoveryInfo.recoveryType,
    });

    try {
      // Request recovery assignment from matching service
      const recoveryResult = await this.matchingService.requestTaskRecovery({
        taskId,
        failureReason: recoveryInfo.reason,
        retryCount: attemptCount + 1,
        originalAssignee: recoveryInfo.originalAssignee,
        recoveryType: recoveryInfo.recoveryType,
      });

      if (recoveryResult.success) {
        this.log("info", "Task recovery successful", {
          taskId,
          recoveredBy: recoveryResult.assignedUserId,
          recoveryAction: recoveryResult.action,
        });

        // Clear recovery attempts (successful)
        this.recoveryAttempts.delete(taskId);

        // Emit recovery success event
        const taskRecoveredEvent = new Event({
          type: "task.recovered",
          data: {
            taskId,
            recoveredBy: recoveryResult.assignedUserId,
            recoveryAction: recoveryResult.action,
            attemptCount: attemptCount + 1,
            recoveryType: recoveryInfo.recoveryType,
            recoveredAt: new Date().toISOString(),
          },
          source: "RecoveryAgent",
        });

        this.eventBus.emit(taskRecoveredEvent);
      } else {
        this.log("error", "Task recovery failed", {
          taskId,
          reason: recoveryResult.reason,
          attemptCount: attemptCount + 1,
        });

        // Check if we should try again or escalate
        if (attemptCount + 1 >= this.maxRecoveryAttempts) {
          await this.escalateTask(taskId, recoveryResult.reason);
        }
      }
    } catch (error) {
      this.log("error", "Error during recovery process", {
        taskId,
        error: error.message,
        attemptCount: attemptCount + 1,
      });

      // Check if we should escalate
      if (attemptCount + 1 >= this.maxRecoveryAttempts) {
        await this.escalateTask(taskId, error.message);
      }
    }
  }

  /**
   * Escalate a task that couldn't be recovered
   * @param {string} taskId - Task ID to escalate
   * @param {string} reason - Escalation reason
   */
  async escalateTask(taskId, reason) {
    this.log("error", "Escalating task", {
      taskId,
      reason,
      attemptCount: this.getRecoveryAttemptCount(taskId),
    });

    // Clear recovery attempts
    this.recoveryAttempts.delete(taskId);

    // Emit escalation event
    const taskEscalatedEvent = new Event({
      type: "task.escalated",
      data: {
        taskId,
        reason,
        escalatedAt: new Date().toISOString(),
        requiresManualIntervention: true,
      },
      source: "RecoveryAgent",
    });

    this.eventBus.emit(taskEscalatedEvent);
  }

  /**
   * Check if recovery should be attempted
   * @param {string} taskId - Task ID
   * @param {string} reason - Failure reason
   * @returns {boolean} True if recovery should be attempted
   */
  shouldAttemptRecovery(taskId, reason) {
    const attemptCount = this.getRecoveryAttemptCount(taskId);

    // Don't attempt recovery if max attempts exceeded
    if (attemptCount >= this.maxRecoveryAttempts) {
      return false;
    }

    // Don't attempt recovery for certain types of failures
    const nonRecoverableReasons = [
      "invalid_form_data",
      "malformed_request",
      "authentication_failure",
    ];

    return !nonRecoverableReasons.includes(reason);
  }

  /**
   * Get recovery attempt count for a task
   * @param {string} taskId - Task ID
   * @returns {number} Attempt count
   */
  getRecoveryAttemptCount(taskId) {
    return this.recoveryAttempts.get(taskId) || 0;
  }

  /**
   * Increment recovery attempt count for a task
   * @param {string} taskId - Task ID
   */
  incrementRecoveryAttempt(taskId) {
    const currentCount = this.getRecoveryAttemptCount(taskId);
    this.recoveryAttempts.set(taskId, currentCount + 1);
  }

  /**
   * Get agent-specific status
   * @returns {object} Agent status
   */
  async getAgentStatus() {
    const baseStatus = this.getStatus();
    const activeRecoveries = Array.from(this.recoveryAttempts.entries()).map(
      ([taskId, attempts]) => ({ taskId, attempts })
    );

    return {
      ...baseStatus,
      activeRecoveries: this.recoveryAttempts.size,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      recoveryDetails: activeRecoveries,
      capabilities: [
        "task.timeout → recovery initiation",
        "assignment.failed → recovery attempt",
        "reassignment.failed → recovery attempt",
        "max attempts → task.escalated",
        "recovery success → task.recovered",
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
      activeRecoveries: this.recoveryAttempts.size,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
    };
  }
}

export default RecoveryAgent;
