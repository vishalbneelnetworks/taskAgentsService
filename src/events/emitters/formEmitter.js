import { safeLogger } from "../../config/logger.js";
import rabbitMQConfig from "../../config/rabbitMQ.js";
import rabbitMQConnection from "../connection.js";

const formEmitter = async (formData) => {
  const { bindings, options } = rabbitMQConfig.queues.formSubmission;
  const { name: channelName } = rabbitMQConfig.channels.formSubmission;
  await rabbitMQConnection.publish(
    channelName,
    bindings[0].exchange,
    bindings[0].routingKey,
    formData,
    options
  );
  safeLogger.info(`Form data emitted to ${bindings[0].exchange}`);
};

export default formEmitter;
