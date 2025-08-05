import Agent from "../core/Agent.js";
import Event from "../core/Event.js";

/**
 * Reassign Agent - Handles task reassignments when users skip/decline tasks
 * Simple placeholder implementation (can be extended later)
 */
class ReassignAgent extends Agent {
  constructor(eventBus, matchingService) {
    super(eventBus, "ReassignAgent");
    this.matchingService = matchingService;
  }

  /**
   * Setup the agent - register event handlers
   */
  async setup() {
    // Listen for task reassignment requests
    this.on("task.reassign.requested", this.handleTaskReassignment);

    // Listen for user declined tasks
    this.on("task.declined", this.handleTaskDeclined);

    this.log("info", "ReassignAgent setup complete");
  }

  /**
   * Handle task reassignment request
   * @param {object} event - Reassignment request event
   */
  async handleTaskReassignment(event) {
    const taskData = event.data;

    this.log("info", "Processing task reassignment", {
      taskId: taskData.taskId,
      currentAssignee: taskData.currentAssignee,
      reason: taskData.reason,
    });

    try {
      // Request reassignment from matching service
      const reassignmentResult =
        await this.matchingService.requestTaskReassignment(taskData);

      if (reassignmentResult.success) {
        this.log("info", "Task reassigned successfully", {
          taskId: taskData.taskId,
          previousAssignee: taskData.currentAssignee,
          newAssignee: reassignmentResult.assignedUserId,
        });

        // Emit task reassigned event
        const taskReassignedEvent = new Event({
          type: "task.reassigned",
          data: {
            taskId: taskData.taskId,
            previousAssignee: taskData.currentAssignee,
            newAssignee: reassignmentResult.assignedUserId,
            reason: taskData.reason,
            reassignedAt: new Date().toISOString(),
          },
          correlationId: event.correlationId,
          source: "ReassignAgent",
        });

        this.eventBus.emit(taskReassignedEvent);
      } else {
        this.log("error", "Task reassignment failed", {
          taskId: taskData.taskId,
          reason: reassignmentResult.reason,
        });

        // Emit reassignment failed event
        const reassignmentFailedEvent = new Event({
          type: "reassignment.failed",
          data: {
            taskId: taskData.taskId,
            reason: reassignmentResult.reason,
            failedAt: new Date().toISOString(),
          },
          correlationId: event.correlationId,
          source: "ReassignAgent",
        });

        this.eventBus.emit(reassignmentFailedEvent);
      }
    } catch (error) {
      this.log("error", "Error processing task reassignment", {
        taskId: taskData.taskId,
        error: error.message,
      });
    }
  }

  /**
   * Handle task declined by user
   * @param {object} event - Task declined event
   */
  async handleTaskDeclined(event) {
    const { taskId, userId, reason } = event.data;

    this.log("info", "Task declined by user", {
      taskId,
      userId,
      reason,
    });

    // Trigger reassignment
    const taskReassignRequestedEvent = new Event({
      type: "task.reassign.requested",
      data: {
        taskId,
        currentAssignee: userId,
        reason: `User d eclined: ${reason}`,
        priority: "normal",
      },
      correlationId: event.correlationId,
      source: "ReassignAgent",
    });

    this.eventBus.emit(taskReassignRequestedEvent);
  }

  /**
   * Get agent-specific status
   * @returns {object} Agent status
   */
  async getAgentStatus() {
    const baseStatus = this.getStatus();

    return {
      ...baseStatus,
      capabilities: [
        "task.reassign.requested → task.reassigned",
        "task.declined → reassignment trigger",
        "error handling → reassignment.failed",
      ],
    };
  }
}

export default ReassignAgent;
