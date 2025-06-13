//src/config/logger.js
import { AsyncLocalStorage } from "async_hooks";
import { v4 as uuidv4 } from "uuid";

const asyncLocalStorage = new AsyncLocalStorage();

const middleware = (req, res, next) => {
  asyncLocalStorage.run(new Map(), () => {
    const correlationId = req.headers["x-correlation-id"] || uuidv4();
    asyncLocalStorage.getStore().set("correlationId", correlationId);
    req.correlationId = correlationId;
    res.setHeader("x-correlation-id", correlationId);
    next();
  });
};

const getCorrelationId = () => {
  const store = asyncLocalStorage.getStore();
  return store ? store.get("correlationId") : undefined;
};

export { middleware as correlationIdMiddleware, getCorrelationId };
