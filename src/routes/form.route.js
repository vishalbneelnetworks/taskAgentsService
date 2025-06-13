import { Router } from "express";
import {
  createForm,
  getFormById,
  getForms,
  submitForm,
  updateForm,
  messageEmitter,
} from "../controllers/form.controller.js";

const router = Router();

router.get("/projects", getForms); // listing all projects submission to customer or admin or salesperson

router.post("/project/message", messageEmitter); // emit a message to the form submission queue

router.get("/project/:formId", getFormById); // get form from id, useful for opening a single form.

router.post("/project/create", createForm); // submitting a single form(actully its creating form and saving them)

router.post("/project/submit/:formId", submitForm); // submit a form...

router.patch("/project/update/:formId", updateForm); // update a form

router.post("/project/message", messageEmitter); // emit a message to the form submission queue

export default router;
