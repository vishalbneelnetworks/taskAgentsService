import { env } from "./env.js";

const EXCHANGE_TYPES = {
  DIRECT: "direct",
  FANOUT: "fanout",
  TOPIC: "topic",
  HEADERS: "headers",
};

// Validate environment variables
if (!env.RABBITMQ_URL) {
  throw new Error("RABBITMQ_URL is required in .env file");
}

// Configuration object with default values
const rabbitMQConfig = {
  // Connection URL
  url: env.RABBITMQ_URL,

  // Connection options
  connectionOptions: {
    heartbeat: 60, // Heartbeat interval in seconds
    timeout: 30000, // Connection timeout in milliseconds
  },

  // Exchange configurations
  exchanges: {
    formSubmission: {
      name: "form_submission_exchange",
      type: EXCHANGE_TYPES.DIRECT,
      options: {
        durable: true,
        autoDelete: false,
      },
    },
  },

  // Queue configurations
  queues: {
    formSubmission: {
      name: "form_submission_queue",
      options: {
        durable: true,
        deadLetterExchange: "form_submission_dlx",
        messageTtl: 86400000, // 24 hours
      },
      bindings: [
        {
          exchange: "form_submission_exchange",
          routingKey: "form.submitted",
        },
      ],
    },
    // Add matching queues
    matchingRequest: {
      name: "matching.request.queue",
      options: {
        durable: true,
        messageTtl: 86400000, // 24 hours
      },
      bindings: [],
    },
    matchingReply: {
      name: "assign.agent.reply.queue",
      options: {
        durable: true,
        messageTtl: 86400000, // 24 hours
      },
      bindings: [],
    },
  },

  channels: {
    formSubmission: {
      name: "form_submission_channel",
      options: {
        durable: true,
      },
    },
  },

  // Consumer options
  consumerOptions: {
    prefetch: 10, // Number of messages to prefetch
    noAck: false, // Manual acknowledgments
  },

  // Dead letter exchange for form submission
  formSubmissionDeadLetterExchange: {
    name: "form_submission_dlx",
    type: EXCHANGE_TYPES.DIRECT,
    queue: "form_submission_dlq",
    routingKey: "failed.form.submission",
    queueOptions: {
      durable: true,
      messageTtl: 604800000, // 7 days for DLQ
    },
  },

  // Retry mechanism configuration
  retryMechanism: {
    maxRetries: 3,
    initialInterval: 1000, // 1 second
    multiplier: 2, // Exponential backoff
  },
};

export default rabbitMQConfig;
