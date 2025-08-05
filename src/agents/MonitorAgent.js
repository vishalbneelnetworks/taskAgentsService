import Agent from "../core/Agent.js";
import Event from "../core/Event.js";

/**
 * Monitor Agent - Monitors tasks in progress and triggers retry if needed
 * Simple placeholder implementation (can be extended later)
 */
class MonitorAgent extends Agent {
  constructor(eventBus) {
    super(eventBus, "MonitorAgent");
    this.monitoringInterval = null;
    this.taskTimeouts = new Map(); // taskId → timeout info
    this.defaultTimeout = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Setup the agent - register event handlers
   */
  async setup() {
    // Listen for task assignments to start monitoring
    this.on("task.assigned", this.startTaskMonitoring);

    // Listen for task completions to stop monitoring
    this.on("task.completed", this.stopTaskMonitoring);

    // Listen for manual monitor requests
    this.on("monitor.task", this.handleMonitorRequest);

    // Start periodic monitoring
    this.startPeriodicMonitoring();

    this.log("info", "MonitorAgent setup complete");
  }

  /**
   * Start monitoring a task
   * @param {object} event - Task assigned event
   */
  async startTaskMonitoring(event) {
    const { taskId, assignedUserId, formId } = event.data;

    this.log("info", "Starting task monitoring", {
      taskId,
      assignedUserId,
      timeout: this.defaultTimeout,
    });

    // Store task for monitoring
    this.taskTimeouts.set(taskId, {
      taskId,
      assignedUserId,
      formId,
      startTime: Date.now(),
      timeout: this.defaultTimeout,
      lastCheck: Date.now(),
    });
  }

  /**
   * Stop monitoring a task
   * @param {object} event - Task completed event
   */
  async stopTaskMonitoring(event) {
    const { taskId } = event.data;

    if (this.taskTimeouts.has(taskId)) {
      this.taskTimeouts.delete(taskId);
      this.log("info", "Stopped task monitoring", { taskId });
    }
  }

  /**
   * Handle manual monitor request
   * @param {object} event - Monitor request event
   */
  async handleMonitorRequest(event) {
    const taskData = event.data;

    this.log("info", "Processing monitor request", {
      taskId: taskData.taskId,
      assignee: taskData.assignee,
    });

    // Check if task has timed out
    const isTimedOut = this.checkTaskTimeout(taskData);

    if (isTimedOut) {
      // Emit timeout event
      const timeoutEvent = new Event({
        type: "task.timeout",
        data: {
          taskId: taskData.taskId,
          assignee: taskData.assignee,
          timeoutReason: "No activity detected",
          detectedAt: new Date().toISOString(),
        },
        correlationId: event.correlationId,
        source: "MonitorAgent",
      });

      this.eventBus.emit(timeoutEvent);
    }
  }

  /**
   * Check if a task has timed out
   * @param {object} taskData - Task data to check
   * @returns {boolean} True if timed out
   */
  checkTaskTimeout(taskData) {
    const now = Date.now();
    const taskInfo = this.taskTimeouts.get(taskData.taskId);

    if (!taskInfo) {
      return false; // Task not being monitored
    }

    const elapsed = now - taskInfo.startTime;
    return elapsed > taskInfo.timeout;
  }

  /**
   * Start periodic monitoring of all tasks
   */
  startPeriodicMonitoring() {
    // Run every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.checkAllTasks();
    }, 5 * 60 * 1000);

    this.log("info", "Started periodic task monitoring");
  }

  /**
   * Check all monitored tasks for timeouts
   */
  async checkAllTasks() {
    if (this.taskTimeouts.size === 0) {
      return; // No tasks to monitor
    }

    const now = Date.now();
    const timedOutTasks = [];

    for (const [taskId, taskInfo] of this.taskTimeouts) {
      const elapsed = now - taskInfo.startTime;

      if (elapsed > taskInfo.timeout) {
        timedOutTasks.push(taskInfo);
      }
    }

    // Emit timeout events for timed out tasks
    for (const taskInfo of timedOutTasks) {
      this.log("warn", "Task timeout detected", {
        taskId: taskInfo.taskId,
        assignee: taskInfo.assignedUserId,
        elapsed: Date.now() - taskInfo.startTime,
      });

      const timeoutEvent = new Event({
        type: "task.timeout",
        data: {
          taskId: taskInfo.taskId,
          assignee: taskInfo.assignedUserId,
          formId: taskInfo.formId,
          timeoutReason: "Exceeded maximum processing time",
          elapsed: Date.now() - taskInfo.startTime,
          detectedAt: new Date().toISOString(),
        },
        source: "MonitorAgent",
      });

      this.eventBus.emit(timeoutEvent);

      // Remove from monitoring (will be handled by other agents)
      this.taskTimeouts.delete(taskInfo.taskId);
    }

    if (timedOutTasks.length > 0) {
      this.log("info", `Processed ${timedOutTasks.length} timed out tasks`);
    }
  }

  /**
   * Stop periodic monitoring
   */
  stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log("info", "Stopped periodic task monitoring");
    }
  }

  /**
   * Cleanup when agent stops
   */
  async cleanup() {
    this.stopPeriodicMonitoring();
    this.taskTimeouts.clear();
    await super.cleanup();
  }

  /**
   * Get agent-specific status
   * @returns {object} Agent status
   */
  async getAgentStatus() {
    const baseStatus = this.getStatus();

    return {
      ...baseStatus,
      monitoredTasks: this.taskTimeouts.size,
      defaultTimeout: this.defaultTimeout,
      periodicMonitoring: this.monitoringInterval !== null,
      capabilities: [
        "task.assigned → start monitoring",
        "task.completed → stop monitoring",
        "timeout detection → task.timeout",
        "periodic monitoring → task.timeout",
      ],
    };
  }
}

export default MonitorAgent;
