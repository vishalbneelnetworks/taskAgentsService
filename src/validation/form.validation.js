import Joi from "joi";
import { ApiError } from "../utils/ApiError.js";
import { validateAdvancedInfo } from "../utils/buildZodSchemaFromTemplate.js";
import mongoose from "mongoose";
import {
  PROJECT_TYPES,
  FORM_STATUSES,
  FORM_TYPES,
  INQUIRY_TYPES,
} from "../constant.js";

const objectIdValidation = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

// Basic form validation schemas
const basicInfoSchema = Joi.object({
  inquiryType: Joi.string()
    .valid(...INQUIRY_TYPES)
    .messages({
      "any.only": `Inquiry type must be one of: ${INQUIRY_TYPES.join(", ")}`,
    }),
  preferredTime: Joi.string().allow("").messages({
    "string.base": "Preferred time must be a string",
  }),
});

export const createFormSchema = Joi.object({
  formType: Joi.string()
    .valid(...FORM_TYPES)
    .required()
    .messages({
      "any.required": "Form type is required",
      "any.only": `Form type must be one of: ${FORM_TYPES.join(", ")}`,
    }),

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

  description: Joi.string().required().min(10).max(1000).messages({
    "any.required": "Description is required",
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description must be at most 1000 characters long",
  }),

  budgetRange: Joi.string().required().messages({
    "any.required": "Budget range is required",
  }),

  timeline: Joi.string().required().messages({
    "any.required": "Timeline is required",
  }),

  status: Joi.string()
    .valid(...FORM_STATUSES)
    .default("draft")
    .messages({
      "any.only": `Status must be one of: ${FORM_STATUSES.join(", ")}`,
    }),

  templateId: Joi.string().required().custom(objectIdValidation).messages({
    "any.required": "Template ID is required",
    "any.invalid": "Invalid template ID format",
  }),

  basicInfo: basicInfoSchema.when("formType", {
    is: "basic",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  advancedInfo: Joi.object().when("formType", {
    is: "advanced",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

export const updateFormSchema = Joi.object({
  description: Joi.string().min(10).max(1000).messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description must be at most 1000 characters long",
  }),

  budgetRange: Joi.string().messages({
    "any.required": "Budget range is required",
  }),

  timeline: Joi.string().messages({
    "any.required": "Timeline is required",
  }),

  basicInfo: basicInfoSchema,
  advancedInfo: Joi.object(),
});

export const formQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  formType: Joi.string().valid(...FORM_TYPES),
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
  status: Joi.string().valid(...FORM_STATUSES),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "status")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Simple template validation
export const validateAgainstTemplate = (formData, template) => {
  const { budgetRange, timeline } = formData;

  // Validate budget range
  if (budgetRange && !template.budgetRanges.includes(budgetRange)) {
    throw new ApiError(
      400,
      `Budget range must be one of: ${template.budgetRanges.join(", ")}`
    );
  }

  // Validate timeline
  if (timeline && !template.timelineOptions.includes(timeline)) {
    throw new ApiError(
      400,
      `Timeline must be one of: ${template.timelineOptions.join(", ")}`
    );
  }

  return true;
};

// Status transition validation
export const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    draft: ["submitted"],
    submitted: ["inprogress", "rejected"],
    inprogress: ["approved", "rejected"],
    approved: ["published"],
    rejected: ["draft"],
    published: [],
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${
        validTransitions[currentStatus]?.join(", ") || "none"
      }`
    );
  }
};

// Check if form can be modified
export const checkFormModifiable = (form) => {
  if (form.status !== "draft") {
    throw new ApiError(
      400,
      `Form cannot be modified. Current status: ${form.status}. Only draft forms can be modified.`
    );
  }
};

// Validation Functions
export const validateCreateForm = (data) => {
  const { error, value } = createFormSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

export const validateUpdateForm = (data) => {
  const { error, value } = updateFormSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

export const validateFormQuery = (query) => {
  const { error, value } = formQuerySchema.validate(query, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
  }

  return value;
};

// Advanced validation for template-based forms
export const validateAdvancedForm = (advancedInfo, template) => {
  try {
    const validatedAdvancedInfo = validateAdvancedInfo(advancedInfo, template);
    return validatedAdvancedInfo;
  } catch (error) {
    throw new ApiError(
      400,
      `Advanced info validation failed: ${error.message}`
    );
  }
};
