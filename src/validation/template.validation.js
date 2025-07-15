import Joi from "joi";
import { ApiError } from "../utils/ApiError.js";
import { FIELD_TYPES } from "../constant.js";

// Joi Schemas
const fieldSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(50).messages({
    "string.empty": "Field name is required",
    "string.min": "Field name must be at least 1 character long",
    "string.max": "Field name must be at most 50 characters long",
  }),

  label: Joi.string().required().trim().min(1).max(100).messages({
    "string.empty": "Field label is required",
    "string.min": "Field label must be at least 1 character long",
    "string.max": "Field label must be at most 100 characters long",
  }),

  type: Joi.string()
    .required()
    .valid(...FIELD_TYPES)
    .messages({
      "any.required": "Field type is required",
      "any.only": `Field type must be one of: ${FIELD_TYPES.join(", ")}`,
    }),

  required: Joi.boolean().default(false),

  placeholder: Joi.string().allow("").max(200).messages({
    "string.max": "Placeholder must be at most 200 characters long",
  }),

  helpText: Joi.string().allow("").max(500).messages({
    "string.max": "Help text must be at most 500 characters long",
  }),

  options: Joi.array().items(Joi.string().trim().min(1)).messages({
    "array.base": "Options must be an array of strings",
  }),
});

export const createTemplateSchema = Joi.object({
  projectType: Joi.string()
    .required()
    .trim()
    .lowercase()
    .min(2)
    .max(50)
    .pattern(/^[a-z_]+$/)
    .messages({
      "any.required": "Project type is required",
      "string.pattern.base":
        "Project type can only contain lowercase letters and underscores",
    }),

  version: Joi.string()
    .trim()
    .default("v1")
    .pattern(/^v\d+$/)
    .messages({
      "string.pattern.base": "Version must be in format v1, v2, v3, etc.",
    }),

  budgetRanges: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one budget range is required",
      "any.required": "Budget ranges are required",
    }),

  timelineOptions: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one timeline option is required",
      "any.required": "Timeline options are required",
    }),

  fields: Joi.array().items(fieldSchema).min(1).required().messages({
    "array.min": "At least one field is required",
    "any.required": "Fields are required",
  }),

  createdBy: Joi.string().trim().messages({
    "string.empty": "Created by cannot be empty",
  }),

  isActive: Joi.boolean().default(true),
});

export const updateTemplateSchema = Joi.object({
  version: Joi.string()
    .trim()
    .pattern(/^v\d+$/)
    .messages({
      "string.pattern.base": "Version must be in format v1, v2, v3, etc.",
    }),

  budgetRanges: Joi.array().items(Joi.string().trim().min(1)).min(1).messages({
    "array.min": "At least one budget range is required",
  }),

  timelineOptions: Joi.array()
    .items(Joi.string().trim().min(1))
    .min(1)
    .messages({
      "array.min": "At least one timeline option is required",
    }),

  fields: Joi.array().items(fieldSchema).min(1).messages({
    "array.min": "At least one field is required",
  }),

  isActive: Joi.boolean(),

  createdBy: Joi.string().trim().messages({
    "string.empty": "Created by cannot be empty",
  }),

  deactivateOldVersion: Joi.boolean().default(true).messages({
    "boolean.base": "deactivateOldVersion must be a boolean",
  }),
});

export const templateQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  projectType: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(50)
    .pattern(/^[a-z_]+$/)
    .messages({
      "string.pattern.base":
        "Project type can only contain lowercase letters and underscores",
    }),
  isActive: Joi.string().valid("true", "false"),
});

// Validation Functions
export const validateCreateTemplate = (data) => {
  const { error, value } = createTemplateSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

export const validateUpdateTemplate = (data) => {
  const { error, value } = updateTemplateSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

export const validateTemplateQuery = (query) => {
  const { error, value } = templateQuerySchema.validate(query, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};
