import express from "express";
import cors from "cors";
// import { errorHandler } from "./utils/errorHandler.js";
import { correlationIdMiddleware } from "./config/requestContext.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(correlationIdMiddleware);

// app.use((req, res) => {
//   res.status(404).json({ message: "no route found" });
// });

app.get("/", (req, res) => {
  console.log("Hello World");
  res.status(200).json({
    message: "Welcome to the Task Agent Service API",
  });
});

// app.use(errorHandler);
export default app;
