import { asyncHandler } from "../utils/asyncHandler.js";

export const submitForm = asyncHandler(async (req, res) => {
  res.send("ok");
});
