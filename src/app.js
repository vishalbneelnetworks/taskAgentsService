import express from "express";
import cors from "cors";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(correlationIdMiddleware);

//imports
import formRoutes from "./routes/form.route.js";
import { correlationIdMiddleware } from "./config/requestContext.js";

//use
app.use("/api/v1/customer", formRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the API",
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "no route found" });
});

app.use(errorHandler);
export default app;
