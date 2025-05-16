import Joi from "joi";

export const registrationFormSchema = (data) => {
  const schema = Joi.object({
    customerId: Joi.string()
      .guid({ version: ["uuidv4"] })
      .required()
      .messages({
        "any.required": "Customer ID is required",
        "string.guid": "Customer ID must be a valid UUID",
      }),

    projectTitle: Joi.string().min(3).max(100).required().messages({
      "any.required": "Project title is required",
      "string.min": "Project title must be at least 3 characters long",
      "string.max": "Project title must be at most 100 characters long",
    }),

    projectDescription: Joi.string().min(10).required().messages({
      "any.required": "Project description is required",
      "string.min": "Project description must be at least 10 characters long",
    }),

    techStack: Joi.array()
      .items(Joi.string().trim().min(1))
      .min(1)
      .required()
      .messages({
        "any.required": "Tech stack is required",
        "array.min": "At least one technology must be specified",
      }),

    estimatedBudget: Joi.number().positive().precision(2).allow(null).messages({
      "number.positive": "Estimated budget must be a positive number",
    }),

    timeline: Joi.string().max(50).allow("", null).messages({
      "string.max": "Timeline must be under 50 characters",
    }),

    targetLaunchDate: Joi.date().greater("now").allow(null).messages({
      "date.greater": "Launch date must be in the future",
    }),

    additionalNotes: Joi.string().allow("", null).max(500).messages({
      "string.max": "Additional notes should be under 500 characters",
    }),

    status: Joi.string()
      .valid("draft", "submitted", "under_review", "approved", "rejected")
      .default("submitted")
      .messages({
        "any.only": "Invalid status",
      }),
  });

  return schema.validate(data, { abortEarly: false });
};
