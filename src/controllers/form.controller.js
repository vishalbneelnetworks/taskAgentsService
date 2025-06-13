import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { registrationFormSchema } from "../validation/form.validation.js";
import ProjectSubmission from "../models/form.model.js";
import formEmitter from "../events/emitters/formEmitter.js";
import { findSalesPerson } from "../grpc/client/company.client.js";

export const createForm = asyncHandler(async (req, res, next) => {
  const { error, value } = registrationFormSchema(req.body);
  const { id: customerId, type: userType } = req?.user;

  if (userType !== "customer") {
    throw new ApiError(403, "customer required to create a form");
  }

  try {
    if (error) {
      const errors = error.details.map((err) => err.message);
      throw new ApiError(400, "Validation failed", errors);
    }

    const {
      customerType,
      projectTitle,
      projectDescription,
      tags,
      domain,
      goal,
      references,
      estimatedBudget,
      timeline,
      targetLaunchDate,
      additionalNotes,
    } = value;

    if (!customerId) {
      throw new ApiError(400, "customerId required");
    }

    const newForm = await ProjectSubmission.create({
      customerType,
      customerId,
      projectTitle,
      projectDescription,
      tags,
      domain,
      goal,
      references,
      estimatedBudget,
      timeline,
      targetLaunchDate,
      additionalNotes,
      status: "draft",
    });

    if (!newForm) {
      throw new ApiError(500, "Failed to save the form");
    }

    // send notification to admin

    return res
      .status(201)
      .json(new ApiResponse(201, "Form saved successfully", newForm));
  } catch (error) {
    next(error);
  }
});

export const submitForm = asyncHandler(async (req, res, next) => {
  const { formId } = req.params;
  const { id: userId, type: userType } = req?.user;

  if (!formId) {
    throw new ApiError(400, "formId required");
  }

  try {
    if (userType !== "customer") {
      throw new ApiError(403, "You are not allowed to submit a form");
    }

    const form = await ProjectSubmission.findByPk(formId);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    if (form.customerId !== userId) {
      throw new ApiError(403, "You are not the owner of this form");
    }

    if (form.status !== "draft") {
      throw new ApiError(400, "Only draft forms can be submitted");
    }

    // assign form to salesperson using a queue
    // send notification to salesperson

    form.status = "submitted";
    await form.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Form submitted successfully", form));
  } catch (error) {
    next(error);
  }
});

export const updateForm = asyncHandler(async (req, res, next) => {
  const { formId } = req.params;
  const { error, value } = registrationFormSchema(req.body);
  const { type: userType, role: userRole, id: userId } = req.user;

  if (!formId) {
    throw new ApiError(400, "formId required");
  }

  try {
    if (error) {
      const errors = error.details.map((err) => err.message);
      throw new ApiError(400, "Validation failed", errors);
    }

    const form = await ProjectSubmission.findByPk(formId);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    if (userType === "customer") {
      if (form.status !== "draft") {
        throw new ApiError(
          403,
          "You are not allowed to edit this form anymore"
        );
      }
    } else if (
      userType === "company" &&
      (userRole === "salesman" || userRole === "admin")
    ) {
      if (form.status !== "submitted" && form.status !== "under_review") {
        throw new ApiError(
          403,
          `${userRole} can only edit forms that are submitted or under review`
        );
      }
    } else {
      throw new ApiError(403, "You are not authorized to update this form");
    }

    await form.update({ ...value, updatedBy: userId });

    return res
      .status(200)
      .json(new ApiResponse(200, "Form updated successfully", form));
  } catch (error) {
    next(error);
  }
});

export const getFormById = asyncHandler(async (req, res, next) => {
  const { formId } = req.params;

  const { type: userType, role: userRole } = req?.user;

  if (userType !== "customer" && userType !== "company") {
    throw new ApiError(403, "Access denied");
  }

  if (
    userType === "company" &&
    (userRole === "salesman" || userRole === "admin")
  ) {
    throw new ApiError(
      403,
      "Access denied: you're not the right company person"
    );
  }

  if (!formId) {
    throw new ApiError(400, "formId required");
  }

  try {
    const form = await ProjectSubmission.findByPk(formId);

    if (!form) {
      throw new ApiError(404, "form not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "form fetched successfully", form));
  } catch (error) {
    next(error);
  }
});

export const getForms = asyncHandler(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const { status, latest, page = 1, limit = 10 } = req.query;
  let whereClause = {};

  if (userType === "customer") {
    whereClause.customerId = userId;
  } else if (userType !== "company") {
    throw new ApiError(403, "Access Denied!");
  }

  if (status) whereClause = status;
  const offset = (parseInt(page) - 1) * limit;
  const order =
    latest === "true" ? [["createdAt", "DESC"]] : [["createdAt", "ASC"]];

  try {
    const { count, rows: forms } = await ProjectSubmission.findAll({
      where: whereClause,
      order,
      offset,
      limit: parseInt(limit),
    });

    return res.status(200).json(
      new ApiResponse(200, "Forms fetched successfully", {
        forms,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
        },
      })
    );
  } catch (error) {
    next(error);
  }
});

export const acceptForm = asyncHandler(async (req, res, next) => {
  const { type: userType, role: userRole, id: userId } = req.user;
  const { formId } = req.params;

  if (!formId) {
    throw new ApiError(400, "formId required");
  }

  if (userType !== "company") {
    throw new ApiError(403, "Access Denied");
  }

  if (userRole !== "admin" || userRole !== "salesperson") {
    throw new ApiError(
      403,
      "Access Denied: youre not the correct company person.."
    );
  }

  try {
    const form = await ProjectSubmission.findByPk(formId);

    if (!form) {
      throw new ApiError(404, "form not found");
    }

    // make request to lead service for creating a lead record

    form.status = "approved";
    form.acceptedBy = userId;

    await form.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          `project form approved successfully by ${userRole}`
        )
      );
  } catch (error) {
    next(error);
  }
});

export const messageEmitter = asyncHandler(async (req, res, next) => {
  const result = await findSalesPerson();
  return res
    .status(200)
    .json(new ApiResponse(200, "sales person fetched", result));
});
