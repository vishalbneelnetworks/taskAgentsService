import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";

const start = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`server listening on port ${env.PORT}`);
    });
    app.on("error", () => {
      console.log("server not running");
    });
  } catch (error) {
    throw new Error("something went wrong while initating server");
  }
};

start();
