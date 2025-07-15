import { RequirementForm } from "../models/form.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  validateCreateForm,
  validateUpdateForm,
  validateFormQuery,
  validateAdvancedForm,
  validateStatusTransition,
  checkFormModifiable,
  validateAgainstTemplate,
} from "../validation/form.validation.js";
import mongoose from "mongoose";
import { RequirementTemplate } from "../models/template.model.js";

export const createForm = async (formData) => {
  // 1. Basic validation
  const validatedData = validateCreateForm(formData);

  const template = await RequirementTemplate.findById(validatedData.templateId);

  if (!template || !template.isActive) {
    throw new ApiError(404, "Template not found or inactive");
  }

  if (template.projectType !== validatedData.projectType) {
    throw new ApiError(400, "Project type does not match template");
  }

  // 3. Validate budget and timeline (for both basic and advanced)
  validateAgainstTemplate(validatedData, template);

  // 4. If advanced form, validate advancedInfo (pass template)
  if (validatedData.formType === "advanced") {
    const validatedAdvancedInfo = validateAdvancedForm(
      validatedData.advancedInfo,
      template
    );
    validatedData.advancedInfo = validatedAdvancedInfo;
  }

  // 5. Create form
  const form = await RequirementForm.create(validatedData);
  return form;
};

export const getFormWithTemplate = async (formId) => {
  if (!formId) {
    throw new ApiError(400, "Form ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(formId)) {
    throw new ApiError(400, "Invalid form ID format");
  }

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(formId) } },
    {
      $lookup: {
        from: "requirementtemplates",
        localField: "templateId",
        foreignField: "_id",
        as: "template",
        pipeline: [
          {
            $project: {
              projectType: 1,
              version: 1,
              fields: 1,
              isActive: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        template: { $arrayElemAt: ["$template", 0] },
      },
    },
  ];

  const [form] = await RequirementForm.aggregate(pipeline);

  if (!form) {
    throw new ApiError(404, "Form not found");
  }

  return form;
};

export const getFormById = async (formId) => {
  const form = await RequirementForm.findById(formId);
  if (!form) {
    throw new ApiError(404, "Form not found");
  }
  return form;
};

export const getForms = async (queryParams = {}) => {
  // Validate query parameters
  const validatedQuery = validateFormQuery(queryParams);
  const { page, limit, formType, projectType, status, sortBy, sortOrder } =
    validatedQuery;

  // Build match stage
  const matchStage = {};
  if (formType) matchStage.formType = formType;
  if (projectType) matchStage.projectType = projectType;
  if (status) matchStage.status = status;

  // Build sort stage
  const sortStage = {};
  sortStage[sortBy] = sortOrder === "desc" ? -1 : 1;

  const skip = (page - 1) * limit;

  // Aggregation pipeline
  const pipeline = [
    { $match: matchStage },
    { $sort: sortStage },
    {
      $facet: {
        forms: [{ $skip: skip }, { $limit: parseInt(limit) }],
        totalCount: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await RequirementForm.aggregate(pipeline);
  const forms = result.forms;
  const total = result.totalCount[0]?.total || 0;

  return {
    forms,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalForms: total,
      hasNext: skip + forms.length < total,
      hasPrev: page > 1,
    },
  };
};

export const getFormsByProjectType = async (projectType, queryParams = {}) => {
  if (!projectType) {
    throw new ApiError(400, "Project type is required");
  }

  const validatedQuery = validateFormQuery(queryParams);
  const { page = 1, limit = 10, status } = validatedQuery;

  const matchStage = { projectType };
  if (status) matchStage.status = status;

  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        forms: [{ $skip: skip }, { $limit: parseInt(limit) }],
        totalCount: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await RequirementForm.aggregate(pipeline);
  const forms = result.forms;
  const total = result.totalCount[0]?.total || 0;

  return {
    forms,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalForms: total,
      hasNext: skip + forms.length < total,
      hasPrev: page > 1,
    },
  };
};

export const updateForm = async (formId, updateData) => {
  if (!formId) {
    throw new ApiError(400, "Form ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(formId)) {
    throw new ApiError(400, "Invalid form ID format");
  }

  const form = await RequirementForm.findById(formId);

  if (!form) {
    throw new ApiError(404, "Form not found");
  }

  // Check if form can be modified (only draft forms)
  checkFormModifiable(form);

  // Validate update data
  const validatedData = validateUpdateForm(updateData);

  const template = await RequirementTemplate.findById(form.templateId);

  // Validate budget/timeline against template
  validateAgainstTemplate(validatedData, template);

  if (form.formType === "basic" && validatedData.advancedInfo) {
    throw new ApiError(400, "Cannot update advancedInfo for basic forms");
  }

  if (form.formType === "advanced" && validatedData.basicInfo) {
    throw new ApiError(400, "Cannot update basicInfo for advanced forms");
  }

  if (validatedData.advancedInfo) {
    const validatedAdvancedInfo = validateAdvancedForm(
      validatedData.advancedInfo,
      template
    );
    validatedData.advancedInfo = validatedAdvancedInfo;
  }

  // Update the form
  const updatedForm = await RequirementForm.findByIdAndUpdate(
    formId,
    validatedData,
    { new: true, runValidators: true }
  );

  return updatedForm;
};

export const deleteForm = async (formId) => {
  if (!formId) {
    throw new ApiError(400, "Form ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(formId)) {
    throw new ApiError(400, "Invalid form ID format");
  }

  const form = await RequirementForm.findById(formId);

  if (!form) {
    throw new ApiError(404, "Form not found");
  }

  // Check if form can be deleted (only draft forms)
  checkFormModifiable(form);

  await RequirementForm.findByIdAndDelete(formId);
  return form;
};

export const changeFormStatus = async (formId, newStatus) => {
  if (!formId) {
    throw new ApiError(400, "Form ID is required");
  }

  if (!newStatus) {
    throw new ApiError(400, "Status is required");
  }

  if (!mongoose.Types.ObjectId.isValid(formId)) {
    throw new ApiError(400, "Invalid form ID format");
  }

  const form = await RequirementForm.findById(formId);

  if (!form) {
    throw new ApiError(404, "Form not found");
  }

  if (form.status === newStatus) {
    throw new ApiError(400, "Form is already in this status");
  }

  // Validate status transition
  validateStatusTransition(form.status, newStatus);

  // Update timestamps based on status
  const updateData = { status: newStatus };

  if (newStatus === "submitted") {
    updateData.submittedAt = new Date();
  } else if (newStatus === "approved" || newStatus === "rejected") {
    updateData.reviewedAt = new Date();
  } else if (newStatus === "published") {
    updateData.publishedAt = new Date();
  }

  const updatedForm = await RequirementForm.findByIdAndUpdate(
    formId,
    updateData,
    { new: true, runValidators: true }
  );

  return updatedForm;
};

// Default export for convenience
const formService = {
  createForm,
  getFormWithTemplate,
  getForms,
  getFormById,
  getFormsByProjectType,
  updateForm,
  deleteForm,
  changeFormStatus,
};

export default formService;
