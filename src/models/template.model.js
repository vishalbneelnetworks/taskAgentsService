import mongoose, { Schema } from "mongoose";
import { PROJECT_TYPES, FIELD_TYPES } from "../constant.js";

const fieldSchema = new Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: FIELD_TYPES,
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    helpText: { type: String },
    options: { type: [String], default: undefined },
  },
  { _id: false }
);

const templateSchema = new Schema(
  {
    projectType: {
      type: String,
      lowercase: true,
      required: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: "v1",
    },
    budgetRanges: {
      type: [String],
      required: true,
    },
    timelineOptions: {
      type: [String],
      required: true,
    },
    fields: {
      type: [fieldSchema],
      required: true,
    },
    createdBy: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

templateSchema.index({ projectType: 1, version: 1 });
templateSchema.index({ projectType: 1, isActive: 1 });

export const RequirementTemplate = mongoose.model(
  "RequirementTemplate",
  templateSchema
);
