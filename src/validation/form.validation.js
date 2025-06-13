import Joi from "joi";

export const registrationFormSchema = (data) => {
  const schema = Joi.object({
    projectTitle: Joi.string().min(3).max(100).allow("", null).messages({
      "string.min": "Project title must be at least 3 characters long",
      "string.max": "Project title must be at most 100 characters long",
    }),

    projectDescription: Joi.string().min(10).messages({
      "string.min": "Project description must be at least 10 characters long",
    }),

    customerType: Joi.string().required().valid("fresh", "advance").messages({
      "any.only": "Invalid customer type",
    }),

    domain: Joi.string()
      .valid(
        "website",
        "ecommerce",
        "mobile_app",
        "saas",
        "landing_page",
        "crm",
        "booking_platform",
        "edtech",
        "fintech"
      )
      .required()
      .messages({
        "any.required": "Domain is required",
        "any.only": "Invalid domain selected",
      }),

    goal: Joi.string().min(5).max(500).required().messages({
      "any.required": "Project goal is required",
      "string.min": "Goal must be at least 5 characters",
      "string.max": "Goal must be under 500 characters",
    }),

    references: Joi.array().items(Joi.string().uri()).max(5).messages({
      "string.uri": "Each reference must be a valid URL",
      "array.max": "You can add up to 5 references only",
    }),

    tags: Joi.array().items(Joi.string().trim().min(1)).default([]).messages({
      "array.base": "Tags must be an array of strings",
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
