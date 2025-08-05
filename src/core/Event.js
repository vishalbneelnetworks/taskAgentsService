import { v4 as uuidv4 } from "uuid";

class Event {
  constructor({ type, data, correlationId, source, priority, timestamp, id }) {
    this.id = id || uuidv4();
    this.type = type;
    this.data = data;
    this.timestamp = timestamp || Date.now();
    this.correlationId =
      correlationId || (data && data.correlationId) || uuidv4();
    this.source = source || "system";
    this.priority = priority || "normal";
  }
}

export default Event;
