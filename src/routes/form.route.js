import { Router } from "express";
import { submitForm } from "../controllers/form.controller.js";

const router = Router();

router.get("/test", submitForm);

export default router;
