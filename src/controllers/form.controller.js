import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createForm,
  getForms,
  getFormWithTemplate,
  getFormsByProjectType,
  updateForm,
  deleteForm,
  changeFormStatus,
  getFormById,
} from "../services/form.service.js";

// Create a new form
export const createFormController = asyncHandler(async (req, res) => {
  const form = await createForm(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, form, "Form created successfully"));
});

// Get all forms with pagination and filtering
export const getFormsController = asyncHandler(async (req, res) => {
  const response = await getForms(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Forms retrieved successfully"));
});

// Get form by ID
export const getFormByIdController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const form = await getFormById(formId);

  return res
    .status(200)
    .json(new ApiResponse(200, form, "Form retrieved successfully"));
});

// Update form
export const updateFormController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const updatedForm = await updateForm(formId, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedForm, "Form updated successfully"));
});

// Delete form
export const deleteFormController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  await deleteForm(formId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Form deleted successfully"));
});

// Change form status
export const changeFormStatusController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const { status } = req.body;

  const updatedForm = await changeFormStatus(formId, status);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedForm, `Form status changed to ${status}`)
    );
});

export const submitFormController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const submittedForm = await changeFormStatus(formId, "submitted");

  return res
    .status(200)
    .json(new ApiResponse(200, submittedForm, "Form submitted successfully"));
});

// Get form with template structure
export const getFormWithTemplateController = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const form = await getFormWithTemplate(formId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, form, "Form with template retrieved successfully")
    );
});

// Get forms by project type
export const getFormsByProjectTypeController = asyncHandler(
  async (req, res) => {
    const { projectType } = req.params;
    const response = await getFormsByProjectType(projectType, req.query);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          response,
          `Forms for ${projectType} retrieved successfully`
        )
      );
  }
);
