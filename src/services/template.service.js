import { RequirementTemplate } from "../models/template.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateTemplateQuery,
} from "../validation/template.validation.js";
import mongoose from "mongoose";
import { RequirementForm } from "../models/form.model.js";

export const createTemplate = async (templateData) => {
  // Validate input data
  const validatedData = validateCreateTemplate(templateData);
  const { projectType, version } = validatedData;

  // Check if template with same projectType and version already exists
  const existingTemplate = await RequirementTemplate.findOne({
    projectType,
    version,
  });

  if (existingTemplate) {
    throw new ApiError(
      400,
      `Template for ${projectType} version ${version} already exists`
    );
  }

  const template = await RequirementTemplate.create(validatedData);
  return template;
};

export const getTemplates = async (queryParams = {}) => {
  // Validate query parameters
  const validatedQuery = validateTemplateQuery(queryParams);
  const { page, limit, projectType, isActive } = validatedQuery;

  const filter = {};
  if (projectType) filter.projectType = projectType;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const skip = (page - 1) * limit;

  const templates = await RequirementTemplate.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await RequirementTemplate.countDocuments(filter);

  return {
    templates,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalTemplates: total,
      hasNext: skip + templates.length < total,
      hasPrev: page > 1,
    },
  };
};

export const getTemplateById = async (templateId) => {
  if (!templateId) {
    throw new ApiError(400, "Template ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    throw new ApiError(400, "Invalid template ID format");
  }

  const template = await RequirementTemplate.findById(templateId);

  if (!template) {
    throw new ApiError(404, "Template not found");
  }

  return template;
};

export const getTemplateByProjectType = async (projectType, version = null) => {
  const query = {
    projectType: projectType.toLowerCase(),
    isActive: true,
  };

  if (version) {
    query.version = version;
  }

  const template = await RequirementTemplate.findOne(query).sort({
    createdAt: -1,
  }); // Get latest if no version specified

  if (!template) {
    throw new ApiError(
      404,
      `No active template found for project type: ${projectType}`
    );
  }

  return template;
};

export const updateTemplate = async (templateId, updateData) => {
  // Validate input data
  const validatedData = validateUpdateTemplate(updateData);

  const existingTemplate = await getTemplateById(templateId);

  if (!existingTemplate.isActive) {
    throw new ApiError(
      400,
      `Cannot update inactive template. Template is version ${existingTemplate.version} and is inactive.`
    );
  }

  // Get the current version number and increment it
  const currentVersion = existingTemplate.version;
  console.log("currentVersion", currentVersion);
  const versionNumber = parseInt(currentVersion.replace("v", "")) + 1;
  const newVersion = `v${versionNumber}`;
  console.log(newVersion);

  // Check if the new version already exists
  const existingNewVersion = await RequirementTemplate.findOne({
    projectType: existingTemplate.projectType,
    version: newVersion,
  });

  if (existingNewVersion) {
    throw new ApiError(
      400,
      `Template version ${newVersion} already exists for ${existingTemplate.projectType}`
    );
  }

  // Create new version with updated data
  const newTemplate = await RequirementTemplate.create({
    projectType: existingTemplate.projectType,
    version: newVersion,
    budgetRanges: validatedData.budgetRanges || existingTemplate.budgetRanges,
    timelineOptions:
      validatedData.timelineOptions || existingTemplate.timelineOptions,
    fields: validatedData.fields || existingTemplate.fields,
    createdBy: validatedData.createdBy || existingTemplate.createdBy,
    isActive:
      validatedData.isActive !== undefined ? validatedData.isActive : true,
  });

  // Optionally deactivate the old version
  if (validatedData.deactivateOldVersion !== false) {
    existingTemplate.isActive = false;
    await existingTemplate.save();
  }

  return {
    newTemplate,
    oldTemplate: existingTemplate,
    message: `New version ${newVersion} created. Old version ${currentVersion} ${
      existingTemplate.isActive ? "remains active" : "deactivated"
    }.`,
  };
};

export const deleteTemplate = async (templateId) => {
  const template = await getTemplateById(templateId);

  // Check if any forms are using this template
  const formsUsingTemplate = await RequirementForm.countDocuments({
    templateId: templateId,
  });

  if (formsUsingTemplate > 0) {
    throw new ApiError(
      400,
      `Cannot delete template. ${formsUsingTemplate} forms are using this template. Deactivate instead.`
    );
  }

  await RequirementTemplate.findByIdAndDelete(templateId);
  return template;
};

export const toggleTemplateStatus = async (templateId) => {
  const template = await getTemplateById(templateId);
  template.isActive = !template.isActive;
  await template.save();
  return template;
};

export const getAvailableProjectTypes = async () => {
  const projectTypes = await RequirementTemplate.distinct("projectType", {
    isActive: true,
  });
  console.log("projectTypes", projectTypes);

  return projectTypes.sort();
};

// Default export for convenience
const templateService = {
  createTemplate,
  getTemplates,
  getTemplateById,
  getTemplateByProjectType,
  updateTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  getAvailableProjectTypes,
};

export default templateService;
