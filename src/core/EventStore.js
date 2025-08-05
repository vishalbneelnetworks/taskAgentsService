/**
 * Event Store - Stores all events for audit trail and replay
 * Currently in-memory implementation (will be replaced by database later)
 */
class EventStore {
  constructor() {
    this.events = []; // All events stored here
    this.eventsByType = new Map(); // eventType → [events]
    this.eventsByCorrelation = new Map(); // correlationId → [events]
    this.maxEvents = 10000; // Prevent memory overflow
  }

  /**
   * Store an event
   * @param {object} event - Event to store
   */
  async store(event) {
    // Add metadata
    const storedEvent = {
      ...event,
      storedAt: new Date().toISOString(),
      version: 1,
    };

    // Store in main events array
    this.events.push(storedEvent);

    // Index by event type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, []);
    }
    this.eventsByType.get(event.type).push(storedEvent);

    // Index by correlation ID
    if (event.correlationId) {
      if (!this.eventsByCorrelation.has(event.correlationId)) {
        this.eventsByCorrelation.set(event.correlationId, []);
      }
      this.eventsByCorrelation.get(event.correlationId).push(storedEvent);
    }

    // Cleanup old events if needed
    this.cleanupOldEvents();

    console.log(
      `💾 EventStore: Stored event '${event.type}' with ID: ${event.id}`
    );
  }

  /**
   * Get all events
   * @param {object} filters - Optional filters
   * @returns {array} Events
   */
  async getEvents(filters = {}) {
    let events = [...this.events];

    // Apply filters
    if (filters.type) {
      events = this.eventsByType.get(filters.type) || [];
    }

    if (filters.correlationId) {
      events = this.eventsByCorrelation.get(filters.correlationId) || [];
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since).getTime();
      events = events.filter((event) => event.timestamp >= sinceTime);
    }

    if (filters.until) {
      const untilTime = new Date(filters.until).getTime();
      events = events.filter((event) => event.timestamp <= untilTime);
    }

    if (filters.source) {
      events = events.filter((event) => event.source === filters.source);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  /**
   * Get events by type
   * @param {string} eventType - Event type to filter by
   * @param {number} limit - Maximum number of events
   * @returns {array} Events
   */
  async getEventsByType(eventType, limit = 100) {
    return this.getEvents({ type: eventType, limit });
  }

  /**
   * Get events by correlation ID
   * @param {string} correlationId - Correlation ID to filter by
   * @returns {array} Events
   */
  async getEventsByCorrelation(correlationId) {
    return this.getEvents({ correlationId });
  }

  /**
   * Get recent events
   * @param {number} minutes - Number of minutes back
   * @param {number} limit - Maximum number of events
   * @returns {array} Events
   */
  async getRecentEvents(minutes = 60, limit = 100) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.getEvents({ since, limit });
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event ID
   * @returns {object|null} Event or null if not found
   */
  async getEventById(eventId) {
    return this.events.find((event) => event.id === eventId) || null;
  }

  /**
   * Get event statistics
   * @returns {object} Statistics
   */
  getStatistics() {
    const eventTypeStats = {};

    for (const [eventType, events] of this.eventsByType) {
      eventTypeStats[eventType] = {
        count: events.length,
        lastEvent: events[events.length - 1]?.timestamp,
      };
    }

    return {
      totalEvents: this.events.length,
      eventTypes: this.eventsByType.size,
      correlationIds: this.eventsByCorrelation.size,
      eventTypeStats,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
    };
  }

  /**
   * Get event stream for a correlation ID (useful for debugging)
   * @param {string} correlationId - Correlation ID
   * @returns {array} Event stream with timeline
   */
  async getEventStream(correlationId) {
    const events = this.getEventsByCorrelation(correlationId);

    // Sort by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    // Add duration between events
    const stream = events.map((event, index) => {
      const result = { ...event };

      if (index > 0) {
        result.durationFromPrevious =
          event.timestamp - events[index - 1].timestamp;
      }

      return result;
    });

    return {
      correlationId,
      totalEvents: events.length,
      duration:
        events.length > 0
          ? events[events.length - 1].timestamp - events[0].timestamp
          : 0,
      events: stream,
    };
  }

  /**
   * Search events by text
   * @param {string} searchText - Text to search for
   * @param {number} limit - Maximum results
   * @returns {array} Matching events
   */
  async searchEvents(searchText, limit = 50) {
    const searchLower = searchText.toLowerCase();

    const matchingEvents = this.events.filter((event) => {
      const eventJson = JSON.stringify(event).toLowerCase();
      return eventJson.includes(searchLower);
    });

    // Sort by relevance (newest first)
    matchingEvents.sort((a, b) => b.timestamp - a.timestamp);

    return matchingEvents.slice(0, limit);
  }

  /**
   * Clean up old events to prevent memory overflow
   */
  cleanupOldEvents() {
    if (this.events.length <= this.maxEvents) {
      return;
    }

    // Keep only the newest events
    const eventsToRemove = this.events.length - this.maxEvents;
    const removedEvents = this.events.splice(0, eventsToRemove);

    // Update indexes
    for (const event of removedEvents) {
      // Remove from type index
      if (this.eventsByType.has(event.type)) {
        const typeEvents = this.eventsByType.get(event.type);
        const index = typeEvents.findIndex((e) => e.id === event.id);
        if (index >= 0) {
          typeEvents.splice(index, 1);
        }
        if (typeEvents.length === 0) {
          this.eventsByType.delete(event.type);
        }
      }

      // Remove from correlation index
      if (
        event.correlationId &&
        this.eventsByCorrelation.has(event.correlationId)
      ) {
        const correlationEvents = this.eventsByCorrelation.get(
          event.correlationId
        );
        const index = correlationEvents.findIndex((e) => e.id === event.id);
        if (index >= 0) {
          correlationEvents.splice(index, 1);
        }
        if (correlationEvents.length === 0) {
          this.eventsByCorrelation.delete(event.correlationId);
        }
      }
    }

    console.log(`🧹 EventStore: Removed ${eventsToRemove} old events`);
  }

  /**
   * Clear all events (for testing)
   */
  clear() {
    this.events.length = 0;
    this.eventsByType.clear();
    this.eventsByCorrelation.clear();
  }

  /**
   * Export events (for backup/analysis)
   * @param {object} filters - Optional filters
   * @returns {object} Export data
   */
  async exportEvents(filters = {}) {
    const events = this.getEvents(filters);
    const stats = this.getStatistics();

    return {
      exportedAt: new Date().toISOString(),
      filters,
      statistics: stats,
      events,
    };
  }
}

export default EventStore;
