import rabbitMQConnection from "../events/connection.js";
import Event from "./Event.js";

/**
 * Message Broker - Bridge between EventBus and RabbitMQ
 * Handles external communication and event translation
 */
class MessageBroker {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.connection = rabbitMQConnection;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.publishChannels = new Map();
  }

  /**
   * Initialize the message broker
   */
  async initialize() {
    try {
      this.isConnected = true;

      this.setupEventListeners();
    } catch (error) {
      console.error("❌ MessageBroker: Failed to initialize:", error.message);
      throw error;
    }
  }

  /**
   * Setup internal event listeners
   */
  setupEventListeners() {
    this.eventBus.on("matching.request", this.handleMatchingRequest.bind(this));
    this.eventBus.on("external.publish", this.handleExternalPublish.bind(this));
  }

  /**
   * Start consuming from RabbitMQ queues
   */
  async startConsuming() {
    try {
      await this.consumeFromQueue(
        "matching-response-channel",
        "assign.agent.reply.queue",
        this.handleExternalResponse.bind(this)
      );

      await this.consumeFromQueue(
        "form-consumer-channel",
        "form_submission_queue",
        this.handleFormSubmission.bind(this)
      );

      console.log("🎧 MessageBroker: Started consuming from RabbitMQ queues");
    } catch (error) {
      console.error(
        "❌ MessageBroker: Failed to start consuming:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Consume from a RabbitMQ queue
   * @param {string} channelName - RabbitMQ channel name
   * @param {string} queueName - Queue name
   * @param {function} handler - Message handler function
   */
  async consumeFromQueue(channelName, queueName, handler) {
    const consumerTag = await this.connection.consume(
      channelName,
      queueName,
      handler,
      { prefetch: 10 }
    );

    this.subscriptions.set(queueName, { channelName, consumerTag });
  }

  /**
   * Publish to RabbitMQ queue
   * @param {string} channelName - Channel name
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {object} message - Message data
   * @param {object} options - Publish options
   */
  async publishToQueue(
    channelName,
    exchange,
    routingKey,
    message,
    options = {}
  ) {
    if (!this.isConnected) {
      throw new Error("MessageBroker not connected to RabbitMQ");
    }

    try {
      await this.connection.publish(
        channelName,
        exchange,
        routingKey,
        message,
        options
      );
    } catch (error) {
      console.error("❌ MessageBroker: Failed to publish:", error.message);
      throw error;
    }
  }

  /**
   * Handle matching requests (internal → external)
   * @param {object} event - Event data
   */
  async handleMatchingRequest(event) {
    const { correlationId, data } = event;
    try {
      await this.publishToQueue(
        "matching-channel",
        "",
        "matching.request.queue",
        data,
        {
          correlationId,
          replyTo: "assign.agent.reply.queue",
          messageId: correlationId,
        }
      );

      const matchingRequestSentEvent = new Event({
        type: "matching.request.sent",
        data: { correlationId, timestamp: Date.now() },
        correlationId,
        source: "MessageBroker",
      });

      this.eventBus.emit(matchingRequestSentEvent);
    } catch (error) {
      console.error(
        "❌ MessageBroker: Failed to send matching request:",
        error.message
      );

      // Emit error event
      const matchingRequestFailedEvent = new Event({
        type: "matching.request.failed",
        data: { correlationId, error: error.message, originalData: data },
        correlationId,
        source: "MessageBroker",
      });

      this.eventBus.emit(matchingRequestFailedEvent);
    }
  }

  /**
   * Handle external responses (external → internal)
   * @param {object} message - RabbitMQ message
   * @param {object} msg - Raw message object
   * @param {object} channel - RabbitMQ channel
   */
  async handleExternalResponse(message, msg, channel) {
    const correlationId = msg.properties.correlationId;

    try {
      const responseData =
        typeof message === "string" ? JSON.parse(message) : message;

      const matchingResponseEvent = new Event({
        type: "matching.response",
        data: { ...responseData },
        correlationId,
        source: "MessageBroker",
      });
      this.eventBus.emit(matchingResponseEvent);
    } catch (error) {
      console.error(
        "❌ MessageBroker: Failed to handle external response:",
        error.message
      );

      // Emit error event
      const externalResponseErrorEvent = new Event({
        type: "external.response.error",
        data: {
          correlationId,
          error: error.message,
          rawMessage: message,
        },
        correlationId,
        source: "MessageBroker",
      });
      this.eventBus.emit(externalResponseErrorEvent);
    }
  }

  /**
   * Handle form submissions (external → internal)
   * @param {object} message - Form submission data
   * @param {object} msg - Raw message object
   * @param {object} channel - RabbitMQ channel
   */
  async handleFormSubmission(message, msg, channel) {
    const formData =
      typeof message === "string" ? JSON.parse(message) : message;

    const formSubmittedEvent = new Event({
      type: "form.submitted",
      data: formData,
      source: "MessageBroker",
    });
    this.eventBus.emit(formSubmittedEvent);
  }

  /**
   * Handle external publish requests (internal → external)
   * @param {object} event - Event data
   */
  async handleExternalPublish(event) {
    const { exchange, routingKey, message, options } = event.data;

    try {
      await this.publishToQueue(
        "external-publish-channel",
        exchange || "",
        routingKey,
        message,
        options || {}
      );
    } catch (error) {
      console.error(
        "❌ MessageBroker: Failed to publish external message:",
        error.message
      );

      // Emit error event
      const externalPublishErrorEvent = new Event({
        type: "external.publish.error",
        data: {
          error: error.message,
          originalData: event.data,
        },
        source: "MessageBroker",
      });
      this.eventBus.emit(externalPublishErrorEvent);
    }
  }

  /**
   * Publish event externally (convenience method)
   * @param {string} routingKey - Routing key
   * @param {object} message - Message data
   * @param {object} options - Options
   */
  async publishExternal(routingKey, message, options = {}) {
    const event = new Event({
      type: "external.publish",
      data: { routingKey, message, options },
      source: "MessageBroker",
    });
    return this.eventBus.emit(event);
  }

  /**
   * Get broker statistics
   * @returns {object} Statistics
   */
  getStats() {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.keys()),
      publishChannels: this.publishChannels.size,
    };
  }

  /**
   * Stop the message broker
   */
  async stop() {
    try {
      // Stop all consumers
      for (const [queueName, { channelName, consumerTag }] of this
        .subscriptions) {
        await this.connection.cancelConsumer(channelName, consumerTag);
      }

      this.subscriptions.clear();
      this.publishChannels.clear();
      this.isConnected = false;
    } catch (error) {
      console.error("❌ MessageBroker: Error during stop:", error.message);
    }
  }

  /**
   * Health check
   * @returns {object} Health status
   */
  async healthCheck() {
    return {
      component: "MessageBroker",
      status: this.isConnected ? "healthy" : "disconnected",
      subscriptions: this.subscriptions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

export default MessageBroker;
