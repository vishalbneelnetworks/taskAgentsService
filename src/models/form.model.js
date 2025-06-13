import { DataTypes } from "sequelize";
import { sequelize } from "../db/connect.js";

const ProjectSubmission = sequelize.define(
  "ProjectSubmission",
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
    customerType: {
      type: DataTypes.ENUM("fresh", "advance"),
      allowNull: false,
    },
    projectTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    projectDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
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
    goal: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    domain: {
      type: DataTypes.ENUM(
        "website",
        "ecommerce",
        "mobile_app",
        "saas",
        "landing_page",
        "crm",
        "booking_platform",
        "edtech",
        "fintech"
      ),
      allowNull: false,
    },
    docs: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    references: {
      type: DataTypes.JSON,
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
      defaultValue: "draft",
    },
    updatedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    acceptedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "ProjectSubmission",
    timestamps: true,
    indexes: [
      {
        fields: ["customerId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["updatedBy"],
      },
    ],
  }
);

export default ProjectSubmission;
