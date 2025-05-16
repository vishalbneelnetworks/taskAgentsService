import { DataTypes } from "sequelize";
import { sequelize } from "../db/connect.js";

const RegistrationForm = sequelize.define(
  "RegistrationForm",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    projectTitle: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    techStack: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    estimatedBudget: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    timeline: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetLaunchDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected"
      ),
      defaultValue: "submitted",
    },
  },
  {
    tableName: "registration_forms",
    timestamps: true,
  }
);

export default RegistrationForm;
