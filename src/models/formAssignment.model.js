import { sequelize } from "../db/connect.js";
import { DataTypes } from "sequelize";

const FormAssignment = sequelize.define("formAssignment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  formId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  salesPersonId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

export default FormAssignment;
