/**
 * Audit Service - Centralized logging and audit trail
 * Listens to all important events and logs them
 */
class AuditService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.auditLogs = []; // In-memory audit trail
    this.maxLogs = 5000; // Prevent memory overflow
    this.isActive = false;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for audit logging
   */
  setupEventListeners() {
    // Core business events
    this.eventBus.on("form.submitted", this.logFormSubmission.bind(this));
    this.eventBus.on("task.assigned", this.logTaskAssignment.bind(this));
    this.eventBus.on("task.reassigned", this.logTaskReassignment.bind(this));
    this.eventBus.on("task.recovered", this.logTaskRecovery.bind(this));
    this.eventBus.on("assignment.failed", this.logAssignmentFailure.bind(this));

    // System events
    this.eventBus.on("agent.error", this.logAgentError.bind(this));
    this.eventBus.on("handler.error", this.logHandlerError.bind(this));
    this.eventBus.on(
      "matching.request.sent",
      this.logMatchingRequest.bind(this)
    );
    this.eventBus.on("matching.response", this.logMatchingResponse.bind(this));

    console.log("📋 AuditService: Event listeners setup complete");
  }

  /**
   * Start the audit service
   */
  start() {
    this.isActive = true;
    console.log("📋 AuditService: Started successfully");
  }

  /**
   * Stop the audit service
   */
  stop() {
    this.isActive = false;
    console.log("📋 AuditService: Stopped");
  }

  /**
   * Generic audit log method
   * @param {string} event - Event type
   * @param {string} level - Log level (info, warn, error)
   * @param {object} data - Event data
   * @param {string} source - Source of the event
   */
  audit(event, level, data, source = "system") {
    if (!this.isActive) return;

    const auditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      event,
      level,
      data,
      source,
    };

    // Store in audit trail
    this.auditLogs.push(auditEntry);
    this.cleanupOldLogs();

    // Log to console with appropriate level
    this.logToConsole(auditEntry);
  }

  /**
   * Generate unique audit ID
   * @returns {string} Audit ID
   */
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log to console with appropriate formatting
   * @param {object} auditEntry - Audit entry
   */
  logToConsole(auditEntry) {
    const logMessage = `📋 AUDIT [${auditEntry.event}]: ${auditEntry.source}`;

    switch (auditEntry.level) {
      case "error":
        console.error(`❌ ${logMessage}`, auditEntry.data);
        break;
      case "warn":
        console.warn(`⚠️ ${logMessage}`, auditEntry.data);
        break;
      default:
        console.log(`ℹ️ ${logMessage}`, auditEntry.data);
    }
  }

  /**
   * Log form submission
   * @param {object} event - Form submission event
   */
  async logFormSubmission(event) {
    const data = event.data;
    this.audit(
      "FORM_SUBMITTED",
      "info",
      {
        data,
        submissionTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log task assignment
   * @param {object} event - Task assignment event
   */
  async logTaskAssignment(event) {
    const data = event.data;

    this.audit(
      "TASK_ASSIGNED",
      "info",
      {
        data,
        assignmentTime: event.timestamp,
        success: true,
      },
      event.source
    );
  }

  /**
   * Log task reassignment
   * @param {object} event - Task reassignment event
   */
  async logTaskReassignment(event) {
    const { taskId, previousAssignee, newAssignee, reason } = event.data;

    this.audit(
      "TASK_REASSIGNED",
      "info",
      {
        taskId,
        previousAssignee,
        newAssignee,
        reason,
        reassignmentTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log task recovery
   * @param {object} event - Task recovery event
   */
  async logTaskRecovery(event) {
    const { taskId, recoveryAction, assignedUserId } = event.data;

    this.audit(
      "TASK_RECOVERED",
      "warn",
      {
        taskId,
        recoveryAction,
        assignedUserId,
        recoveryTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log assignment failure
   * @param {object} event - Assignment failure event
   */
  async logAssignmentFailure(event) {
    const { data, reason, error } = event.data;

    this.audit(
      "ASSIGNMENT_FAILED",
      "error",
      {
        data,
        reason,
        error,
        failureTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log agent error
   * @param {object} event - Agent error event
   */
  async logAgentError(event) {
    const { agentName, eventType, error } = event.data;

    this.audit(
      "AGENT_ERROR",
      "error",
      {
        agentName,
        eventType,
        error,
        errorTime: event.timestamp,
      },
      event.source
    );
  }

  async logHandlerError(event) {
    const { handlerName, error, originalEvent } = event.data;
    this.audit(
      "HANDLER_ERROR",
      "error",
      {
        handlerName,
        error,
        originalEvent,
        errorTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log matching request
   * @param {object} event - Matching request event
   */
  async logMatchingRequest(event) {
    const { correlationId } = event.data;

    this.audit(
      "MATCHING_REQUEST_SENT",
      "info",
      {
        correlationId,
        requestTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Log matching response
   * @param {object} event - Matching response event
   */
  async logMatchingResponse(event) {
    const { success, correlationId, ...data } = event.data;

    this.audit(
      "MATCHING_RESPONSE_RECEIVED",
      "info",
      {
        correlationId,
        success,
        data,
        responseTime: event.timestamp,
      },
      event.source
    );
  }

  /**
   * Get audit logs with filtering
   * @param {object} filters - Filter options
   * @returns {array} Filtered audit logs
   */
  getLogs(filters = {}) {
    let logs = [...this.auditLogs];

    // Filter by event type
    if (filters.event) {
      logs = logs.filter((log) => log.event === filters.event);
    }

    // Filter by level
    if (filters.level) {
      logs = logs.filter((log) => log.level === filters.level);
    }

    // Filter by source
    if (filters.source) {
      logs = logs.filter((log) => log.source === filters.source);
    }

    // Filter by time range
    if (filters.since) {
      const since = new Date(filters.since);
      logs = logs.filter((log) => new Date(log.timestamp) >= since);
    }

    if (filters.until) {
      const until = new Date(filters.until);
      logs = logs.filter((log) => new Date(log.timestamp) <= until);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Search audit logs
   * @param {string} searchText - Text to search for
   * @param {number} limit - Maximum results
   * @returns {array} Matching logs
   */
  searchLogs(searchText, limit = 50) {
    const searchLower = searchText.toLowerCase();

    const matchingLogs = this.auditLogs.filter((log) => {
      const logText = JSON.stringify(log).toLowerCase();
      return logText.includes(searchLower);
    });

    // Sort by relevance (newest first)
    matchingLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return matchingLogs.slice(0, limit);
  }

  /**
   * Get audit statistics
   * @returns {object} Statistics
   */
  getStatistics() {
    const levelStats = {};
    const eventStats = {};
    const sourceStats = {};

    for (const log of this.auditLogs) {
      // Count by level
      levelStats[log.level] = (levelStats[log.level] || 0) + 1;

      // Count by event type
      eventStats[log.event] = (eventStats[log.event] || 0) + 1;

      // Count by source
      sourceStats[log.source] = (sourceStats[log.source] || 0) + 1;
    }

    return {
      totalLogs: this.auditLogs.length,
      levelStats,
      eventStats,
      sourceStats,
      oldestLog: this.auditLogs[0]?.timestamp,
      newestLog: this.auditLogs[this.auditLogs.length - 1]?.timestamp,
      isActive: this.isActive,
    };
  }

  /**
   * Get recent activity summary
   * @param {number} minutes - Minutes to look back
   * @returns {object} Activity summary
   */
  getRecentActivity(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const recentLogs = this.getLogs({ since });

    const activity = {
      totalEvents: recentLogs.length,
      formSubmissions: recentLogs.filter(
        (log) => log.event === "FORM_SUBMITTED"
      ).length,
      taskAssignments: recentLogs.filter((log) => log.event === "TASK_ASSIGNED")
        .length,
      errors: recentLogs.filter((log) => log.level === "error").length,
      warnings: recentLogs.filter((log) => log.level === "warn").length,
      timeRange: `${minutes} minutes`,
      timestamp: new Date().toISOString(),
    };

    return activity;
  }

  /**
   * Clean up old logs to prevent memory overflow
   */
  cleanupOldLogs() {
    if (this.auditLogs.length <= this.maxLogs) {
      return;
    }

    const logsToRemove = this.auditLogs.length - this.maxLogs;
    this.auditLogs.splice(0, logsToRemove);

    console.log(`🧹 AuditService: Cleaned up ${logsToRemove} old audit logs`);
  }

  /**
   * Export audit logs (for backup/compliance)
   * @param {object} filters - Filter options
   * @returns {object} Export data
   */
  exportLogs(filters = {}) {
    const logs = this.getLogs(filters);
    const stats = this.getStatistics();

    return {
      exportedAt: new Date().toISOString(),
      filters,
      statistics: stats,
      logs,
    };
  }

  /**
   * Clear all audit logs (for testing)
   */
  clearLogs() {
    this.auditLogs.length = 0;
    console.log("🧹 AuditService: Cleared all audit logs");
  }

  /**
   * Health check
   * @returns {object} Health status
   */
  async healthCheck() {
    const stats = this.getStatistics();

    return {
      service: "AuditService",
      status: this.isActive ? "active" : "inactive",
      totalLogs: stats.totalLogs,
      recentActivity: this.getRecentActivity(5), // Last 5 minutes
      timestamp: new Date().toISOString(),
    };
  }
}

export default AuditService;
