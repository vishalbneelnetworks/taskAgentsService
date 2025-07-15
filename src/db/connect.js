import { Sequelize } from "sequelize";
import { env } from "../config/env.js";
import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

// export const sequelize = new Sequelize(
//   env.DB_NAME,
//   env.DB_USER,
//   env.DB_PASSWORD,
//   {
//     host: env.DB_HOST,
//     dialect: "mysql",
//     logging: process.env.NODE_ENV === "development" ? console.log : false,
//     pool: {
//       max: 10,
//       min: 0,
//       acquire: 30000,
//       idle: 10000,
//     },
//   }
// );

export const connectDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${env.MONGO_URL}/${DB_NAME}`
    );
    console.log(
      `Database connected successfully to host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Database connection failed", error);
    process.exit(1);
  }
};
