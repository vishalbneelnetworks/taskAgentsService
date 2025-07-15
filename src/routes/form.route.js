import { Router } from "express";
import {
  createFormController,
  getFormsController,
  getFormByIdController,
  updateFormController,
  deleteFormController,
  changeFormStatusController,
  getFormWithTemplateController,
  getFormsByProjectTypeController,
  submitFormController,
} from "../controllers/form.controller.js";

const router = Router();

// Public routes
router.get("/", getFormsController);
router.get("/:formId", getFormByIdController);
router.get("/project-type/:projectType", getFormsByProjectTypeController);
router.get("/:formId/with-template", getFormWithTemplateController);

// Form operations
router.post("/", createFormController);
router.patch("/:formId", updateFormController); // Only for draft forms
router.delete("/:formId", deleteFormController); // Only for draft forms
router.patch("/:formId/status", changeFormStatusController); // Change status
router.patch("/:formId/submit", submitFormController);

export default router;
