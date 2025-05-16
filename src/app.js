import express from "express";
import cors from "cors";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));

//imports
import formRoutes from "./routes/form.route.js";

//use
app.use("/api/v1/customer", formRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "No route found" });
});

app.use(errorHandler);
export default app;
