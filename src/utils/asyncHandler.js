export const asyncHandler = (func) => async (req, res, next) => {
  try {
    func(req, res, next);
  } catch (error) {
    next(error);
  }
};
