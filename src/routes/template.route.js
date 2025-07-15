import { Router } from "express";
import {
  createTemplateController,
  getTemplatesController,
  getTemplateByIdController,
  getTemplateByProjectTypeController,
  getAvailableProjectTypesController,
  updateTemplateController,
  deleteTemplateController,
  toggleTemplateStatusController,
} from "../controllers/template.controller.js";

const router = Router();

// Public routes
router.get("/", getTemplatesController);
router.get("/project-types", getAvailableProjectTypesController);
router.get("/:templateId", getTemplateByIdController);

// Split the route into two separate routes instead of using optional parameter
router.get("/project-type/:projectType", getTemplateByProjectTypeController);
router.get(
  "/project-type/:projectType/:version",
  getTemplateByProjectTypeController
);

// Super Admin routes
router.post("/", createTemplateController);
router.patch("/:templateId", updateTemplateController);
router.delete("/:templateId", deleteTemplateController);
router.patch("/:templateId/toggle-status", toggleTemplateStatusController);

export default router;
